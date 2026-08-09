# PROGRESS.md — Turbo Ofertas

> Atualizado continuamente conforme item 5 do PROTOCOLO DE EXECUÇÃO.

## Fase atual: **1 → 2 concluídas (núcleo testado); 3–6 pendentes**

### ✅ Fase 1 — Esqueleto, Prisma, auth multiusuário, importador, /produtos, /importar
Checklist de aceite:
- [x] Estrutura de pastas do §2 e configs (Next, TS, Vitest, Prisma).
- [x] Schema Prisma completo (§2.2) e DB SQLite criada (`prisma db push`).
- [x] Auth multiusuário: registro **pendente**, login, papéis admin/operador, `AuditLog`.
  - Travas: admin não bloqueia/reprova a si mesmo; último admin não é rebaixado/bloqueado; usuário criado pelo admin já entra aprovado. **(6 testes DB verdes)**
  - Token de sessão HMAC + `argon2id` para senha. **(5 testes verdes)**
- [x] Importador `.xlsx` (§6): validação linha a linha pura + upsert idempotente.
  - Linha inválida rejeitada **sem abortar o lote** (R6); tiktok rejeitado (R4); reimportação não duplica `PricePoint`. **(10 + 1 DB testes verdes)**
- [x] `template-entrada.xlsx` gerado (script `npm run template`); linha-exemplo é ignorada na importação.
- [ ] Páginas `/produtos` e `/importar` (UI) — **em construção** (camada web).
- [ ] Download de imagens (`services/images.ts`) — **pendente**.

### ✅ Fase 2 — core completo + /regras + /hoje + seed
Checklist de aceite:
- [x] `core/evaluate` (12 checks na ordem do §5.2) — cada check testado isolado; ML sem link; amazon dispensado; em observação <14d. **(16 testes)**
- [x] `core/select` (§5.3) — ticket alto na vaga 1; cota incompleta (R5); desempate; não repetir produto de 7 dias. **(8 testes)**
- [x] `core/falseDiscount` (§5.4) — pico inflado→true; queda legítima→false; histórico curto→false. **(4 testes)**
- [x] `core/texts` (§5.5) — âncora/sem âncora/cupom/frete; sem linha oca; rodapé de convite sempre; **R2** (Amazon → `/oferta/`, sem `amzn.to|amazon.com`). **(11 testes)**
- [x] `core/hooks` (§5.6) — comentário humano; urgência só com campo; BAIXOU; teto R$2.669→"POR MENOS DE R$ 3.000"; comparação histórica; kit unitário; rotação determinística. **(9 testes)**
- [x] `core/blocklist` — normalização acento/caixa. **(2 testes)**
- [x] `seed.ts` — Rule padrão + admin bootstrap + 12 produtos com 20 dias de histórico.
- [x] Seed **demonstra /hoje**: 3 selecionados (`vaga1[alto]` TV R$1.799, +2 baixo), 2 aprovados sem vaga, 7 barrados cobrindo cada motivo, 1 ML pendente de link.
- [ ] Páginas `/regras` e `/hoje` (UI) — **em construção** (camada web).

**Testes: 72/72 verdes** (`npm test`). Ver `tests/`.

### ⏳ Camada web (Next.js) — em construção
API routes + páginas (login, hoje, produtos, importar, regras, usuarios) + middleware de auth.
Serviço `selection.ts` (DB→core, `computeToday`) pronto e verificado com o seed.

### ⛔ Fases 3–6 — não iniciadas
- Fase 3: criativos (satori+sharp), `/ofertas`, Telegram (canal + pacote privado). **Precisa:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_PRIVATE_CHAT_ID`, `GROUP_INVITE_URL`.
- Fase 4: Instagram feed+story, `/config`. **Precisa:** `IG_USER_ID`, `IG_ACCESS_TOKEN`, `PUBLIC_BASE_URL` HTTPS (deploy antes).
- Fase 5: `/relatorios`, cron (`worker.ts`), weeklyReport, backup (script já existe).
- Fase 6: Shopee API. **Precisa:** `SHOPEE_APP_ID`, `SHOPEE_SECRET`.

## Próximos passos
1. Concluir a camada web e rodar `npx next build` limpo.
2. `services/images.ts` (download + resize + strip EXIF) e job de download na importação.
3. Fase 3: criativos + Telegram (dry-run enquanto não houver credencial).

## Credenciais que preciso de você (com instrução no README)
- **Fase 3:** `TELEGRAM_BOT_TOKEN` (via @BotFather), `TELEGRAM_CHANNEL_ID`, `TELEGRAM_PRIVATE_CHAT_ID`, `GROUP_INVITE_URL`.
- **Fase 4:** `IG_USER_ID`, `IG_ACCESS_TOKEN` (app Meta + token longa duração), `PUBLIC_BASE_URL` HTTPS.
- **Fase 6:** `SHOPEE_APP_ID`, `SHOPEE_SECRET`.
