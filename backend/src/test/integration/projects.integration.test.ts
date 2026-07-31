import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../../app.js';
import { loadEnv } from '../../env.js';

interface ActivityDto {
  id: string;
  slug: string;
  defaultUnit: string;
}
interface ProducerDto {
  id: string;
  properties: Array<{ id: string }>;
}
interface PriceMatrixItemDto {
  activity: ActivityDto;
  currentQuote: { unit: string; unitPrice: string; costPerHectare: string } | null;
}

async function login(app: FastifyInstance, email: string, password: string): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
  if (res.statusCode !== 200) {
    throw new Error(
      `Login de teste falhou para ${email} — rode \`pnpm db:seed\` antes de \`pnpm test:integration\`.`,
    );
  }
  return (res.json() as { token: string }).token;
}

function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}

/**
 * Bate na API de verdade (Fastify `inject`, sem porta de rede) contra o Postgres
 * já migrado e seedado — roda com `pnpm test:integration`. Cobre o que os testes
 * unitários do core não alcançam: HTTP → Zod → service → Prisma → resposta.
 */
describe('Integração — fluxo de projeto (precisa do banco seedado)', () => {
  let app: FastifyInstance;
  let agronomistToken: string;
  let activities: ActivityDto[];

  beforeAll(async () => {
    const env = loadEnv();
    app = buildApp(env);
    await app.ready();

    agronomistToken = await login(app, 'pedro.agronomist@agrolaudo.local', 'agronomist123');

    const activitiesRes = await app.inject({
      method: 'GET',
      url: '/activities',
      headers: bearer(agronomistToken),
    });
    activities = activitiesRes.json() as ActivityDto[];
  });

  afterAll(async () => {
    await app.close();
  });

  function idBySlug(slug: string): string {
    const activity = activities.find((a) => a.slug === slug);
    if (!activity) throw new Error(`Atividade "${slug}" não encontrada — rode o seed.`);
    return activity.id;
  }

  it('POST /projects/calculate reproduz o Teste nº 001 (Cana + Soja + Pecuária) via HTTP', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/projects/calculate',
      headers: bearer(agronomistToken),
      payload: {
        items: [
          { activityId: idBySlug('sugarcane'), areaHectares: 900, productivity: 100, unitPrice: 152, costPerHectare: 9000 },
          { activityId: idBySlug('soybean'), areaHectares: 500, productivity: 70, unitPrice: 131, costPerHectare: 5461.94 },
          {
            activityId: idBySlug('cattle-raising'),
            areaHectares: 300,
            productivity: 15,
            unitPrice: 240,
            costPerHectare: 2000,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { consolidated: Record<string, string> };
    expect(body.consolidated.totalRevenue).toBe('19345000.00');
    expect(body.consolidated.totalCost).toBe('11430970.00');
    expect(body.consolidated.totalProfit).toBe('7914030.00');
    expect(body.consolidated.profitMarginPercentage).toBe('40.91');
  });

  it('rejeita requisição sem token com 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/projects' });
    expect(res.statusCode).toBe(401);
  });

  it('bloqueia escrita do perfil BANK (leitura + decisão pontual) com 403', async () => {
    const bankToken = await login(app, 'bank@agrolaudo.local', 'bank123');

    const write = await app.inject({
      method: 'POST',
      url: '/producers',
      headers: bearer(bankToken),
      payload: { name: 'Teste Bloqueado', taxId: '00000000000', city: 'X', state: 'SP' },
    });
    expect(write.statusCode).toBe(403);

    const read = await app.inject({ method: 'GET', url: '/projects', headers: bearer(bankToken) });
    expect(read.statusCode).toBe(200);
  });

  it('snapshot do ProjectItem não muda quando a cotação é atualizada depois de emitido', async () => {
    const producersRes = await app.inject({
      method: 'GET',
      url: '/producers?search=Marcio',
      headers: bearer(agronomistToken),
    });
    const producer = (producersRes.json() as { items: ProducerDto[] }).items[0];
    const seasons = (
      await app.inject({ method: 'GET', url: '/seasons', headers: bearer(agronomistToken) })
    ).json() as Array<{ id: string }>;
    const agronomists = (
      await app.inject({ method: 'GET', url: '/agronomists', headers: bearer(agronomistToken) })
    ).json() as Array<{ id: string }>;
    if (!producer || !seasons[0] || !agronomists[0]) {
      throw new Error('Seed incompleto — produtor/safra/agrônomo de demo não encontrados.');
    }

    const soybeanId = idBySlug('soybean');
    const matrixBefore = (
      await app.inject({ method: 'GET', url: '/price-quotes', headers: bearer(agronomistToken) })
    ).json() as PriceMatrixItemDto[];
    const originalQuote = matrixBefore.find((i) => i.activity.slug === 'soybean')?.currentQuote;

    const created = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: bearer(agronomistToken),
      payload: {
        producerId: producer.id,
        propertyId: producer.properties[0]?.id,
        seasonId: seasons[0].id,
        agronomistId: agronomists[0].id,
        items: [{ activityId: soybeanId, areaHectares: 10, productivity: 60, unitPrice: 100, costPerHectare: 1000 }],
      },
    });
    expect(created.statusCode).toBe(201);
    const createdProject = created.json() as { id: string; items: Array<{ unitPrice: string }> };
    const priceAtIssueTime = createdProject.items[0]?.unitPrice;

    try {
      // Preço muda DEPOIS de o projeto já ter sido emitido.
      const updateRes = await app.inject({
        method: 'PUT',
        url: '/price-quotes',
        headers: bearer(agronomistToken),
        payload: { items: [{ activityId: soybeanId, unit: 'BAG_60KG', unitPrice: 999, costPerHectare: 999 }] },
      });
      expect(updateRes.statusCode).toBe(200);

      const reopened = await app.inject({
        method: 'GET',
        url: `/projects/${createdProject.id}`,
        headers: bearer(agronomistToken),
      });
      const reopenedProject = reopened.json() as { items: Array<{ unitPrice: string }> };

      expect(reopenedProject.items[0]?.unitPrice).toBe(priceAtIssueTime);
      expect(reopenedProject.items[0]?.unitPrice).not.toBe('999.0000');
    } finally {
      // limpeza: cancela o projeto de teste e restaura a cotação original da soja,
      // pra não deixar a matriz de demo com um preço de teste (999).
      await app.inject({
        method: 'POST',
        url: `/projects/${createdProject.id}/cancel`,
        headers: bearer(agronomistToken),
      });
      if (originalQuote) {
        await app.inject({
          method: 'PUT',
          url: '/price-quotes',
          headers: bearer(agronomistToken),
          payload: {
            items: [
              {
                activityId: soybeanId,
                unit: originalQuote.unit,
                unitPrice: Number(originalQuote.unitPrice),
                costPerHectare: Number(originalQuote.costPerHectare),
              },
            ],
          },
        });
      }
    }
  });
});
