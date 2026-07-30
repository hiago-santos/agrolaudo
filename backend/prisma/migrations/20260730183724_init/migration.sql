-- CreateEnum
CREATE TYPE "RoleUsuario" AS ENUM ('ADMIN', 'AGRONOMO', 'BANCO');

-- CreateEnum
CREATE TYPE "ClassificacaoProdutor" AS ENUM ('PRONAF', 'PRONAMP', 'DEMAIS');

-- CreateEnum
CREATE TYPE "CategoriaAtividade" AS ENUM ('GRAOS_FIBRAS', 'PERMANENTES_FRUTICULTURA', 'SEMIPERMANENTES', 'PECUARIA_PASTAGEM');

-- CreateEnum
CREATE TYPE "StatusLaudo" AS ENUM ('RASCUNHO', 'AGUARDANDO_ASSINATURA', 'ASSINADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoAssinatura" AS ENUM ('AGRONOMO', 'PRODUTOR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" "RoleUsuario" NOT NULL DEFAULT 'AGRONOMO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agronomos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "crea" TEXT NOT NULL,
    "regiao" TEXT,
    "cidadeEmissao" TEXT NOT NULL,
    "assinaturaPadraoBase64" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agronomos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "municipio" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "classificacao" "ClassificacaoProdutor" NOT NULL DEFAULT 'DEMAIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propriedades" (
    "id" TEXT NOT NULL,
    "produtorId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "areaTotalHa" DECIMAL(14,2) NOT NULL,
    "inscricaoEstadual" TEXT,
    "car" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propriedades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atividades" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "CategoriaAtividade" NOT NULL,
    "unidadePadrao" TEXT NOT NULL,
    "unidadesPermitidas" TEXT[],
    "pecuaria" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacoes_referencia" (
    "id" TEXT NOT NULL,
    "atividadeId" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "precoUnitario" DECIMAL(18,4) NOT NULL,
    "custoPorHa" DECIMAL(18,4) NOT NULL,
    "regiao" TEXT,
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cotacoes_referencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safras" (
    "id" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "safras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laudo_sequencias" (
    "ano" INTEGER NOT NULL,
    "ultimoNumero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "laudo_sequencias_pkey" PRIMARY KEY ("ano")
);

-- CreateTable
CREATE TABLE "laudos" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "produtorId" TEXT NOT NULL,
    "propriedadeId" TEXT NOT NULL,
    "safraId" TEXT NOT NULL,
    "agronomoId" TEXT NOT NULL,
    "status" "StatusLaudo" NOT NULL DEFAULT 'RASCUNHO',
    "cidadeEmissao" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,
    "totalFaturamento" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCusto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalReceita" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "margemPercentual" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "hashDocumento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laudo_itens" (
    "id" TEXT NOT NULL,
    "laudoId" TEXT NOT NULL,
    "atividadeId" TEXT NOT NULL,
    "atividadeNome" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "areaHa" DECIMAL(14,2) NOT NULL,
    "produtividade" DECIMAL(14,2) NOT NULL,
    "precoUnitario" DECIMAL(18,4) NOT NULL,
    "custoPorHa" DECIMAL(18,4) NOT NULL,
    "rebanhoCabecas" DECIMAL(14,2),
    "producaoTotal" DECIMAL(18,2) NOT NULL,
    "faturamentoBruto" DECIMAL(18,2) NOT NULL,
    "custoTotal" DECIMAL(18,2) NOT NULL,
    "receitaLiquida" DECIMAL(18,2) NOT NULL,
    "produtividadePorHa" DECIMAL(14,2),
    "taxaLotacao" DECIMAL(14,2),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laudo_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "laudoId" TEXT NOT NULL,
    "tipo" "TipoAssinatura" NOT NULL,
    "nomeSignatario" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "imagemBase64" TEXT,
    "hash" TEXT,
    "assinadoEm" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "token" TEXT,
    "tokenExpiraEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agronomos_userId_key" ON "agronomos"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "agronomos_cpf_key" ON "agronomos"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "produtores_cpfCnpj_key" ON "produtores"("cpfCnpj");

-- CreateIndex
CREATE INDEX "produtores_nome_idx" ON "produtores"("nome");

-- CreateIndex
CREATE INDEX "propriedades_produtorId_idx" ON "propriedades"("produtorId");

-- CreateIndex
CREATE UNIQUE INDEX "propriedades_produtorId_matricula_key" ON "propriedades"("produtorId", "matricula");

-- CreateIndex
CREATE UNIQUE INDEX "atividades_slug_key" ON "atividades"("slug");

-- CreateIndex
CREATE INDEX "cotacoes_referencia_atividadeId_vigenteDesde_idx" ON "cotacoes_referencia"("atividadeId", "vigenteDesde");

-- CreateIndex
CREATE UNIQUE INDEX "safras_rotulo_key" ON "safras"("rotulo");

-- CreateIndex
CREATE UNIQUE INDEX "laudos_numero_key" ON "laudos"("numero");

-- CreateIndex
CREATE INDEX "laudos_produtorId_idx" ON "laudos"("produtorId");

-- CreateIndex
CREATE INDEX "laudos_safraId_idx" ON "laudos"("safraId");

-- CreateIndex
CREATE INDEX "laudos_status_idx" ON "laudos"("status");

-- CreateIndex
CREATE INDEX "laudo_itens_laudoId_idx" ON "laudo_itens"("laudoId");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_token_key" ON "assinaturas"("token");

-- CreateIndex
CREATE INDEX "assinaturas_laudoId_idx" ON "assinaturas"("laudoId");

-- AddForeignKey
ALTER TABLE "agronomos" ADD CONSTRAINT "agronomos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propriedades" ADD CONSTRAINT "propriedades_produtorId_fkey" FOREIGN KEY ("produtorId") REFERENCES "produtores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes_referencia" ADD CONSTRAINT "cotacoes_referencia_atividadeId_fkey" FOREIGN KEY ("atividadeId") REFERENCES "atividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laudos" ADD CONSTRAINT "laudos_produtorId_fkey" FOREIGN KEY ("produtorId") REFERENCES "produtores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laudos" ADD CONSTRAINT "laudos_propriedadeId_fkey" FOREIGN KEY ("propriedadeId") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laudos" ADD CONSTRAINT "laudos_safraId_fkey" FOREIGN KEY ("safraId") REFERENCES "safras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laudos" ADD CONSTRAINT "laudos_agronomoId_fkey" FOREIGN KEY ("agronomoId") REFERENCES "agronomos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laudo_itens" ADD CONSTRAINT "laudo_itens_laudoId_fkey" FOREIGN KEY ("laudoId") REFERENCES "laudos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laudo_itens" ADD CONSTRAINT "laudo_itens_atividadeId_fkey" FOREIGN KEY ("atividadeId") REFERENCES "atividades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_laudoId_fkey" FOREIGN KEY ("laudoId") REFERENCES "laudos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
