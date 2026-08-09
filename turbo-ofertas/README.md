# Turbo Ofertas

Aplicação web que recebe produtos por planilha (e, na fase 6, pela API da Shopee),
mantém histórico de preço, seleciona diariamente até 3 ofertas por regra de **fundo
de preço (menor preço dos últimos 90 dias)**, gera criativos, publica no Instagram e
no Telegram, entrega o pacote de WhatsApp para encaminhamento humano e serve uma
página pública de ofertas.

> **Restrições invioláveis (R1–R6):** o sistema **nunca** gera link de afiliado do
> Mercado Livre por software (R1); link Amazon **nunca** aparece em WhatsApp/Telegram —
> vai pela página `/oferta/{id}` (R2); **sem** gateway não oficial de WhatsApp (R3);
> **sem** módulo TikTok Shop (R4); **nunca** completa a cota diária com oferta reprovada
> (R5); **nada** é descartado em silêncio (R6). Veja `DECISIONS.md` para como o código
> impõe cada uma.

## Stack
- **Next.js 15** (App Router) + React 19 + TypeScript
- **Prisma** + SQLite (arquivo em `data/app.db`, volume persistente no deploy)
- **decimal.js** (dinheiro sempre em Decimal, nunca float), **luxon** (dia em `America/Sao_Paulo`)
- **exceljs** (importador), **satori + sharp** (criativos), **argon2** (senha), **node-cron** (worker)
- **Vitest** (testes do núcleo, importador e auth)

## Pré-requisitos
- Node.js 22+
- `ffmpeg` no host (fase de vídeo, §7.5): `apt-get install -y ffmpeg`

## Setup local
```bash
cd turbo-ofertas
npm install
cp .env.example .env          # preencha ao menos ADMIN_EMAIL/ADMIN_PASSWORD/SESSION_SECRET/DATABASE_URL
npm run prisma:generate       # gera o Prisma Client
npm run db:push               # cria data/app.db a partir do schema
npm run seed                  # Rule padrão + admin + 12 produtos com 20 dias de histórico
npm run template              # (opcional) gera template-entrada.xlsx na raiz
npm run dev                   # http://localhost:3000  → faça login com ADMIN_EMAIL/ADMIN_PASSWORD
```

O worker de cron (publicações agendadas) roda separado:
```bash
npm run worker
```

### Testes
```bash
npm test        # 72 testes: core, importador (com idempotência em DB), auth
```

## Variáveis de ambiente (`.env`)
Veja `.env.example`. Resumo:

| Variável | Fase | Como obter |
|---|---|---|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 1 | você define; o seed cria o primeiro admin. Troque a senha na primeira sessão |
| `SESSION_SECRET` | 1 | string aleatória longa (`openssl rand -hex 32`) |
| `DATABASE_URL` | 1 | `file:./data/app.db` |
| `PUBLIC_BASE_URL` | 4 | URL HTTPS pública do deploy (a Graph API busca as imagens por ela) |
| `GROUP_INVITE_URL` | 3 | convite do seu grupo/canal (rodapé de toda mensagem) |
| `TELEGRAM_BOT_TOKEN` | 3 | @BotFather (abaixo) |
| `TELEGRAM_CHANNEL_ID` | 3 | id do canal onde o bot publica |
| `TELEGRAM_PRIVATE_CHAT_ID` | 3 | seu chat privado (pacote WhatsApp + alertas) |
| `IG_USER_ID` | 4 | id da conta IG profissional |
| `IG_ACCESS_TOKEN` | 4 | token de longa duração (~60 dias) |
| `SHOPEE_APP_ID` / `SHOPEE_SECRET` | 6 | Painel de Afiliados Shopee |

Integração sem credencial roda em **dry-run** (loga a chamada em vez de executá-la).

## Importação de produtos
1. Baixe o template em **/importar** (ou `npm run template`). Colunas, em ordem:
   `fonte | id_item | titulo | url_produto | url_imagem | url_video | preco_atual | preco_ancora | condicao_preco | comissao_pct | cupom | instrucao_cupom | frete | urgencia | comentario | avaliacoes | nota | reputacao_vendedor | vendedor | link_grp | link_cnl | link_ig | data_coleta | comissao_reais`
2. A aba deve se chamar `PRODUTOS`. A linha-exemplo (`id_item=MLB1234567890` + `EXEMPLO` no título) é ignorada.
3. Suba em **/importar**. O resumo mostra importados/atualizados e **cada rejeição com o motivo** (nenhuma linha aborta o lote). `fonte=tiktok` é rejeitada (R4).

## Obtenção de credenciais

### Telegram (Fase 3)
1. No Telegram, fale com **@BotFather** → `/newbot` → escolha nome e usuário → copie o **token** para `TELEGRAM_BOT_TOKEN`.
2. Crie o **canal** público/privado, adicione o bot como **administrador**. Para pegar o `TELEGRAM_CHANNEL_ID`: encaminhe uma mensagem do canal para **@userinfobot** ou use `https://api.telegram.org/bot<token>/getUpdates` após postar algo. IDs de canal começam com `-100`.
3. `TELEGRAM_PRIVATE_CHAT_ID`: mande `/start` ao seu bot no privado e pegue o `chat.id` em `getUpdates`.
4. Teste em **/config** → cartão Telegram → **Testar** (faz `getMe` e envia uma mensagem ao privado).

### Instagram / Graph API (Fase 4)
Pré-requisitos: conta **IG profissional** → vinculada a uma **Página do Facebook** → **app Meta** com as permissões `instagram_basic`, `instagram_content_publish`, `pages_show_list`.
1. Crie o app em <https://developers.facebook.com/apps>.
2. Gere um **token de usuário de longa duração** (~60 dias) e pegue o `IG_USER_ID` (via `GET /me/accounts` → `instagram_business_account`).
3. `PUBLIC_BASE_URL` precisa responder **HTTPS** antes da fase 4 (a Graph API baixa `/(img)/creatives/*` por essa URL).
4. Teste em **/config** → cartão Instagram → mostra a **validade do token** (contagem regressiva).

#### Renovação do token IG (~60 dias)
O `/config` exibe `expiresAt` (salvo em `Setting`). Para trocar antes de vencer:
```
GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={TOKEN_ATUAL}
```
Cole o novo token em `IG_ACCESS_TOKEN` e reinicie o serviço. Um alerta é enviado ao
Telegram privado **10 dias antes** do vencimento (job semanal).

### Shopee Affiliate (Fase 6)
No Painel de Afiliados Shopee, crie um app e copie `SHOPEE_APP_ID` / `SHOPEE_SECRET`.
A assinatura do header é `SHA256(AppId+Timestamp+Payload+Secret)` — confira o formato exato na doc oficial do painel.

## Deploy (Railway / Render)
1. Dois serviços do mesmo repo: **web** (`npm run build && npm start`) e **worker** (`npm run worker`).
2. **Volume persistente** montado em `/data` (SQLite) e em `/public/img` (mídia baixada).
3. Configure as variáveis da tabela acima.
4. Build roda `prisma generate` + `next build`; em produção use `npm run prisma:deploy` (`prisma migrate deploy`). O `seed` é só para dev/demonstração.
5. Aponte `PUBLIC_BASE_URL` para a URL HTTPS gerada (necessária para a Graph API na fase 4).
6. Instale `ffmpeg` no container (normalização de vídeo, §7.5).

## Backup
```bash
npm run backup   # gera backups/turbo-ofertas-AAAAMMDD-HHmm.tar.gz (data/ + public/img + public/vid)
```

## Arquitetura (resumo)
- `src/core/` — **regras de negócio puras** (sem I/O, 100% testáveis): `evaluate`, `select`, `falseDiscount`, `texts`, `hooks`, `blocklist`, `format`, `constants`.
- `src/services/` — I/O: `importer`/`importRunner`, `selection`, `users`, (fase 3+: `images`, `videos`, `creatives`, `instagram`, `telegram`, `shopee`).
- `src/lib/` — `db`, `auth`, `money`, `dates`, `log`.
- `src/app/` — páginas (públicas + admin) e rotas `/api`.
- `worker.ts` — cron (§9) + runner de jobs.
- `prisma/` — schema + seed.
- `tests/` — Vitest.

Regra de ouro: **`src/core/` não importa `src/services/` nem toca banco/rede.**

Estado de implementação por fase: veja `PROGRESS.md`. Decisões de projeto: `DECISIONS.md`.
