import type { PrismaClient } from '@prisma/client';

export async function getDashboardSummary(prisma: PrismaClient) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    projectsThisMonth,
    pendingSignaturesCount,
    underBankReviewCount,
    activeProducersCount,
    recentProjects,
    aggregates,
  ] = await Promise.all([
    prisma.project.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.project.count({ where: { status: 'PENDING_SIGNATURES' } }),
    prisma.project.count({ where: { status: 'UNDER_BANK_REVIEW' } }),
    prisma.producer.count(),
    prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        producer: { select: { name: true } },
        property: { select: { name: true } },
      },
    }),
    prisma.project.aggregate({
      where: { status: { not: 'CANCELLED' }, createdAt: { gte: startOfMonth } },
      _sum: { totalRevenue: true, totalProfit: true },
    }),
  ]);

  return {
    projectsThisMonth,
    pendingSignaturesCount,
    underBankReviewCount,
    activeProducersCount,
    revenueThisMonth: aggregates._sum.totalRevenue ?? 0,
    profitThisMonth: aggregates._sum.totalProfit ?? 0,
    recentProjects,
  };
}
