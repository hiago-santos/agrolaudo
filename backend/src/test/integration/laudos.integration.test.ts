import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../../app.js';
import { loadEnv } from '../../env.js';

interface AtividadeDto {
  id: string;
  slug: string;
  unidadePadrao: string;
}
interface ProdutorDto {
  id: string;
  propriedades: Array<{ id: string }>;
}
interface MatrizItemDto {
  atividade: AtividadeDto;
  cotacaoAtual: { unidade: string; precoUnitario: string; custoPorHa: string } | null;
}

function primeiroCookie(setCookie: string | string[] | undefined): string {
  return Array.isArray(setCookie) ? (setCookie[0] ?? '') : (setCookie ?? '');
}

/**
 * Bate na API de verdade (Fastify `inject`, sem porta de rede) contra o Postgres
 * já migrado e seedado — roda com `pnpm test:integration`. Cobre o que os testes
 * unitários do core não alcançam: HTTP → Zod → service → Prisma → resposta.
 */
describe('Integração — fluxo de laudo (precisa do banco seedado)', () => {
  let app: FastifyInstance;
  let cookieAgronomo: string;
  let atividades: AtividadeDto[];

  beforeAll(async () => {
    const env = loadEnv();
    app = buildApp(env);
    await app.ready();

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'pedro.agronomo@agrolaudo.local', senha: 'agronomo123' },
    });
    if (loginRes.statusCode !== 200) {
      throw new Error(
        'Login de teste falhou — rode `pnpm db:seed` antes de `pnpm test:integration` (precisa do usuário agrônomo do seed).',
      );
    }
    cookieAgronomo = primeiroCookie(loginRes.headers['set-cookie']);

    const atividadesRes = await app.inject({ method: 'GET', url: '/atividades', headers: { cookie: cookieAgronomo } });
    atividades = atividadesRes.json() as AtividadeDto[];
  });

  afterAll(async () => {
    await app.close();
  });

  function idPorSlug(slug: string): string {
    const atividade = atividades.find((a) => a.slug === slug);
    if (!atividade) throw new Error(`Atividade "${slug}" não encontrada — rode o seed.`);
    return atividade.id;
  }

  it('POST /laudos/calcular reproduz o Teste nº 001 (Cana + Soja + Pecuária) via HTTP', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/laudos/calcular',
      headers: { cookie: cookieAgronomo },
      payload: {
        itens: [
          {
            atividadeId: idPorSlug('cana-de-acucar'),
            areaHa: 900,
            produtividade: 100,
            precoUnitario: 152,
            custoPorHa: 9000,
          },
          {
            atividadeId: idPorSlug('soja'),
            areaHa: 500,
            produtividade: 70,
            precoUnitario: 131,
            custoPorHa: 5461.94,
          },
          {
            atividadeId: idPorSlug('pecuaria-cria-recria-engorda'),
            areaHa: 300,
            produtividade: 15,
            precoUnitario: 240,
            custoPorHa: 2000,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { consolidado: Record<string, string> };
    expect(body.consolidado.totalFaturamento).toBe('19345000.00');
    expect(body.consolidado.totalCusto).toBe('11430970.00');
    expect(body.consolidado.totalReceita).toBe('7914030.00');
    expect(body.consolidado.margemPercentual).toBe('40.91');
  });

  it('rejeita requisição sem sessão com 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/laudos' });
    expect(res.statusCode).toBe(401);
  });

  it('bloqueia escrita do perfil BANCO (somente leitura) com 403', async () => {
    const loginBanco = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'banco@agrolaudo.local', senha: 'banco123' },
    });
    const cookieBanco = primeiroCookie(loginBanco.headers['set-cookie']);

    const escrita = await app.inject({
      method: 'POST',
      url: '/produtores',
      headers: { cookie: cookieBanco },
      payload: { nome: 'Teste Bloqueado', cpfCnpj: '00000000000', municipio: 'X', uf: 'SP' },
    });
    expect(escrita.statusCode).toBe(403);

    const leitura = await app.inject({ method: 'GET', url: '/laudos', headers: { cookie: cookieBanco } });
    expect(leitura.statusCode).toBe(200);
  });

  it('snapshot do LaudoItem não muda quando a cotação é atualizada depois de emitido', async () => {
    const produtoresRes = await app.inject({
      method: 'GET',
      url: '/produtores?busca=Marcio',
      headers: { cookie: cookieAgronomo },
    });
    const produtor = (produtoresRes.json() as { items: ProdutorDto[] }).items[0];
    const safras = (await app.inject({ method: 'GET', url: '/safras', headers: { cookie: cookieAgronomo } })).json() as Array<{
      id: string;
    }>;
    const agronomos = (
      await app.inject({ method: 'GET', url: '/agronomos', headers: { cookie: cookieAgronomo } })
    ).json() as Array<{ id: string }>;
    if (!produtor || !safras[0] || !agronomos[0]) {
      throw new Error('Seed incompleto — produtor/safra/agrônomo de demo não encontrados.');
    }

    const sojaId = idPorSlug('soja');
    const matrizAntes = (
      await app.inject({ method: 'GET', url: '/cotacoes', headers: { cookie: cookieAgronomo } })
    ).json() as MatrizItemDto[];
    const cotacaoOriginal = matrizAntes.find((i) => i.atividade.slug === 'soja')?.cotacaoAtual;

    const criado = await app.inject({
      method: 'POST',
      url: '/laudos',
      headers: { cookie: cookieAgronomo },
      payload: {
        produtorId: produtor.id,
        propriedadeId: produtor.propriedades[0]?.id,
        safraId: safras[0].id,
        agronomoId: agronomos[0].id,
        itens: [{ atividadeId: sojaId, areaHa: 10, produtividade: 60, precoUnitario: 100, custoPorHa: 1000 }],
      },
    });
    expect(criado.statusCode).toBe(201);
    const laudoCriado = criado.json() as { id: string; itens: Array<{ precoUnitario: string }> };
    const precoNoMomentoDaEmissao = laudoCriado.itens[0]?.precoUnitario;

    try {
      // Preço muda DEPOIS de o laudo já ter sido emitido.
      const atualizarRes = await app.inject({
        method: 'PUT',
        url: '/cotacoes',
        headers: { cookie: cookieAgronomo },
        payload: { itens: [{ atividadeId: sojaId, unidade: 'SACA_60KG', precoUnitario: 999, custoPorHa: 999 }] },
      });
      expect(atualizarRes.statusCode).toBe(200);

      const reaberto = await app.inject({
        method: 'GET',
        url: `/laudos/${laudoCriado.id}`,
        headers: { cookie: cookieAgronomo },
      });
      const laudoReaberto = reaberto.json() as { itens: Array<{ precoUnitario: string }> };

      expect(laudoReaberto.itens[0]?.precoUnitario).toBe(precoNoMomentoDaEmissao);
      expect(laudoReaberto.itens[0]?.precoUnitario).not.toBe('999.0000');
    } finally {
      // limpeza: cancela o laudo de teste e restaura a cotação original da soja,
      // pra não deixar a matriz de demo com um preço de teste (999).
      await app.inject({
        method: 'POST',
        url: `/laudos/${laudoCriado.id}/cancelar`,
        headers: { cookie: cookieAgronomo },
      });
      if (cotacaoOriginal) {
        await app.inject({
          method: 'PUT',
          url: '/cotacoes',
          headers: { cookie: cookieAgronomo },
          payload: {
            itens: [
              {
                atividadeId: sojaId,
                unidade: cotacaoOriginal.unidade,
                precoUnitario: Number(cotacaoOriginal.precoUnitario),
                custoPorHa: Number(cotacaoOriginal.custoPorHa),
              },
            ],
          },
        });
      }
    }
  });
});
