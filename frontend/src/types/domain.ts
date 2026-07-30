export type RoleUsuario = 'ADMIN' | 'AGRONOMO' | 'BANCO';
export type ClassificacaoProdutor = 'PRONAF' | 'PRONAMP' | 'DEMAIS';
export type CategoriaAtividade =
  | 'GRAOS_FIBRAS'
  | 'PERMANENTES_FRUTICULTURA'
  | 'SEMIPERMANENTES'
  | 'PECUARIA_PASTAGEM';
export type StatusLaudo = 'RASCUNHO' | 'AGUARDANDO_ASSINATURA' | 'ASSINADO' | 'CANCELADO';
export type TipoAssinatura = 'AGRONOMO' | 'PRODUTOR';

export interface Agronomo {
  id: string;
  nome: string;
  cpf: string;
  crea: string;
  regiao: string | null;
  cidadeEmissao: string;
  assinaturaPadraoBase64: string | null;
  user?: { email: string; ativo: boolean };
}

export interface User {
  id: string;
  nome: string;
  email: string;
  role: RoleUsuario;
  agronomo: Agronomo | null;
}

export interface Produtor {
  id: string;
  nome: string;
  cpfCnpj: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  municipio: string;
  uf: string;
  classificacao: ClassificacaoProdutor;
  propriedades: Propriedade[];
}

export interface Propriedade {
  id: string;
  produtorId: string;
  nome: string;
  matricula: string;
  municipio: string;
  uf: string;
  areaTotalHa: string;
  inscricaoEstadual: string | null;
  car: string | null;
  latitude: string | null;
  longitude: string | null;
  produtor?: { id: string; nome: string; cpfCnpj: string };
}

export interface Atividade {
  id: string;
  slug: string;
  nome: string;
  categoria: CategoriaAtividade;
  unidadePadrao: string;
  unidadesPermitidas: string[];
  pecuaria: boolean;
  ativo: boolean;
  ordem: number;
}

export interface CotacaoRef {
  id: string;
  atividadeId: string;
  unidade: string;
  precoUnitario: string;
  custoPorHa: string;
  regiao: string | null;
  vigenteDesde: string;
}

export interface MatrizItem {
  atividade: Atividade;
  cotacaoAtual: CotacaoRef | null;
}

export interface Safra {
  id: string;
  rotulo: string;
  inicio: string;
  fim: string;
  ativa: boolean;
}

export interface LaudoItem {
  id: string;
  atividadeId: string;
  atividadeNome: string;
  unidade: string;
  areaHa: string;
  produtividade: string;
  precoUnitario: string;
  custoPorHa: string;
  rebanhoCabecas: string | null;
  producaoTotal: string;
  faturamentoBruto: string;
  custoTotal: string;
  receitaLiquida: string;
  produtividadePorHa: string | null;
  taxaLotacao: string | null;
  ordem: number;
}

export interface Assinatura {
  id: string;
  tipo: TipoAssinatura;
  nomeSignatario: string;
  documento: string;
  imagemBase64: string | null;
  hash: string | null;
  assinadoEm: string | null;
  token?: string | null;
}

export interface LaudoResumo {
  id: string;
  numero: string;
  status: StatusLaudo;
  totalFaturamento: string;
  totalCusto: string;
  totalReceita: string;
  margemPercentual: string;
  createdAt: string;
  produtor: { id: string; nome: string; cpfCnpj: string };
  propriedade: { id: string; nome: string; matricula: string };
  safra: { id: string; rotulo: string };
  agronomo: { id: string; nome: string; crea: string };
}

export interface Laudo extends LaudoResumo {
  cidadeEmissao: string;
  dataEmissao: string;
  observacoes: string | null;
  hashDocumento: string | null;
  itens: LaudoItem[];
  assinaturas: Assinatura[];
}

export interface ItemLaudoCalculado {
  atividadeId: string;
  atividadeNome: string;
  unidade: string;
  areaHa: string;
  produtividade: string;
  precoUnitario: string;
  custoPorHa: string;
  producaoTotal: string;
  faturamentoBruto: string;
  custoTotal: string;
  receitaLiquida: string;
  produtividadePorHa: string | null;
  taxaLotacao: string | null;
}

export interface ConsolidadoCalculo {
  totalFaturamento: string;
  totalCusto: string;
  totalReceita: string;
  margemPercentual: string;
}

export interface CalculoLaudoResultado {
  itens: ItemLaudoCalculado[];
  consolidado: ConsolidadoCalculo;
}

export interface Paginado<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardResumo {
  laudosNoMes: number;
  aguardandoAssinatura: number;
  produtoresAtivos: number;
  faturamentoNoMes: string;
  receitaNoMes: string;
  ultimosLaudos: Array<{
    id: string;
    numero: string;
    status: StatusLaudo;
    totalFaturamento: string;
    createdAt: string;
    produtor: { nome: string };
    propriedade: { nome: string };
  }>;
}
