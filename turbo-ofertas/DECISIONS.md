# DECISIONS.md — decisões de engenharia registradas

Conforme item 4 do PROTOCOLO DE EXECUÇÃO: decisões não cobertas explicitamente pela
especificação, escolhendo a opção mais simples que respeita R1–R6.

| # | Decisão | Por quê | Alternativa rejeitada |
|---|---------|---------|-----------------------|
| D1 | Projeto criado em subpasta `turbo-ofertas/` do repositório | O repositório já continha um trabalho antigo (prog-web-2022); isolar evita colisão | Construir na raiz e sobrescrever arquivos existentes |
| D2 | `core/` puro usa `decimal.js` diretamente (não o Decimal do Prisma) | Mantém o núcleo sem dependência de I/O/DB e 100% testável (regra de arquitetura §2) | Importar tipos do Prisma no core |
| D3 | Datas em `America/Sao_Paulo` via `luxon` (`lib/dates.ts`) | Truncamento de dia correto sem depender do fuso do servidor (§5.1) | `Date` nativo/UTC |
| D4 | Token de sessão = `payload.base64url` + HMAC-SHA256 com `SESSION_SECRET` (`node:crypto`) | Sem dependência extra; assinável/verificável em runtime node; cookie HttpOnly/Secure/SameSite=Lax, 7 dias (§10) | JWT lib externa |
| D5 | Senha com `argon2id` (pacote `argon2`), importado de forma **lazy** em `lib/auth.ts` | A lógica pura de token continua testável sem o módulo nativo | `bcrypt` (spec pede argon2id) |
| D6 | `falseDiscount` ancora "recente" ao **último ponto do histórico**, não ao relógio | Torna a função pura e determinística/testável | Usar `Date.now()` dentro do core |
| D7 | Gancho de **comparação histórica** (§5.6.3) usa o limiar exato do texto da spec: `max90 ≥ 1,15 × preçoHoje` | Os números ILUSTRATIVOS do §12 ("max90 2.900/preço 2.532 → sai") são internamente inconsistentes: 2900/2532 = 1,145 < 1,15. Seguimos a REGRA declarada, não o exemplo com typo | Calibrar para casar os números ilustrativos e violar a regra escrita |
| D8 | Constantes de calibração (`1.25`, `0.85`, janelas) em `core/constants.ts` com comentário | Explicitado no §5.4 ("com comentário, para calibrar depois") | Hard-code espalhado |
| D9 | Importador separado em `importer.ts` (validação **pura**, testável) e `importRunner.ts` (xlsx + DB) | Permite testar `validateRow` sem exceljs/Prisma; runner cobre idempotência via `@@unique` | Um único módulo acoplado ao DB |
| D10 | `.env` carregado via `node --env-file=.env` (Node 22 nativo) nos scripts seed/worker | Evita dependência `dotenv`; o Next carrega `.env` sozinho | `dotenv` |
| D11 | Faixa de preço padrão mantém `maxPrice=2000`; TV do seed ajustada para R$1.799 | Demonstra `vaga1[alto]` respeitando a regra em vez de afrouxá-la (R5) | Aumentar maxPrice para "encaixar" o produto |
| D12 | Canal `site` incluído nos links do seed | Necessário para a página `/oferta/{id}` e roteamento Amazon (R2), sem gerar link ML por software (R1) | — |
| D13 | Fontes do spec (Archivo/IBM Plex) baixadas para `assets/fonts` (satori exige TTF embutido) | Fidelidade visual ao §7; satori não usa Google Fonts em runtime | Substituir por fonte de sistema (Liberation) |
| D14 | Tracking de clique via **redirect** (`/api/track/{id}?src=`) em vez de só beacon POST | Mede o clique mesmo sem JS e permite trocar o link depois consertando todas as mensagens já enviadas (§4.9) | Beacon POST puro (perde clique sem JS) |
| D15 | Integrações externas em **dry-run** quando falta o segredo (logam a chamada) | Item 3 do protocolo: rodar sem credencial sem quebrar o pipeline; `lib/env.dryRun.*` decide | Exigir credencial para qualquer execução |
| D16 | Jobs de publicação com `type` por vaga (`publishTg1/2/3`) para a unicidade `(type, runDate)` | Permite 3 publicações/dia idempotentes sem colidir no mesmo dia (§9) | Um único type por dia (impediria as 3 janelas) |
| D17 | Imagens do seed via `picsum.photos` caem para criativo tipográfico (403 no proxy) | O fallback do §7.4 é exatamente esse caminho; pipeline nunca quebra por imagem | Falhar a geração quando a imagem não baixa |
| D18 | Middleware faz checagem leve (presença/exp, sem verificar HMAC — runtime Edge); enforcement real de assinatura+papel nos route handlers/páginas (runtime Node) | `node:crypto` não existe no Edge; segurança real fica no servidor via `getSession()` | Verificar HMAC no middleware (quebra no Edge) |

## Restrições R1–R6 — como o código as impõe (não só documenta)

- **R1 (nunca gerar link ML por software):** não existe módulo de geração ML. Em `evaluate.ts`, produto ML sem link `grp`+`cnl` falha o check `LINK` e aparece em "ML pendentes de link". Links ML são inseridos manualmente (importador/tela `/links`).
- **R2 (Amazon nunca em WhatsApp/Telegram):** `core/texts.ts#resolveMessageLink` troca por `${PUBLIC_BASE_URL}/oferta/{postId}?src={canal}` quando `source==="amazon"` ou o link casa `/amzn\.to|amazon\.com/i`. Teste `tests/texts.test.ts` falha o build se `amzn.to|amazon.com` aparecer na saída.
- **R3 (sem gateway não oficial de WhatsApp):** não há integração de envio a WhatsApp em lugar nenhum; o caminho é Telegram privado → encaminhamento humano.
- **R4 (sem TikTok Shop):** `importer.ts` rejeita `fonte=tiktok` com mensagem explicativa (`tests/importer.test.ts`).
- **R5 (nunca completar cota com reprovado):** `core/select.ts` só usa aprovados; publica menos quando faltam. Não existe caminho de "forçar publicação".
- **R6 (nada descartado em silêncio):** toda reprovação gera `reasons[]` (`evaluate.reasonsFrom`) e o importador acumula `rejected[]`/`warnings[]` sem abortar o lote.
