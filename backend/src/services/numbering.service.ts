import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * "PROJECT-{ano}-{sequencial}". O `upsert` com `increment` compila para um
 * `INSERT ... ON CONFLICT (year) DO UPDATE SET "lastNumber" = "lastNumber" + 1`
 * no Postgres — atômico por linha, o que evita dois agrônomos emitindo o mesmo
 * número simultaneamente.
 */
export async function nextProjectNumber(
  tx: Prisma.TransactionClient | PrismaClient,
  year: number,
): Promise<string> {
  const sequence = await tx.projectSequence.upsert({
    where: { year },
    create: { year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return `PROJECT-${year}-${String(sequence.lastNumber).padStart(4, '0')}`;
}
