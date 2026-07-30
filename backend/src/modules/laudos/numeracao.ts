import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * "LAUDO-{ano}-{sequencial}". O `upsert` com `increment` compila para um
 * `INSERT ... ON CONFLICT (ano) DO UPDATE SET "ultimoNumero" = "ultimoNumero" + 1`
 * no Postgres — atômico por linha, o que evita dois agrônomos emitindo o mesmo
 * número simultaneamente (o requisito de 100 laudos/mês torna isso plausível).
 */
export async function proximoNumeroLaudo(
  tx: Prisma.TransactionClient | PrismaClient,
  ano: number,
): Promise<string> {
  const sequencia = await tx.laudoSequencia.upsert({
    where: { ano },
    create: { ano, ultimoNumero: 1 },
    update: { ultimoNumero: { increment: 1 } },
  });
  return `LAUDO-${ano}-${String(sequencia.ultimoNumero).padStart(4, '0')}`;
}
