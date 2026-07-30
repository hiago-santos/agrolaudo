import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { ATIVIDADES, getAtividadePorSlug } from '../src/core/atividades.js';
import { calcularItem, consolidar } from '../src/core/calculadora.js';

const prisma = new PrismaClient();

/**
 * Preços/custos de referência iniciais para a Matriz de Preços & Custos. São valores
 * ilustrativos de partida — a ideia do módulo é justamente o agrônomo manter isso
 * atualizado semanalmente. Cana, Soja e Pecuária usam os valores reais validados no
 * "Teste nº 001" da conversa com o cliente; as demais 12 atividades usam estimativas
 * de mercado plausíveis, claramente um ponto de partida, não uma cotação real.
 */
const COTACOES_INICIAIS: Record<string, { precoUnitario: number; custoPorHa: number }> = {
  amendoim: { precoUnitario: 130.0, custoPorHa: 3800.0 },
  milho: { precoUnitario: 65.0, custoPorHa: 4200.0 },
  soja: { precoUnitario: 131.0, custoPorHa: 5461.94 },
  cafe: { precoUnitario: 1200.0, custoPorHa: 15000.0 },
  laranja: { precoUnitario: 22.0, custoPorHa: 9000.0 },
  limao: { precoUnitario: 18.0, custoPorHa: 7000.0 },
  tangerina: { precoUnitario: 25.0, custoPorHa: 8000.0 },
  banana: { precoUnitario: 20.0, custoPorHa: 12000.0 },
  abacate: { precoUnitario: 3500.0, custoPorHa: 11000.0 },
  'cana-de-acucar': { precoUnitario: 152.0, custoPorHa: 9000.0 },
  cebola: { precoUnitario: 45.0, custoPorHa: 9500.0 },
  mandioca: { precoUnitario: 550.0, custoPorHa: 5000.0 },
  eucalipto: { precoUnitario: 90.0, custoPorHa: 6000.0 },
  pasto: { precoUnitario: 0, custoPorHa: 400.0 },
  'pecuaria-cria-recria-engorda': { precoUnitario: 240.0, custoPorHa: 2000.0 },
};

async function seedAtividadesECotacoes() {
  for (const config of ATIVIDADES) {
    const atividade = await prisma.atividade.upsert({
      where: { slug: config.slug },
      update: {
        nome: config.nome,
        categoria: config.categoria,
        unidadePadrao: config.unidadePadrao,
        unidadesPermitidas: config.unidadesPermitidas,
        pecuaria: config.pecuaria,
        ordem: config.ordem,
      },
      create: {
        slug: config.slug,
        nome: config.nome,
        categoria: config.categoria,
        unidadePadrao: config.unidadePadrao,
        unidadesPermitidas: config.unidadesPermitidas,
        pecuaria: config.pecuaria,
        ordem: config.ordem,
      },
    });

    const jaTemCotacao = await prisma.cotacaoRef.findFirst({ where: { atividadeId: atividade.id } });
    if (jaTemCotacao) continue;

    const referencia = COTACOES_INICIAIS[config.slug];
    if (!referencia) continue;

    await prisma.cotacaoRef.create({
      data: {
        atividadeId: atividade.id,
        unidade: config.unidadePadrao,
        precoUnitario: referencia.precoUnitario,
        custoPorHa: referencia.custoPorHa,
      },
    });
  }

  console.log(`✓ ${ATIVIDADES.length} atividades + cotações iniciais`);
}

async function seedUsuariosEAgronomo() {
  const senhaAdmin = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@agrolaudo.local' },
    update: {},
    create: {
      nome: 'Administrador AgroLaudo',
      email: 'admin@agrolaudo.local',
      senhaHash: senhaAdmin,
      role: 'ADMIN',
    },
  });

  const senhaBanco = await bcrypt.hash('banco123', 10);
  await prisma.user.upsert({
    where: { email: 'banco@agrolaudo.local' },
    update: {},
    create: {
      nome: 'Analista de Crédito (demo)',
      email: 'banco@agrolaudo.local',
      senhaHash: senhaBanco,
      role: 'BANCO',
    },
  });

  const senhaAgronomo = await bcrypt.hash('agronomo123', 10);
  const userAgronomo = await prisma.user.upsert({
    where: { email: 'pedro.agronomo@agrolaudo.local' },
    update: {},
    create: {
      nome: 'Pedro Henrique dos Santos',
      email: 'pedro.agronomo@agrolaudo.local',
      senhaHash: senhaAgronomo,
      role: 'AGRONOMO',
    },
  });

  const agronomo = await prisma.agronomo.upsert({
    where: { cpf: '000.000.000-00' },
    update: {},
    create: {
      userId: userAgronomo.id,
      nome: 'Pedro Henrique dos Santos',
      cpf: '000.000.000-00',
      crea: 'CREA 5063910430',
      cidadeEmissao: 'Franca',
      regiao: 'Franca/SP e região',
    },
  });

  console.log('✓ usuários (admin/agrônomo/banco) + perfil do Eng. Agrônomo Pedro Henrique');
  return agronomo;
}

async function seedSafra() {
  const safra = await prisma.safra.upsert({
    where: { rotulo: '2025/2026' },
    update: {},
    create: {
      rotulo: '2025/2026',
      inicio: new Date('2025-09-01T00:00:00Z'),
      fim: new Date('2026-08-31T00:00:00Z'),
      ativa: true,
    },
  });
  console.log('✓ safra 2025/2026');
  return safra;
}

async function seedCasoMarcio(agronomoId: string, safraId: string) {
  const produtor = await prisma.produtor.upsert({
    where: { cpfCnpj: '098.736.418-90' },
    update: {},
    create: {
      nome: 'MARCIO MENEZES RIBEIRO',
      cpfCnpj: '098.736.418-90',
      municipio: 'Ituverava',
      uf: 'SP',
      classificacao: 'DEMAIS',
    },
  });

  const propriedade = await prisma.propriedade.upsert({
    where: { produtorId_matricula: { produtorId: produtor.id, matricula: '20629' } },
    update: {},
    create: {
      produtorId: produtor.id,
      nome: 'FAZENDA SANTA TEREZINHA',
      matricula: '20629',
      municipio: 'Ituverava',
      uf: 'SP',
      // Soma das áreas das 3 atividades do laudo original (900 + 500 + 300ha) —
      // aproximação de demo; o valor real da matrícula deve ser ajustado no cadastro.
      areaTotalHa: 1700,
    },
  });

  const numero = 'LAUDO-2026-0001';

  // Seed idempotente: remove o laudo demo anterior (e seus itens/assinaturas, via
  // cascade) antes de recriar, para não duplicar a cada `pnpm db:seed`.
  await prisma.laudo.deleteMany({ where: { numero } });

  await prisma.laudoSequencia.upsert({
    where: { ano: 2026 },
    update: { ultimoNumero: 1 },
    create: { ano: 2026, ultimoNumero: 1 },
  });

  // Os 3 itens do "Teste nº 001" validado com o cliente — calculados pelo MESMO
  // motor (core.calcularItem) que roda em produção, não digitados na mão. O catálogo
  // estático (core/atividades.ts) dá nome/unidade; o `id` de verdade vem do banco.
  const slugsDoLaudo = ['cana-de-acucar', 'soja', 'pecuaria-cria-recria-engorda'] as const;
  const atividadesDb = await prisma.atividade.findMany({
    where: { slug: { in: [...slugsDoLaudo] } },
  });
  const atividadeDbPorSlug = new Map(atividadesDb.map((a) => [a.slug, a]));

  function atividadeDb(slug: (typeof slugsDoLaudo)[number]) {
    const registro = atividadeDbPorSlug.get(slug);
    if (!registro) throw new Error(`Atividade "${slug}" não encontrada no banco — rode o seed novamente.`);
    return registro;
  }

  function atividadeConfig(slug: (typeof slugsDoLaudo)[number]) {
    const config = getAtividadePorSlug(slug);
    if (!config) throw new Error(`Atividade "${slug}" não encontrada no catálogo core/atividades.ts.`);
    return config;
  }

  const itensCalculados = [
    {
      config: atividadeConfig('cana-de-acucar'),
      db: atividadeDb('cana-de-acucar'),
      input: { areaHa: 900, produtividade: 100, precoUnitario: 152.0, custoPorHa: 9000.0 },
    },
    {
      config: atividadeConfig('soja'),
      db: atividadeDb('soja'),
      input: { areaHa: 500, produtividade: 70, precoUnitario: 131.0, custoPorHa: 5461.94 },
    },
    {
      config: atividadeConfig('pecuaria-cria-recria-engorda'),
      db: atividadeDb('pecuaria-cria-recria-engorda'),
      input: { areaHa: 300, produtividade: 15, precoUnitario: 240.0, custoPorHa: 2000.0 },
    },
  ].map(({ config, db, input }) => ({ config, db, resultado: calcularItem(input), input }));

  const consolidado = consolidar(itensCalculados.map((i) => i.resultado));

  const laudo = await prisma.laudo.create({
    data: {
      numero,
      produtorId: produtor.id,
      propriedadeId: propriedade.id,
      safraId,
      agronomoId,
      status: 'ASSINADO',
      cidadeEmissao: 'Franca',
      dataEmissao: new Date('2026-01-20T15:40:00Z'),
      totalFaturamento: consolidado.totalFaturamento,
      totalCusto: consolidado.totalCusto,
      totalReceita: consolidado.totalReceita,
      margemPercentual: consolidado.margemPercentual,
      itens: {
        create: itensCalculados.map(({ config, db, resultado, input }, ordem) => ({
          atividadeId: db.id,
          atividadeNome: config.nome,
          unidade: config.unidadePadrao,
          areaHa: input.areaHa,
          produtividade: input.produtividade,
          precoUnitario: input.precoUnitario,
          custoPorHa: input.custoPorHa,
          producaoTotal: resultado.producaoTotal,
          faturamentoBruto: resultado.faturamentoBruto,
          custoTotal: resultado.custoTotal,
          receitaLiquida: resultado.receitaLiquida,
          ordem,
        })),
      },
      assinaturas: {
        create: [
          {
            tipo: 'AGRONOMO',
            nomeSignatario: 'Pedro Henrique dos Santos',
            documento: 'CREA 5063910430',
            hash: 'abdf9ddb23b9804a',
            assinadoEm: new Date('2026-01-20T15:41:00Z'),
          },
          {
            tipo: 'PRODUTOR',
            nomeSignatario: 'MARCIO MENEZES RIBEIRO',
            documento: '098.736.418-90',
            hash: '1fdad57cdff8773b',
            assinadoEm: new Date('2026-01-20T15:41:48Z'),
          },
        ],
      },
    },
  });

  console.log(
    `✓ laudo demo ${laudo.numero} — Faturamento R$ ${consolidado.totalFaturamento} · ` +
      `Receita R$ ${consolidado.totalReceita} · Margem ${consolidado.margemPercentual}%`,
  );
}

async function main() {
  console.log('Seed AgroLaudo — iniciando...\n');
  await seedAtividadesECotacoes();
  const agronomo = await seedUsuariosEAgronomo();
  const safra = await seedSafra();
  await seedCasoMarcio(agronomo.id, safra.id);
  console.log('\nSeed concluído. Logins de demo (dev only):');
  console.log('  admin@agrolaudo.local / admin123');
  console.log('  pedro.agronomo@agrolaudo.local / agronomo123');
  console.log('  banco@agrolaudo.local / banco123');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
