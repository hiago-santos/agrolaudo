FROM node:20-bookworm-slim AS base
RUN corepack enable

# Chromium do sistema operacional em vez do Chromium baixado pelo Puppeteer na
# instalação — imagem final menor e build não depende de baixar ~300MB do npm.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

FROM deps AS build
COPY . .
RUN pnpm prisma:generate
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
# prisma/seed.ts importa direto de src/core/*.ts (via tsx) para reusar o mesmo
# catálogo/motor do app em vez de duplicar dados — por isso o src/ também vai pro
# runner, não só o dist/. Trade-off consciente: imagem um pouco maior, deploy
# consistente (o mesmo `pnpm db:seed` funciona igual em dev e em produção).
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./
COPY package.json ./

EXPOSE 8000
CMD ["node", "dist/server.js"]
