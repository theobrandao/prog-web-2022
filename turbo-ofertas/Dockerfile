# Turbo Ofertas — imagem única (web + worker/cron no mesmo container, compartilhando o
# volume SQLite). Simples e correto para 1 instância; para escalar horizontalmente,
# migrar o banco para Postgres (ver README).
FROM node:22-slim

# ffmpeg para normalização de vídeo (§7.5); openssl para o Prisma.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build          # prisma generate + next build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

RUN chmod +x ./start.sh
CMD ["./start.sh"]
