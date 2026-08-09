import type { PrismaClient } from "@prisma/client";
import { truncDay } from "../lib/dates.js";
import { publicBaseUrl } from "../lib/env.js";
import * as tg from "../services/telegram.js";
import type { JobLogger } from "../lib/log.js";

/**
 * §8.2 — Send the WhatsApp forwarding package to the operator's private chat:
 * one header + one photo+caption per post (the caption is the ready waMessage).
 */
export async function waPackage(
  prisma: PrismaClient,
  opts: { date?: Date; log?: JobLogger } = {},
) {
  const log = opts.log?.log ?? (() => {});
  const day = truncDay(opts.date ?? new Date());
  const posts = await prisma.post.findMany({ where: { date: day }, orderBy: { slot: "asc" } });
  const chat = tg.privateChatId();

  if (posts.length === 0) {
    log("waPackage: nenhum post hoje");
    return { sent: 0 };
  }

  const header = `Pacote de hoje — ${posts.length} ofertas, na ordem: 09:00 / 12:30 / 20:00`;
  const h = chat ? await tg.sendMessage(chat, header) : { dryRun: true, call: "telegram.sendMessage(header)", ok: true };
  log(`cabeçalho: ${h.dryRun ? "[dry-run] " : ""}${h.call}`);

  let sent = 0;
  for (const post of posts) {
    const photo = post.feedImage ? `${publicBaseUrl().replace(/\/$/, "")}${post.feedImage}` : null;
    const res = photo && chat
      ? await tg.sendPhoto(chat, photo, post.waMessage)
      : chat
        ? await tg.sendMessage(chat, post.waMessage)
        : { dryRun: true, call: `telegram.sendPhoto(post ${post.id})`, ok: true };
    log(`  post ${post.id}: ${res.dryRun ? "[dry-run] " : ""}${res.call}`);
    if (res.ok) sent++;
  }
  return { sent };
}
