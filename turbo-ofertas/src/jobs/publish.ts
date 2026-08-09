import type { PrismaClient } from "@prisma/client";
import { truncDay } from "../lib/dates.js";
import { publicBaseUrl } from "../lib/env.js";
import * as tg from "../services/telegram.js";
import * as ig from "../services/instagram.js";
import type { JobLogger } from "../lib/log.js";

function creativeUrl(post: { feedImage: string | null; storyImage: string | null }, kind: "feed" | "story") {
  const rel = kind === "feed" ? post.feedImage : post.storyImage;
  if (!rel) return null;
  return `${publicBaseUrl().replace(/\/$/, "")}${rel}`;
}

/** Publish a single day's post N to the Telegram channel (§8.2). */
export async function publishTg(
  prisma: PrismaClient,
  opts: { slot?: number; date?: Date; log?: JobLogger } = {},
) {
  const log = opts.log?.log ?? (() => {});
  const day = truncDay(opts.date ?? new Date());
  const posts = await prisma.post.findMany({
    where: { date: day, ...(opts.slot ? { slot: opts.slot } : {}) },
    orderBy: { slot: "asc" },
  });
  const chat = tg.channelId();
  let sent = 0;
  for (const post of posts) {
    if (post.tgSent) { log(`  post ${post.id}: já enviado`); continue; }
    if (!chat && !tg.getMe) { /* noop */ }
    const caption = tg.capCaption(post.tgMessage);
    const photo = creativeUrl(post, "feed");
    const res = photo && chat
      ? await tg.sendPhoto(chat, photo, caption)
      : await tg.sendMessage(chat ?? "", caption);
    log(`  post ${post.id}: ${res.dryRun ? "[dry-run] " : ""}${res.call}${res.error ? " ERRO: " + res.error : ""}`);
    if (res.ok && !res.dryRun) {
      await prisma.post.update({ where: { id: post.id }, data: { tgSent: true } });
      sent++;
    }
  }
  return { sent, dryRun: !chat || (await tg.getMe()).dryRun };
}

/** Publish IG feed and/or story for the day's post N (§8.1). */
export async function publishIg(
  prisma: PrismaClient,
  opts: { slot?: number; kinds?: ("feed" | "story")[]; date?: Date; log?: JobLogger } = {},
) {
  const log = opts.log?.log ?? (() => {});
  const day = truncDay(opts.date ?? new Date());
  const kinds = opts.kinds ?? ["feed", "story"];
  const posts = await prisma.post.findMany({
    where: { date: day, ...(opts.slot ? { slot: opts.slot } : {}) },
    orderBy: { slot: "asc" },
  });
  let published = 0;
  for (const post of posts) {
    for (const kind of kinds) {
      const already = kind === "feed" ? post.igFeedId : post.igStoryId;
      if (already) { log(`  post ${post.id} ${kind}: já publicado`); continue; }
      const res = await ig.publish(post.id, kind, post.caption);
      log(`  post ${post.id} ${kind}: ${res.dryRun ? "[dry-run] " : ""}${res.call}${res.error ? " ERRO: " + res.error : ""}`);
      if (res.ok && !res.dryRun && res.id) {
        await prisma.post.update({
          where: { id: post.id },
          data: kind === "feed" ? { igFeedId: res.id } : { igStoryId: res.id },
        });
        published++;
      }
    }
  }
  return { published };
}
