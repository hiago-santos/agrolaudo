import type { LaudoCompleto } from '../modules/laudos/laudos.service.js';

import type { LaudoDocumentoDados } from './types.js';

/** Converte um laudo já persistido (com relações) para o shape dos documentos. */
export function laudoParaDocumento(laudo: LaudoCompleto): LaudoDocumentoDados {
  return {
    numero: laudo.numero,
    status: laudo.status,
    cidadeEmissao: laudo.cidadeEmissao,
    dataEmissao: laudo.dataEmissao.toISOString(),
    observacoes: laudo.observacoes,
    produtor: {
      nome: laudo.produtor.nome,
      cpfCnpj: laudo.produtor.cpfCnpj,
      municipio: laudo.produtor.municipio,
      uf: laudo.produtor.uf,
    },
    propriedade: {
      nome: laudo.propriedade.nome,
      matricula: laudo.propriedade.matricula,
      municipio: laudo.propriedade.municipio,
      uf: laudo.propriedade.uf,
      areaTotalHa: laudo.propriedade.areaTotalHa.toString(),
    },
    safra: { rotulo: laudo.safra.rotulo },
    agronomo: {
      nome: laudo.agronomo.nome,
      crea: laudo.agronomo.crea,
      cidadeEmissao: laudo.agronomo.cidadeEmissao,
    },
    itens: laudo.itens.map((item) => ({
      atividadeNome: item.atividadeNome,
      unidade: item.unidade,
      areaHa: item.areaHa.toString(),
      produtividade: item.produtividade.toString(),
      precoUnitario: item.precoUnitario.toString(),
      custoPorHa: item.custoPorHa.toString(),
      producaoTotal: item.producaoTotal.toString(),
      faturamentoBruto: item.faturamentoBruto.toString(),
      custoTotal: item.custoTotal.toString(),
      receitaLiquida: item.receitaLiquida.toString(),
      produtividadePorHa: item.produtividadePorHa?.toString() ?? null,
      taxaLotacao: item.taxaLotacao?.toString() ?? null,
    })),
    totalFaturamento: laudo.totalFaturamento.toString(),
    totalCusto: laudo.totalCusto.toString(),
    totalReceita: laudo.totalReceita.toString(),
    margemPercentual: laudo.margemPercentual.toString(),
    assinaturas: laudo.assinaturas.map((assinatura) => ({
      tipo: assinatura.tipo,
      nomeSignatario: assinatura.nomeSignatario,
      documento: assinatura.documento,
      imagemBase64: assinatura.imagemBase64,
      hash: assinatura.hash,
      assinadoEm: assinatura.assinadoEm ? assinatura.assinadoEm.toISOString() : null,
    })),
  };
}
