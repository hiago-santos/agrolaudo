import { createHash, randomBytes } from 'node:crypto';

import type { PrismaClient, TipoAssinatura } from '@prisma/client';

import { notificacaoPort } from '../../lib/notificacao.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../lib/errors.js';

import { obterLaudo } from './laudos.service.js';

const VALIDADE_LINK_DIAS = 7;

interface ContextoRequisicao {
  ip?: string;
  userAgent?: string;
}

function gerarHashCurto(...partes: string[]): string {
  return createHash('sha256').update(partes.join('|')).digest('hex').slice(0, 16);
}

function gerarToken(): string {
  return randomBytes(24).toString('hex');
}

function dadosSignatario(laudo: Awaited<ReturnType<typeof obterLaudo>>, tipo: TipoAssinatura) {
  return tipo === 'AGRONOMO'
    ? { nomeSignatario: laudo.agronomo.nome, documento: laudo.agronomo.crea }
    : { nomeSignatario: laudo.produtor.nome, documento: laudo.produtor.cpfCnpj };
}

/** Se as duas partes já assinaram, fecha o laudo e grava o hash do documento final. */
async function finalizarSeCompleto(prisma: PrismaClient, laudoId: string): Promise<void> {
  const assinaturas = await prisma.assinatura.findMany({ where: { laudoId } });
  const agronomoAssinado = assinaturas.some((a) => a.tipo === 'AGRONOMO' && a.assinadoEm);
  const produtorAssinado = assinaturas.some((a) => a.tipo === 'PRODUTOR' && a.assinadoEm);

  if (agronomoAssinado && produtorAssinado) {
    await prisma.laudo.update({
      where: { id: laudoId },
      data: {
        status: 'ASSINADO',
        hashDocumento: gerarHashCurto(laudoId, 'DOCUMENTO', new Date().toISOString()),
      },
    });
  } else {
    await prisma.laudo.updateMany({
      where: { id: laudoId, status: 'RASCUNHO' },
      data: { status: 'AGUARDANDO_ASSINATURA' },
    });
  }
}

/** Assinatura coletada direto na tela (touch/mouse) — agrônomo e produtor lado a lado. */
export async function coletarAssinatura(
  prisma: PrismaClient,
  laudoId: string,
  tipo: TipoAssinatura,
  imagemBase64: string,
  contexto: ContextoRequisicao,
) {
  const laudo = await obterLaudo(prisma, laudoId);
  if (laudo.status === 'CANCELADO') {
    throw new ConflictError('Este laudo foi cancelado e não pode mais ser assinado.');
  }

  const existente = await prisma.assinatura.findFirst({ where: { laudoId, tipo } });
  const { nomeSignatario, documento } = dadosSignatario(laudo, tipo);
  const hash = gerarHashCurto(laudoId, tipo, new Date().toISOString());

  const dados = {
    nomeSignatario,
    documento,
    imagemBase64,
    hash,
    assinadoEm: new Date(),
    ip: contexto.ip,
    userAgent: contexto.userAgent,
  };

  const assinatura = existente
    ? await prisma.assinatura.update({ where: { id: existente.id }, data: dados })
    : await prisma.assinatura.create({ data: { laudoId, tipo, ...dados } });

  await finalizarSeCompleto(prisma, laudoId);
  return assinatura;
}

/** Gera (ou renova) o link de assinatura remota e "envia" via NotificacaoPort. */
export async function gerarLinkAssinatura(
  prisma: PrismaClient,
  laudoId: string,
  tipo: TipoAssinatura,
  publicAppUrl: string,
) {
  const laudo = await obterLaudo(prisma, laudoId);
  if (laudo.status === 'CANCELADO') {
    throw new ConflictError('Este laudo foi cancelado e não pode mais ser assinado.');
  }

  const existente = await prisma.assinatura.findFirst({ where: { laudoId, tipo } });
  const { nomeSignatario, documento } = dadosSignatario(laudo, tipo);
  const token = gerarToken();
  const tokenExpiraEm = new Date(Date.now() + VALIDADE_LINK_DIAS * 24 * 60 * 60 * 1000);

  const assinatura = existente
    ? await prisma.assinatura.update({ where: { id: existente.id }, data: { token, tokenExpiraEm } })
    : await prisma.assinatura.create({
        data: { laudoId, tipo, nomeSignatario, documento, token, tokenExpiraEm },
      });

  await prisma.laudo.updateMany({
    where: { id: laudoId, status: 'RASCUNHO' },
    data: { status: 'AGUARDANDO_ASSINATURA' },
  });

  const link = `${publicAppUrl}/assinar/${laudoId}?token=${token}`;
  await notificacaoPort.enviarLinkAssinatura({ nomeSignatario, laudoNumero: laudo.numero, link });

  return { link, token, assinatura };
}

async function localizarAssinaturaPorToken(prisma: PrismaClient, laudoId: string, token: string) {
  const assinatura = await prisma.assinatura.findFirst({ where: { laudoId, token } });
  if (!assinatura) {
    throw new UnauthorizedError('Link de assinatura inválido.');
  }
  if (assinatura.tokenExpiraEm && assinatura.tokenExpiraEm < new Date()) {
    throw new UnauthorizedError('Este link de assinatura expirou. Peça para o agrônomo gerar um novo.');
  }
  return assinatura;
}

/** GET /publico/laudos/:id?token= — visualização sem login para o signatário conferir e assinar. */
export async function obterParaAssinaturaPublica(prisma: PrismaClient, laudoId: string, token: string) {
  const assinatura = await localizarAssinaturaPorToken(prisma, laudoId, token);
  const laudo = await obterLaudo(prisma, laudoId);
  return { laudo, tipo: assinatura.tipo, jaAssinado: !!assinatura.assinadoEm };
}

/** POST /publico/laudos/:id/assinar — mesma coleta de assinatura, mas autenticada pelo token. */
export async function assinarPublico(
  prisma: PrismaClient,
  laudoId: string,
  token: string,
  imagemBase64: string,
  contexto: ContextoRequisicao,
) {
  const assinatura = await localizarAssinaturaPorToken(prisma, laudoId, token);
  return coletarAssinatura(prisma, laudoId, assinatura.tipo, imagemBase64, contexto);
}

/** GET /publico/verificar/:hash — destino do QR Code impresso no laudo. */
export async function verificarPorHash(prisma: PrismaClient, hash: string) {
  const laudo = await prisma.laudo.findFirst({
    where: { hashDocumento: hash },
    include: { produtor: true, propriedade: true, agronomo: true, safra: true, assinaturas: true },
  });
  if (!laudo) throw new NotFoundError('Documento');

  return {
    valido: true,
    numero: laudo.numero,
    status: laudo.status,
    produtor: laudo.produtor.nome,
    propriedade: laudo.propriedade.nome,
    safra: laudo.safra.rotulo,
    agronomo: { nome: laudo.agronomo.nome, crea: laudo.agronomo.crea },
    dataEmissao: laudo.dataEmissao,
    assinaturas: laudo.assinaturas.map((a) => ({
      tipo: a.tipo,
      nomeSignatario: a.nomeSignatario,
      assinadoEm: a.assinadoEm,
    })),
  };
}
