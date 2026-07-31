import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { ACTIVITIES, getActivityBySlug } from '../src/core/activities.js';
import { calculateItem, consolidate } from '../src/core/calculator.js';

const prisma = new PrismaClient();

/**
 * Preços/custos de referência iniciais para a Matriz de Preços & Custos. São valores
 * ilustrativos de partida — a ideia do módulo é justamente o agrônomo manter isso
 * atualizado semanalmente. Cana, Soja e Pecuária usam os valores reais validados no
 * "Teste nº 001" da conversa com o cliente; as demais 12 atividades usam estimativas
 * de mercado plausíveis, claramente um ponto de partida, não uma cotação real.
 */
const INITIAL_QUOTES: Record<string, { unitPrice: number; costPerHectare: number }> = {
  peanut: { unitPrice: 130.0, costPerHectare: 3800.0 },
  corn: { unitPrice: 65.0, costPerHectare: 4200.0 },
  soybean: { unitPrice: 131.0, costPerHectare: 5461.94 },
  coffee: { unitPrice: 1200.0, costPerHectare: 15000.0 },
  orange: { unitPrice: 22.0, costPerHectare: 9000.0 },
  lemon: { unitPrice: 18.0, costPerHectare: 7000.0 },
  tangerine: { unitPrice: 25.0, costPerHectare: 8000.0 },
  banana: { unitPrice: 20.0, costPerHectare: 12000.0 },
  avocado: { unitPrice: 3500.0, costPerHectare: 11000.0 },
  sugarcane: { unitPrice: 152.0, costPerHectare: 9000.0 },
  onion: { unitPrice: 45.0, costPerHectare: 9500.0 },
  cassava: { unitPrice: 550.0, costPerHectare: 5000.0 },
  eucalyptus: { unitPrice: 90.0, costPerHectare: 6000.0 },
  pasture: { unitPrice: 0, costPerHectare: 400.0 },
  'cattle-raising': { unitPrice: 240.0, costPerHectare: 2000.0 },
};

async function seedActivitiesAndQuotes() {
  for (const config of ACTIVITIES) {
    const activity = await prisma.activity.upsert({
      where: { slug: config.slug },
      update: {
        name: config.name,
        category: config.category,
        defaultUnit: config.defaultUnit,
        allowedUnits: config.allowedUnits,
        isLivestock: config.isLivestock,
        order: config.order,
      },
      create: {
        slug: config.slug,
        name: config.name,
        category: config.category,
        defaultUnit: config.defaultUnit,
        allowedUnits: config.allowedUnits,
        isLivestock: config.isLivestock,
        order: config.order,
      },
    });

    const hasQuote = await prisma.priceQuote.findFirst({ where: { activityId: activity.id } });
    if (hasQuote) continue;

    const reference = INITIAL_QUOTES[config.slug];
    if (!reference) continue;

    await prisma.priceQuote.create({
      data: {
        activityId: activity.id,
        unit: config.defaultUnit,
        unitPrice: reference.unitPrice,
        costPerHectare: reference.costPerHectare,
      },
    });
  }

  console.log(`✓ ${ACTIVITIES.length} atividades + cotações iniciais`);
}

async function seedUsersAndAgronomist() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@agrolaudo.local' },
    update: {},
    create: {
      name: 'Administrador AgroLaudo',
      email: 'admin@agrolaudo.local',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const bankPassword = await bcrypt.hash('bank123', 10);
  const bankUser = await prisma.user.upsert({
    where: { email: 'bank@agrolaudo.local' },
    update: {},
    create: {
      name: 'Analista de Crédito (demo)',
      email: 'bank@agrolaudo.local',
      passwordHash: bankPassword,
      role: 'BANK',
    },
  });

  const agronomistPassword = await bcrypt.hash('agronomist123', 10);
  const agronomistUser = await prisma.user.upsert({
    where: { email: 'pedro.agronomist@agrolaudo.local' },
    update: {},
    create: {
      name: 'Pedro Henrique dos Santos',
      email: 'pedro.agronomist@agrolaudo.local',
      passwordHash: agronomistPassword,
      role: 'AGRONOMIST',
    },
  });

  const agronomist = await prisma.agronomist.upsert({
    where: { document: '000.000.000-00' },
    update: {},
    create: {
      userId: agronomistUser.id,
      name: 'Pedro Henrique dos Santos',
      document: '000.000.000-00',
      licenseNumber: 'CREA 5063910430',
      issuingCity: 'Franca',
      region: 'Franca/SP e região',
    },
  });

  console.log('✓ usuários (admin/agrônomo/banco) + perfil do Eng. Agrônomo Pedro Henrique');
  return { agronomist, bankUser };
}

async function seedSeason() {
  const season = await prisma.season.upsert({
    where: { label: '2025/2026' },
    update: {},
    create: {
      label: '2025/2026',
      startDate: new Date('2025-09-01T00:00:00Z'),
      endDate: new Date('2026-08-31T00:00:00Z'),
      active: true,
    },
  });
  console.log('✓ safra 2025/2026');
  return season;
}

async function seedMarcioCase(agronomistId: string, seasonId: string, bankUserId: string) {
  const producer = await prisma.producer.upsert({
    where: { taxId: '098.736.418-90' },
    update: {},
    create: {
      name: 'MARCIO MENEZES RIBEIRO',
      taxId: '098.736.418-90',
      city: 'Ituverava',
      state: 'SP',
      classification: 'OTHER',
    },
  });

  const property = await prisma.property.upsert({
    where: { producerId_registrationNumber: { producerId: producer.id, registrationNumber: '20629' } },
    update: {},
    create: {
      producerId: producer.id,
      name: 'FAZENDA SANTA TEREZINHA',
      registrationNumber: '20629',
      city: 'Ituverava',
      state: 'SP',
      // Soma das áreas das 3 atividades do projeto original (900 + 500 + 300ha) —
      // aproximação de demo; o valor real da matrícula deve ser ajustado no cadastro.
      totalAreaHectares: 1700,
    },
  });

  const number = 'PROJECT-2026-0001';

  // Seed idempotente: remove o projeto demo anterior (e seus itens/assinaturas, via
  // cascade) antes de recriar, para não duplicar a cada `pnpm db:seed`.
  await prisma.project.deleteMany({ where: { number } });

  await prisma.projectSequence.upsert({
    where: { year: 2026 },
    update: { lastNumber: 1 },
    create: { year: 2026, lastNumber: 1 },
  });

  // Os 3 itens do "Teste nº 001" validado com o cliente — calculados pelo MESMO
  // motor (core.calculateItem) que roda em produção, não digitados na mão.
  const slugs = ['sugarcane', 'soybean', 'cattle-raising'] as const;
  const activitiesDb = await prisma.activity.findMany({ where: { slug: { in: [...slugs] } } });
  const activityDbBySlug = new Map(activitiesDb.map((a) => [a.slug, a]));

  function activityDb(slug: (typeof slugs)[number]) {
    const record = activityDbBySlug.get(slug);
    if (!record) throw new Error(`Atividade "${slug}" não encontrada no banco — rode o seed novamente.`);
    return record;
  }

  function activityConfig(slug: (typeof slugs)[number]) {
    const config = getActivityBySlug(slug);
    if (!config) throw new Error(`Atividade "${slug}" não encontrada no catálogo core/activities.ts.`);
    return config;
  }

  const calculatedItems = [
    {
      config: activityConfig('sugarcane'),
      db: activityDb('sugarcane'),
      input: { areaHectares: 900, productivity: 100, unitPrice: 152.0, costPerHectare: 9000.0 },
    },
    {
      config: activityConfig('soybean'),
      db: activityDb('soybean'),
      input: { areaHectares: 500, productivity: 70, unitPrice: 131.0, costPerHectare: 5461.94 },
    },
    {
      config: activityConfig('cattle-raising'),
      db: activityDb('cattle-raising'),
      input: { areaHectares: 300, productivity: 15, unitPrice: 240.0, costPerHectare: 2000.0 },
    },
  ].map(({ config, db, input }) => ({ config, db, result: calculateItem(input), input }));

  const consolidated = consolidate(calculatedItems.map((i) => i.result));

  const project = await prisma.project.create({
    data: {
      number,
      producerId: producer.id,
      propertyId: property.id,
      seasonId,
      agronomistId,
      // Demonstra o workflow completo: assinado pelas duas partes e já aprovado
      // pelo banco, com limite de crédito concedido.
      status: 'APPROVED',
      issuingCity: 'Franca',
      issueDate: new Date('2026-01-20T15:40:00Z'),
      totalRevenue: consolidated.totalRevenue,
      totalCost: consolidated.totalCost,
      totalProfit: consolidated.totalProfit,
      profitMarginPercentage: consolidated.profitMarginPercentage,
      approvedCreditLimit: 5000000,
      bankNotes: 'Capacidade de pagamento compatível com o limite solicitado. Aprovado sem ressalvas.',
      bankReviewedById: bankUserId,
      bankReviewedAt: new Date('2026-01-22T10:00:00Z'),
      items: {
        create: calculatedItems.map(({ config, db, result, input }, order) => ({
          activityId: db.id,
          activityName: config.name,
          unit: config.defaultUnit,
          areaHectares: input.areaHectares,
          productivity: input.productivity,
          unitPrice: input.unitPrice,
          costPerHectare: input.costPerHectare,
          totalProduction: result.totalProduction,
          grossRevenue: result.grossRevenue,
          totalCost: result.totalCost,
          netProfit: result.netProfit,
          order,
        })),
      },
      signatures: {
        create: [
          {
            type: 'AGRONOMIST',
            signatoryName: 'Pedro Henrique dos Santos',
            signatoryDocument: 'CREA 5063910430',
            hash: 'abdf9ddb23b9804a',
            signedAt: new Date('2026-01-20T15:41:00Z'),
          },
          {
            type: 'PRODUCER',
            signatoryName: 'MARCIO MENEZES RIBEIRO',
            signatoryDocument: '098.736.418-90',
            hash: '1fdad57cdff8773b',
            signedAt: new Date('2026-01-20T15:41:48Z'),
          },
        ],
      },
    },
  });

  console.log(
    `✓ projeto demo ${project.number} — Faturamento R$ ${consolidated.totalRevenue} · ` +
      `Receita R$ ${consolidated.totalProfit} · Margem ${consolidated.profitMarginPercentage}% · status ${project.status}`,
  );
}

async function main() {
  console.log('Seed AgroLaudo — iniciando...\n');
  await seedActivitiesAndQuotes();
  const { agronomist, bankUser } = await seedUsersAndAgronomist();
  const season = await seedSeason();
  await seedMarcioCase(agronomist.id, season.id, bankUser.id);
  console.log('\nSeed concluído. Logins de demo (dev only):');
  console.log('  admin@agrolaudo.local / admin123');
  console.log('  pedro.agronomist@agrolaudo.local / agronomist123');
  console.log('  bank@agrolaudo.local / bank123');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
