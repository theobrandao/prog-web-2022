import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { daysAgo } from "../lib/dates.js";
import { formatBRL } from "../core/format.js";
import * as tg from "../services/telegram.js";
import type { JobLogger } from "../lib/log.js";

/** Fri 18:00 (§9): revenue, clicks per channel and top-3 products, to the private chat. */
export async function weeklyReport(prisma: PrismaClient, opts: { log?: JobLogger } = {}) {
  const log = opts.log?.log ?? (() => {});
  const since = daysAgo(7);

  const metrics = await prisma.metricEntry.findMany({ where: { date: { gte: since } } });
  const revenue = metrics.reduce((s, m) => s.plus(new Decimal(String(m.revenue))), new Decimal(0));
  const sales = metrics.reduce((s, m) => s + m.sales, 0);

  const clicks = await prisma.clickEvent.groupBy({
    by: ["src"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });
  const clicksByChannel = clicks.map((c) => `${c.src}: ${c._count._all}`).join(" · ") || "sem cliques próprios";

  const topPosts = await prisma.post.findMany({
    where: { date: { gte: since } },
    include: { product: true, _count: { select: { clicks: true } } },
    orderBy: { clicks: { _count: "desc" } },
    take: 3,
  });
  const top = topPosts.map((p, i) => `${i + 1}. ${p.product.title.slice(0, 40)} (${p._count.clicks} cliques)`).join("\n") || "sem posts";

  const text = [
    "📊 Relatório semanal — Turbo Ofertas",
    `Receita lançada: R$ ${formatBRL(revenue)} · ${sales} vendas`,
    `Cliques próprios por canal: ${clicksByChannel}`,
    "Top 3 produtos:",
    top,
  ].join("\n");

  const chat = tg.privateChatId();
  const res = chat ? await tg.sendMessage(chat, text) : { dryRun: true, call: "telegram.sendMessage(weekly)", ok: true };
  log(`weeklyReport: ${res.dryRun ? "[dry-run] " : ""}${res.call}`);
  return { revenue: revenue.toString(), sales };
}
