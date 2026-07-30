# AgroLaudo

Plataforma de emissão de **Laudos de Capacidade Pagadora** para produtores rurais —
substitui a planilha Excel que o Eng. Agrônomo preenchia manualmente por um sistema web
com cadastro único de produtores, matriz de preços/custos por atividade, cálculo em tempo
real, assinatura digital (na tela ou por link remoto) e exportação em **XLSX** (fiel ao
modelo original, com fórmulas nativas) e **PDF** (padrão bancário, com QR Code de
verificação de autenticidade).

## O que tem pronto

- **Motor de cálculo** (`backend/src/core/`) — puro, testado, com "teste dourado" batendo
  os números reais validados com o cliente.
- **15 atividades** configuráveis (grãos, permanentes/fruticultura, semipermanentes,
  pecuária) com unidade de medida própria cada uma.
- **Matriz de Preços & Custos** — histórico append-only; atualizar nunca reescreve um
  laudo já emitido (snapshot por item).
- **Cadastro** de produtores, propriedades, agrônomos e safras.
- **Formulário de laudo em 3 passos** — produtor/safra → atividades com cálculo ao vivo →
  revisão, emissão e assinatura — com preview idêntico ao PDF final (mesmo template).
- **Assinatura digital dupla** (Agrônomo + Produtor): na tela (canvas) ou por link remoto
  com token, sem exigir login do produtor. Hash por assinatura + hash do documento final +
  QR Code de verificação pública.
- **Histórico** com busca, filtro por status, duplicação para a próxima safra (repuxando
  preços atuais da matriz) e reemissão de XLSX/PDF.
- **Multiusuário** com papéis `ADMIN` / `AGRONOMO` / `BANCO` (este último somente leitura).

Fora de escopo (por decisão do usuário — ver plano do projeto): integração real de
WhatsApp/e-mail (fica um `NotificacaoPort` pronto para trocar o adapter) e assinatura
certificada ICP-Brasil/Gov.br.

## Estrutura

Dois projetos **independentes**, cada um com seu `package.json` — não é um monorepo com
workspaces:

```
agrolaudo/
├─ backend/     Fastify 5 + TypeScript + Prisma + PostgreSQL
│  ├─ src/core/      motor de cálculo puro (sem I/O) + catálogo das 15 atividades
│  ├─ src/report/    template HTML do laudo + geradores XLSX (ExcelJS) e PDF (Puppeteer)
│  ├─ src/modules/   rotas + services por domínio (produtores, laudos, cotações...)
│  └─ src/test/integration/   testes que batem a API real contra o Postgres seedado
├─ frontend/    React 19 + Vite + TypeScript + Tailwind + Zustand
└─ docker-compose.yml   Postgres + API (produção)
```

## Pré-requisitos

- Node.js ≥ 20
- pnpm ≥ 9 (ou npm — nenhum dos dois projetos depende de recursos de workspace)
- Docker (para o PostgreSQL local) ou uma instância PostgreSQL 16 já rodando

## Rodando em desenvolvimento

**1. Banco de dados**

Use um PostgreSQL já instalado localmente (crie o banco `agrolaudo_db` antes) **ou**
suba o container do compose:

```bash
docker compose up db -d
```

Se for usar Postgres nativo na porta 5432, atenção: o `docker-compose.yml` mapeia o
container para **5433** justamente para não colidir com uma instância local.

**2. Backend**

```bash
cd backend
cp .env.example .env       # ajuste DATABASE_URL para o seu Postgres
pnpm install
pnpm prisma:migrate         # cria as tabelas (primeira vez) ou prisma:deploy num banco novo
pnpm db:seed                 # 15 atividades + agrônomo + caso Márcio Menezes Ribeiro
pnpm dev                     # http://localhost:8000 · Swagger em /docs
```

**3. Frontend**

```bash
cd frontend
cp .env.example .env       # VITE_API_URL=http://localhost:8000
pnpm install
pnpm dev                    # http://localhost:5173
```

**Logins de demonstração** (criados pelo seed, senha entre parênteses):

| Papel | E-mail | Senha |
|---|---|---|
| Engenheiro Agrônomo | `pedro.agronomo@agrolaudo.local` | `agronomo123` |
| Administrador | `admin@agrolaudo.local` | `admin123` |
| Banco (somente leitura) | `banco@agrolaudo.local` | `banco123` |

> Credenciais de desenvolvimento — troque/desative antes de qualquer uso real.

## Testes e qualidade

```bash
cd backend
pnpm test               # unitários — motor de cálculo, template, XLSX (sem banco)
pnpm test:integration   # bate a API real via HTTP contra o Postgres seedado
pnpm typecheck && pnpm lint

cd frontend
pnpm build               # tsc -b && vite build
pnpm lint
```

O motor de cálculo (`backend/src/core/`) tem um **teste dourado** com os números
validados junto ao cliente: laudo do Márcio Menezes Ribeiro (Cana + Soja + Pecuária)
fechando em **R$ 19.345.000,00** de faturamento, **R$ 11.430.970,00** de custo,
**R$ 7.914.030,00** de receita líquida e **40,91%** de margem — repetido em três camadas
(`core/calculadora.test.ts`, `report/*.test.ts` e `test/integration/laudos.integration.test.ts`)
para que qualquer regressão nesse número seja pega antes de chegar num banco de verdade.

Os testes de `report/` também travam dois bugs reais encontrados em QA visual: texto
invisível quando o Chromium renderiza com preferência de dark mode (faltava
`color-scheme: light only`), e códigos de unidade crus aparecendo no documento em vez do
símbolo (`SACA_60KG` em vez de `sc`).

## Produção

```bash
docker compose up --build -d
docker exec agrolaudo_api npx prisma migrate deploy
docker exec agrolaudo_api npx tsx prisma/seed.ts   # opcional — só na primeira vez
```

Sobe PostgreSQL + API (a imagem do backend usa o Chromium do sistema operacional para o
Puppeteer, não o baixado pelo npm — build validado, ~70KB de PDF gerado corretamente
dentro do container). O frontend é buildado à parte (`pnpm build` em `frontend/`, gera
`dist/` estático) e servido por qualquer CDN/host estático — Vercel, Netlify, Nginx.

Variáveis de ambiente obrigatórias em produção: `DATABASE_URL`, `JWT_SECRET`,
`COOKIE_SECRET`, `CORS_ORIGIN`, `PUBLIC_APP_URL`. Gere segredos novos — nunca reutilize
os valores de exemplo do `.env.example`. `docker compose down -v` remove também o volume
do Postgres, para começar de um banco limpo.

## Notas de arquitetura

- **Um único motor de cálculo.** O frontend nunca recalcula localmente — chama
  `POST /laudos/calcular` (debounced) e mostra o que a API responder. Elimina por
  construção a possibilidade de a tela mostrar um número diferente do que é salvo.
- **Um único template de documento.** O preview em tela (`<iframe srcDoc>`), o PDF
  (Puppeteer) e a página pública de assinatura usam a mesma função
  `renderLaudoHtml()` — não existem dois lugares para o layout divergir.
- **Snapshot de preço.** `LaudoItem` grava o preço/custo vigente no momento da emissão.
  Atualizar a Matriz de Preços depois nunca altera um laudo já emitido (testado em
  `test/integration/laudos.integration.test.ts`).
- **CotacaoRef é append-only.** "Salvar Novas Cotações" insere uma linha nova; o
  histórico completo fica disponível em `GET /cotacoes/:atividadeId/historico`.
