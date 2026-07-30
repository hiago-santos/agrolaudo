import type { PrismaClient } from '@prisma/client';

export async function resumoDashboard(prisma: PrismaClient) {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [laudosNoMes, aguardandoAssinatura, produtoresAtivos, ultimosLaudos, agregados] =
    await Promise.all([
      prisma.laudo.count({ where: { createdAt: { gte: inicioMes } } }),
      prisma.laudo.count({ where: { status: 'AGUARDANDO_ASSINATURA' } }),
      prisma.produtor.count(),
      prisma.laudo.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          produtor: { select: { nome: true } },
          propriedade: { select: { nome: true } },
        },
      }),
      prisma.laudo.aggregate({
        where: { status: { not: 'CANCELADO' }, createdAt: { gte: inicioMes } },
        _sum: { totalFaturamento: true, totalReceita: true },
      }),
    ]);

  return {
    laudosNoMes,
    aguardandoAssinatura,
    produtoresAtivos,
    faturamentoNoMes: agregados._sum.totalFaturamento ?? 0,
    receitaNoMes: agregados._sum.totalReceita ?? 0,
    ultimosLaudos,
  };
}
