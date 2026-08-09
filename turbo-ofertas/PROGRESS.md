# PROGRESS.md — Turbo Ofertas

> Atualizado continuamente conforme item 5 do PROTOCOLO DE EXECUÇÃO.

## Estado: **Fases 1–3 completas e funcionando; 4/5/6 em modo dry-run (aguardando credenciais)**

Tudo verificável localmente: `npm test` (76 testes verdes), `npx next build` limpo (type-check total, sem workarounds), pipeline diário rodado ponta a ponta gerando Posts + criativos PNG reais.

### ✅ Fase 1 — Esqueleto, Prisma, auth multiusuário, importador, /produtos, /importar
- [x] Estrutura §2, configs (Next 15, TS, Vitest, Prisma), schema completo (§2.2), DB SQLite em `data/app.db`.
- [x] Auth multiusuário: registro pendente, login (cookie HMAC HttpOnly/Secure), papéis admin/operador, `AuditLog`, travas (auto-bloqueio, último admin). **(11 testes)**
- [x] Importador `.xlsx` (§6): validação pura + upsert idempotente; lote não aborta (R6); tiktok (R4); reimport sem duplicar PricePoint. **(11 testes)**
- [x] `template-entrada.xlsx` + gerador (`npm run template`); imagens (`services/images.ts`).
- [x] Páginas `/produtos` e `/importar` + rotas API.

### ✅ Fase 2 — core completo + /regras + /hoje + seed
- [x] `evaluate` (12 checks §5.2), `select` (§5.3, R5, no-repeat 7d), `falseDiscount` (§5.4), `texts` (§5.5, **R2**), `hooks` (§5.6), `blocklist`. **(39 testes)**
- [x] Seed: Rule + admin + 12 produtos/20 dias → `/hoje` mostra `vaga1[alto]` (TV R$1.799) + 2, 2 aprovados sem vaga, 7 barrados (cada motivo), 1 ML pendente de link.
- [x] Páginas `/hoje` (KPIs, slots, barrados com motivo, pendentes) e `/regras` (prévia ao vivo) + rotas.

### ✅ Fase 3 — Criativos + /ofertas + /oferta + Telegram
- [x] **Criativos reais** satori+sharp (§7): feed 1080×1080 e story 1080×1920; fontes do spec embutidas (Archivo/IBM Plex em `assets/fonts`); fallback tipográfico (§7.4). PNGs gerados para os posts do seed.
- [x] Jobs: `selectDaily` (seleção → Posts com hook/caption/waMessage/tgMessage → enfileira criativos), `makeCreatives`, `publishTg`, `publishIg`, `waPackage`, `weeklyReport`; `runner.withJob` com idempotência por dia (§9). **(2 testes)**
- [x] `worker.ts` — node-cron nos horários da §9 (America/Sao_Paulo).
- [x] Telegram (`sendPhoto`/`sendMessage`/`sendVideo`, cap 1024) em **dry-run** sem token; caption trunca título, nunca o link (§8.2).
- [x] Público: `/ofertas` (grid 7d) e **`/oferta/{postId}`** (criativo, preço, cupom, CTA) com **tracking de clique próprio** por canal (`/api/track/{id}?src=`) gravando `ClickEvent`; **R2**: Amazon roteia por aqui.
- [x] Botão **Rodar seleção** executa o pipeline real (selectDaily→makeCreatives→waPackage).

### 🟡 Fase 4 — Instagram (código pronto, dry-run)
- [x] `services/instagram.ts`: criar container → poll status → publish (feed/story §8.1); `testConnection` para /config.
- [ ] Publicação real: precisa `IG_USER_ID`, `IG_ACCESS_TOKEN`, `PUBLIC_BASE_URL` HTTPS (deploy antes). Sem eles, `publishIg` loga em dry-run.

### 🟡 Fase 5 — Relatórios + cron + weekly (parcial)
- [x] Cron completo (`worker.ts`), `weeklyReport` (dry-run), `backup` (`npm run backup`).
- [~] `/relatorios` e telas operacionais (`/criativos`, `/publicacoes`, `/whatsapp`, `/links`, `/config`) — **em construção** (camada web, subagente).

### 🟡 Fase 6 — Shopee (assinatura pronta, dry-run)
- [x] `services/shopee.ts`: `sign()` SHA256(AppId+Timestamp+Payload+Secret) com **teste de vetor conhecido**; `productOfferV2`, `generateShortLink`, `testConnection` em dry-run.
- [ ] Coleta/shortlink reais: precisa `SHOPEE_APP_ID`, `SHOPEE_SECRET`.

## Testes: 76/76 verdes
core (evaluate/select/falseDiscount/texts/hooks/blocklist), importer (+DB idempotência), auth+users (DB), jobs (idempotência), shopee (vetor).

## Como demonstrar
```
npm install && npm run db:push && npm run seed
npm run dev        # login admin, /hoje já populado; clique "Rodar seleção" → veja /criativos
npm run worker     # agendador (dry-run sem credenciais)
npm test
```

## Credenciais pendentes (habilitam publicação real; até lá, dry-run)
- **Fase 3/4 Telegram/IG:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_PRIVATE_CHAT_ID`, `GROUP_INVITE_URL`, `IG_USER_ID`, `IG_ACCESS_TOKEN`, `PUBLIC_BASE_URL`.
- **Fase 6 Shopee:** `SHOPEE_APP_ID`, `SHOPEE_SECRET`.

## Observação de entrega
Push para o GitHub está bloqueado neste ambiente (GitHub App somente-leitura). O projeto é entregue por bundle/tarball; ver mensagem do assistente.
