import type { PrismaClient } from "@prisma/client";
import { loadEvaluated, toCoreRule } from "../services/selection.js";
import { select } from "../core/select.js";
import { pickHook } from "../core/hooks.js";
import { buildWaMessage, buildTgMessage, buildIgCaption } from "../core/texts.js";
import type { CoreProduct, Evaluated } from "../core/types.js";
import { truncDay, daysAgo } from "../lib/dates.js";
import { publicBaseUrl, groupInviteUrl } from "../lib/env.js";
import { REPUBLISH_COOLDOWN_DAYS } from "../core/constants.js";
import type { JobLogger } from "../lib/log.js";

async function getRule(prisma: PrismaClient) {
  const r = await prisma.rule.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  return r;
}

function linkFor(product: CoreProduct, channel: string): string {
  const order = [channel, "site", "grp", "cnl", "ig"];
  for (const c of order) {
    const l = product.links.find((x) => x.channel === c && x.url);
    if (l) return l.url;
  }
  return product.productUrl ?? "";
}

/**
 * 06:00 job (§9): run the day's selection, persist Posts with the chosen hook and
 * the WhatsApp/Telegram/IG copy, and enqueue creative generation. Idempotent:
 * if Posts already exist for the day it does nothing.
 */
export async function selectDaily(
  prisma: PrismaClient,
  opts: { date?: Date; log?: JobLogger; reset?: boolean } = {},
) {
  const day = truncDay(opts.date ?? new Date());
  const log = opts.log?.log ?? (() => {});

  // Reset: limpa os posts do dia (e seus cliques) para re-selecionar do zero —
  // útil após importar produtos novos, quando já havia posts do dia.
  if (opts.reset) {
    const todays = await prisma.post.findMany({ where: { date: day }, select: { id: true } });
    const ids = todays.map((p) => p.id);
    if (ids.length > 0) {
      await prisma.clickEvent.deleteMany({ where: { postId: { in: ids } } });
      await prisma.post.deleteMany({ where: { id: { in: ids } } });
      log(`reset: ${ids.length} post(s) do dia removidos`);
    }
  }

  const existing = await prisma.post.count({ where: { date: day } });
  if (existing > 0) {
    log(`selectDaily: ${existing} posts já existem para ${day.toISOString().slice(0, 10)} — nada a fazer (idempotente)`);
    return { created: 0, postIds: [] as number[] };
  }

  const rule = toCoreRule(await getRule(prisma));
  const evaluated = await loadEvaluated(prisma, rule);
  const byId = new Map<string, Evaluated>(evaluated.map((e) => [e.product.id, e]));

  const cutoff = daysAgo(REPUBLISH_COOLDOWN_DAYS);
  const recentPosts = await prisma.post.findMany({ where: { date: { gt: cutoff } }, select: { productId: true } });
  const recentlyPublishedProductIds = new Set(recentPosts.map((p) => p.productId));

  const { slots } = select(evaluated, rule, { recentlyPublishedProductIds });
  log(`selectDaily: ${slots.length} vaga(s) selecionada(s)`);

  const base = publicBaseUrl();
  const invite = groupInviteUrl();
  const postIds: number[] = [];

  for (const slot of slots) {
    const ev = byId.get(slot.product.id)!;
    const product = ev.product;

    // Create first to get an id (rotation seed = postId, §5.6).
    const post = await prisma.post.create({
      data: { productId: product.id, date: day, slot: slot.slot, hook: "", caption: "", waMessage: "", tgMessage: "", floorCertified: ev.result.floorCertified },
    });

    const { hook, unitLine } = pickHook(product, ev.hist, post.id, rule, { certifiedFloor: ev.result.floorCertified });
    const waMessage = buildWaMessage(product, linkFor(product, "grp"), {
      postId: post.id, channel: "grp", hook, unitLine, publicBaseUrl: base, groupInviteUrl: invite,
    });
    const tgMessage = buildTgMessage(product, linkFor(product, "cnl"), {
      postId: post.id, channel: "cnl", hook, unitLine, publicBaseUrl: base, groupInviteUrl: invite,
    });
    const caption = buildIgCaption(product, { hook });

    await prisma.post.update({ where: { id: post.id }, data: { hook, caption, waMessage, tgMessage } });
    postIds.push(post.id);
    log(`  vaga ${slot.slot} [${slot.band}] ${product.id} — "${hook.slice(0, 40)}"`);
  }

  // Enqueue creatives (idempotent per day).
  if (postIds.length > 0) {
    await prisma.job.upsert({
      where: { type_runDate: { type: "makeCreatives", runDate: day } },
      create: { type: "makeCreatives", runDate: day, status: "pending", payload: JSON.stringify({ postIds }) },
      update: { status: "pending", payload: JSON.stringify({ postIds }) },
    });
  }

  return { created: postIds.length, postIds };
}
