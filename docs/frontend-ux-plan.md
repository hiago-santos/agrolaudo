# Plano de execução — Rodada 2 do frontend (UX, responsividade, skeletons, modais e animações)

Documento de handoff. Contém o contexto necessário, o que já foi feito e as tarefas restantes com critérios de aceite. Executar as tarefas na ordem.

## 1. Contexto do projeto

- **Stack:** React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + React Router 7 + Zustand + react-hook-form + zod.
- **Pasta:** `frontend/`. Comandos: `pnpm dev`, `pnpm build` (roda `tsc -b` antes), `pnpm lint` (ESLint com `--max-warnings 0`, ou seja, **warning quebra o lint**).
- **Idioma da interface:** português do Brasil. Todo texto visível, comentário e nome de commit em português.
- **Domínio:** emissão de Laudos de Capacidade Pagadora para produtores rurais, com assinatura digital e verificação pública por QR code. Perfis: `ADMIN`, `AGRONOMIST`, `BANK`.

### Tailwind v4 sem arquivo de config

Não existe `tailwind.config.js` e **não deve ser criado**. Os tokens ficam em `frontend/src/index.css` dentro de `@theme`, e os valores concretos em `:root` / `:root[data-theme='dark']`.

### Direção visual já estabelecida ("Ficha de Campo")

Sistema com cara de documento oficial de crédito rural: papel quente, tinta, tipografia institucional. Manter essa linguagem em tudo que for criado.

Tokens de cor disponíveis como classes Tailwind: `bg-bg`, `bg-bg-subtle`, `bg-surface`, `bg-surface-hover`, `text-text`, `text-text-secondary`, `text-text-tertiary`, `border-border`, `border-border-strong`, `text-accent` / `bg-accent-soft`, `text-gold` / `bg-gold-soft`, `success`, `warning`, `danger`.

Tipografia: `font-sans` (Public Sans, padrão do body), `font-display` (Fraunces — títulos e marca), `font-mono` (IBM Plex Mono — valores em R$, números de projeto, códigos). Números em tabela e valores monetários usam `font-mono tabular-nums`.

Raio: `rounded-md` (campos, botões) e `rounded-lg` (cards, modais). Evitar `rounded-2xl`. Evitar sombras, exceto em menus flutuantes e toasts.

Utilitários de animação já definidos em `index.css`: `animate-page-enter`, `animate-fade-in`, `animate-fade-out`, `animate-dialog-in`, `animate-dialog-out`, `animate-menu-in`, `animate-stamp-in`, e a classe `skeleton` (shimmer). Tokens de tempo: `--duration-fast` (140ms), `--duration-base` (200ms), `--duration-slow` (320ms), com `--ease-out-soft` / `--ease-in-soft`.

`prefers-reduced-motion` já é neutralizado globalmente no fim do `index.css` — não duplicar esse tratamento por componente.

## 2. O que já está pronto (não refazer)

Rodada 1 (identidade visual):

- `frontend/src/index.css` — paleta, tipografia, raio, keyframes, classe `skeleton`.
- `frontend/src/main.tsx` — fontes self-hosted via `@fontsource`.
- Componentes base: `Button`, `Card` (com prop `accent` que desenha barra lateral), `Badge` (estilo carimbo), `Input`/`Textarea`/`Select`/`Label`/`FieldError`, `Table`, `EmptyState`, `Toaster`, `Seal` (selo circular da marca).
- Layout: `Sidebar`, `Topbar`, `PageHeader`, `AppShell` (transição de rota via `key={location.pathname}` + `animate-page-enter`).
- Telas: `Login` e `Dashboard`.

Rodada 2 (parte já concluída):

- `frontend/src/index.css` — keyframes e tokens de movimento adicionais + shimmer do skeleton.
- `frontend/src/components/ui/Skeleton.tsx` — **novo**: `Skeleton`, `SkeletonText`, `SkeletonPageHeader`, `SkeletonTable`, `SkeletonCards`, `SkeletonList`, `SkeletonForm`.
- `frontend/src/components/ui/Spinner.tsx` — enxugado: só `Spinner` (uso inline, ex.: dentro de botão) e `PageSpinner`. O antigo `Skeleton` saiu daqui.
- `frontend/src/components/ui/Dialog.tsx` — reescrito: animação de entrada e saída, focus trap com ciclo de Tab, foco inicial no primeiro campo do conteúdo, devolução de foco ao fechar, trava de scroll compensando a barra, cabeçalho fixo, corpo rolável, `footer` opcional fixo, prop `size` (`sm`/`md`/`lg`/`xl`), e comportamento de bottom sheet no mobile (`< 640px`). Exporta também `DialogFooter`.
- `frontend/src/components/ui/DropdownMenu.tsx` — **novo**: menu acessível com `role="menu"`, navegação por setas, Escape, clique fora, fechamento via contexto. Exporta `DropdownMenu`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`.
- `frontend/src/components/ui/Input.tsx` — `Select` agora tem chevron próprio e prop `containerClassName` (largura vai no container, aparência no `className`).
- `frontend/src/components/layout/Topbar.tsx` — menu da conta migrado para `DropdownMenu`.
- `frontend/src/pages/History.tsx` e `frontend/src/pages/Prices.tsx` — ajustados para o novo `Select` (`containerClassName`).
- `frontend/src/components/project/Step1ProducerSelection.tsx` — busca de produtor virou combobox: `role="combobox"`/`listbox`/`option`, setas para navegar, Enter para selecionar, Escape para limpar, item destacado, skeleton enquanto busca.

### Estado da validação

O último `pnpm build` executado passou. Depois disso houve dois ajustes de lint (contexto de fechamento no `DropdownMenu` e chaves estáveis no `Skeleton`) que **ainda não foram verificados**. Por isso a primeira tarefa é rodar lint e build.

## 3. Tarefas

### T0 — Validar a base atual

Rodar em `frontend/`:

```bash
pnpm lint
pnpm build
```

Corrigir o que aparecer antes de seguir. Atenção a `jsx-a11y` e `react/no-array-index-key`, que são os que mais aparecem neste projeto (lembrando que warning também quebra o lint).

**Aceite:** os dois comandos terminam com código 0.

### T1 — Trocar spinners por skeletons

Regra geral: carregamento de **dados de página** usa skeleton com o formato do conteúdo que vai aparecer; carregamento de **ação pontual** (botão, recálculo) continua com `Spinner`/`loading` do `Button`.

Arquivos e o que usar:

| Arquivo | Hoje | Trocar por |
| --- | --- | --- |
| `src/pages/Dashboard.tsx` | `PageSpinner` | `SkeletonPageHeader` + `SkeletonCards count={5}` (mesmo grid dos KPIs) + `Card` com `SkeletonList rows={5}` |
| `src/pages/History.tsx` | `PageSpinner` dentro do `Card` | `SkeletonTable rows={8} columns={7}` (mesmo número de colunas da tabela real) |
| `src/pages/Producers.tsx` | `PageSpinner` dentro do `Card` | `SkeletonTable rows={6} columns={5}` |
| `src/pages/Prices.tsx` | `PageSpinner` (página inteira) | `SkeletonPageHeader` + 2 blocos de `Card` com `SkeletonTable rows={5} columns={5}` |
| `src/pages/ProjectDetail.tsx` | `PageSpinner` | `SkeletonPageHeader` + `SkeletonCards count={4}` + `Card` com `SkeletonTable rows={5} columns={8}` |
| `src/pages/ProducerDetail.tsx` | `PageSpinner` | `SkeletonPageHeader` + `SkeletonCards count={3}` + grid com 2 cards de `SkeletonText` |
| `src/components/project/Step2Activities.tsx` | `PageSpinner` | `Card` com `SkeletonText lines={2}` + grade de ~9 `Skeleton className="h-10"` (imita a lista de atividades) |
| `src/components/project/Step3Review.tsx` | `PageSpinner` dentro do `Card` | `SkeletonTable rows={4} columns={5}` |
| `src/pages/SignPublic.tsx` | `PageSpinner` | `Card` com `SkeletonText lines={3}` + `SkeletonTable rows={3} columns={3}` |
| `src/pages/VerifyPublic.tsx` | `PageSpinner` | `Card` com `SkeletonText lines={6}` |

Casos de boot de autenticação (`src/routes/ProtectedRoute.tsx` e `src/pages/Login.tsx`, ambos no `if (!hydrated)`): não usar skeleton nem spinner genérico. Criar em `src/components/ui/Seal.tsx` (ou um novo `BootScreen.tsx`) uma tela centralizada com o `Seal size="lg"` e `animate-fade-in`, opcionalmente com `animate-pulse`, sobre `bg-bg`, ocupando `min-h-screen`. É um flash curto — não deve piscar layout.

Depois da troca, remover imports de `PageSpinner` que ficarem sem uso. Se `PageSpinner` deixar de ser usado em todo o projeto, remover a função de `Spinner.tsx`.

**Aceite:** nenhum `PageSpinner` restante em páginas de dados; o skeleton tem aproximadamente as mesmas dimensões do conteúdo real (sem salto perceptível de layout quando os dados chegam); lint e build limpos.

### T2 — Adotar o rodapé fixo dos modais

O `Dialog` agora tem `footer`. Hoje os modais ainda colocam os botões no fim do conteúdo, então eles rolam junto e ficam escondidos no mobile.

Arquivos: `src/components/producers/ProducerFormDialog.tsx`, `src/components/properties/PropertyFormDialog.tsx`, o modal de histórico em `src/pages/Prices.tsx` e o modal de duplicação em `src/pages/ProjectDetail.tsx`.

Como fazer nos modais com formulário (os dois `FormDialog`):

1. Dar um `id` ao `<form>` (ex.: `id="producer-form"`).
2. Mover os botões para o `footer` do `Dialog`.
3. No botão de submit, usar `form="producer-form"` para ele continuar submetendo o formulário mesmo estando fora dele no DOM.
4. Manter a ordem visual: em telas pequenas o botão primário fica em cima (`flex-col-reverse` já é o padrão do rodapé do `Dialog`).

Aproveitar para ajustar os grids internos desses formulários: `grid-cols-2` fixo deve virar `grid-cols-1 sm:grid-cols-2`, e `grid-cols-[1fr_80px]` (Município/UF) deve empilhar no mobile.

Definir `size` adequado por modal: formulários em `md`, histórico de preços em `sm` ou `md`, duplicação em `sm`.

**Aceite:** em 375px de largura, o botão de salvar fica sempre visível sem rolar o modal; o conteúdo longo rola só no corpo; Escape e clique fora fecham com animação de saída; ao fechar, o foco volta para o elemento que abriu.

### T3 — Responsividade

1. **Barra fixa do Step 2** (`src/components/project/Step2Activities.tsx`): o `md:pl-[236px]` está desalinhado, porque a sidebar hoje tem `w-[240px]`. Criar um token único: declarar `--sidebar-width: 240px` no `:root` do `index.css`, usar na `Sidebar` (`w-[var(--sidebar-width)]`) e na barra fixa (`md:pl-[var(--sidebar-width)]`).
2. **Ações do `PageHeader`**: o container de `actions` precisa de `flex-wrap` para não estourar. Em `src/pages/ProjectDetail.tsx` são até 6 ações — agrupar as secundárias (XLSX, PDF, Duplicar) em um `DropdownMenu` rotulado "Ações" e deixar soltas apenas o `Badge` de status e a ação primária do momento (Enviar pro banco / Cancelar).
3. **Grid de KPIs do Dashboard**: `lg:grid-cols-5` fica apertado em telas médias. Usar `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`.
4. **Tabelas**: o wrapper do `Table` já tem `overflow-x-auto`. Adicionar `min-w-[720px]` (ou valor coerente por tabela) na `<table>` das telas com muitas colunas (`History`, `ProjectDetail`, `Prices`) para as colunas não se espremerem, e verificar se o scroll horizontal fica evidente no mobile.
5. **Inputs numéricos da matriz de preços** (`src/pages/Prices.tsx`): larguras fixas `w-28` dentro de tabela apertada — revisar e padronizar altura/foco com o restante do design system (hoje são `<input>` crus com classes repetidas; considerar usar o `Input` com `className`).
6. **Páginas públicas** (`src/pages/SignPublic.tsx`, `src/pages/VerifyPublic.tsx`): trocar o quadrado com ícone `Sprout` pelo componente `Seal`, aplicar `font-display` no título, revisar respiro vertical no mobile e usar os mesmos raios/bordas do resto do sistema.
7. **`StepIndicator`** (`src/components/project/StepIndicator.tsx`): no mobile só aparece o número; garantir que o passo atual mostre o título (ex.: título visível apenas do passo ativo em telas pequenas).

**Aceite:** sem scroll horizontal na página (apenas dentro de tabelas) em 375px, 768px e 1280px; nenhuma ação cortada ou sobreposta; a barra fixa do Step 2 alinha exatamente com o conteúdo.

### T4 — Transições e micro-interações

Princípio da direção visual: movimento contido e com propósito. Não adicionar efeito em tudo.

1. **Toast com saída animada** (`src/components/ui/Toaster.tsx` + `src/stores/toast.ts`): hoje o toast some sem transição. Adicionar um estado de saída na store (ex.: marcar o toast como `leaving` e remover após ~140ms) e aplicar `animate-fade-out` no item.
2. **Item de navegação ativo** (`src/components/layout/Sidebar.tsx`): o estado ativo hoje é só cor de fundo. Adicionar uma marca discreta de "aba de ficha" (barra fina à esquerda em `bg-accent`), com transição de cor.
3. **Linhas clicáveis**: nas tabelas e listas que levam a outra tela (`History`, `Producers`, lista do `Dashboard`), padronizar `transition-colors` e um indicador de foco por teclado visível (`focus-visible:ring-2 focus-visible:ring-accent-ring`).
4. **Cards de propriedade** (`src/pages/ProducerDetail.tsx`): trocar `rounded-xl` por `rounded-lg` e padronizar o hover com o restante.
5. **Transição entre passos do wizard** (`src/pages/NewProject.tsx`): aplicar `animate-page-enter` com `key={step}` no container do passo, para a troca não ser seca.

**Aceite:** nenhuma animação acima de ~320ms; nada pisca ou "pula" ao montar; com `prefers-reduced-motion: reduce` ativo, tudo continua utilizável e sem movimento.

### T5 — Piso de qualidade

- Todo elemento interativo precisa de foco visível por teclado (`focus-visible:ring-2 focus-visible:ring-accent-ring`), inclusive links que parecem botões e ícones-botão.
- Percorrer o app inteiro usando só o teclado: Tab, Enter, Escape e setas nos menus e no combobox.
- Conferir contraste do texto secundário sobre `bg-subtle` nos dois temas (claro e escuro).
- Garantir que todo `<button>` que só tem ícone tenha `aria-label`.

**Aceite:** navegação completa por teclado no fluxo Login → Dashboard → Novo Projeto (3 passos) → Detalhe do projeto, sem armadilha de foco e sempre com foco visível.

### T6 — Validação final

```bash
pnpm lint
pnpm build
```

Revisão visual manual: tema claro e escuro, larguras 375px / 768px / 1280px, e o fluxo completo de emissão de projeto.

**Aceite:** lint e build em 0; nenhuma regressão visual nas telas já entregues (Login, Dashboard, Sidebar, Topbar).

## 4. Convenções ao escrever código aqui

- Comentário só para explicar restrição ou decisão não óbvia — nunca para narrar o que a linha faz.
- Reaproveitar os componentes de `src/components/ui` em vez de recriar estilos soltos; se um padrão se repetir em três lugares, ele vira componente.
- Textos de interface em português, voz ativa, frase capitalizada (não Title Case): "Salvar alterações", não "Salvar Alterações".
- Nada de bibliotecas novas de UI (Radix, Headless UI, framer-motion). Os componentes são próprios e a animação é CSS.
