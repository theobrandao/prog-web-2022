import cron from "node-cron";
import { prisma } from "./src/lib/db.js";
import { withJob } from "./src/jobs/runner.js";
import { selectDaily } from "./src/jobs/selectDaily.js";
import { makeCreatives } from "./src/jobs/makeCreatives.js";
import { publishTg, publishIg } from "./src/jobs/publish.js";
import { waPackage } from "./src/jobs/waPackage.js";
import { weeklyReport } from "./src/jobs/weeklyReport.js";
import * as tg from "./src/services/telegram.js";
import { info } from "./src/lib/log.js";

const TZ = "America/Sao_Paulo";
const opts = { timezone: TZ } as const;

// 06:00 — selection -> creatives -> WhatsApp package
cron.schedule("0 6 * * *", async () => {
  const now = new Date();
  await withJob(prisma, "selectDaily", now, (l) => selectDaily(prisma, { log: l }));
  await withJob(prisma, "makeCreatives", now, (l) => makeCreatives(prisma, { log: l }), { force: true });
  await withJob(prisma, "waPackage", now, (l) => waPackage(prisma, { log: l }));
}, opts);

// 09:00 — IG story + TG for post 1
cron.schedule("0 9 * * *", async () => {
  const now = new Date();
  await withJob(prisma, "publishIg1", now, (l) => publishIg(prisma, { slot: 1, kinds: ["story"], log: l }));
  await withJob(prisma, "publishTg1", now, (l) => publishTg(prisma, { slot: 1, log: l }));
}, opts);

// 12:30 — IG feed+story + TG for post 2
cron.schedule("30 12 * * *", async () => {
  const now = new Date();
  await withJob(prisma, "publishIg2", now, (l) => publishIg(prisma, { slot: 2, kinds: ["feed", "story"], log: l }));
  await withJob(prisma, "publishTg2", now, (l) => publishTg(prisma, { slot: 2, log: l }));
}, opts);

// 20:00 — IG story + TG for post 3
cron.schedule("0 20 * * *", async () => {
  const now = new Date();
  await withJob(prisma, "publishIg3", now, (l) => publishIg(prisma, { slot: 3, kinds: ["story"], log: l }));
  await withJob(prisma, "publishTg3", now, (l) => publishTg(prisma, { slot: 3, log: l }));
}, opts);

// Sunday 08:00 — reminder of pending ML links
cron.schedule("0 8 * * 0", async () => {
  await withJob(prisma, "linksReminder", new Date(), async (l) => {
    const mlNoLinks = await prisma.product.count({
      where: { source: "ml", active: true, links: { none: { channel: "cnl" } } },
    });
    const chat = tg.privateChatId();
    const text = `🔗 Lembrete: ${mlNoLinks} produto(s) ML sem link completo (grp+cnl). Gere no Portal do Afiliado e cole em /links.`;
    const res = chat ? await tg.sendMessage(chat, text) : { dryRun: true, call: "telegram.sendMessage(reminder)" };
    l.log(`${res.dryRun ? "[dry-run] " : ""}${res.call}`);
  });
}, opts);

// Friday 18:00 — weekly report
cron.schedule("0 18 * * 5", async () => {
  await withJob(prisma, "weeklyReport", new Date(), (l) => weeklyReport(prisma, { log: l }));
}, opts);

info(`Turbo Ofertas worker iniciado (TZ=${TZ}). Telegram dry-run=${tg.channelId() ? "não" : "sim"}.`);
