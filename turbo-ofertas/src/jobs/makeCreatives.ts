import path from "node:path";
import { existsSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { makePostCreatives } from "../services/creatives.js";
import { downloadProductImage } from "../services/images.js";
import { truncDay } from "../lib/dates.js";
import type { JobLogger } from "../lib/log.js";

const PRODUCTS_DIR = path.join(process.cwd(), "public", "img", "products");

/** Generate feed + story creatives for the given posts (or all of today's). */
export async function makeCreatives(
  prisma: PrismaClient,
  opts: { postIds?: number[]; date?: Date; log?: JobLogger } = {},
) {
  const log = opts.log?.log ?? (() => {});
  const where = opts.postIds?.length
    ? { id: { in: opts.postIds } }
    : { date: truncDay(opts.date ?? new Date()) };
  const posts = await prisma.post.findMany({ where, include: { product: true } });

  let done = 0;
  for (const post of posts) {
    const p = post.product;

    // Ensure a local product image exists; fall back silently to typographic.
    let imagePath: string | null = null;
    if (p.customImage && existsSync(path.join(process.cwd(), "public", p.customImage.replace(/^\//, "")))) {
      imagePath = path.join(process.cwd(), "public", p.customImage.replace(/^\//, ""));
    } else {
      const local = path.join(PRODUCTS_DIR, `${p.id}.jpg`);
      if (!existsSync(local) && p.imageUrl) {
        const res = await downloadProductImage(p.id, p.imageUrl);
        if (res.ok) {
          await prisma.product.update({ where: { id: p.id }, data: { imageLocal: res.imageLocal } });
          log(`  imagem baixada: ${p.id}`);
        } else {
          log(`  sem imagem local (${p.id}): ${res.error} — criativo tipográfico`);
        }
      }
      if (existsSync(local)) imagePath = local;
    }

    const { feedImage, storyImage } = await makePostCreatives(post.id, {
      title: p.title,
      currentPrice: new Decimal(String(p.currentPrice)),
      anchorPrice: p.anchorPrice != null ? new Decimal(String(p.anchorPrice)) : null,
      coupon: p.coupon,
      imagePath,
    });
    await prisma.post.update({ where: { id: post.id }, data: { feedImage, storyImage } });
    done++;
    log(`  criativos gerados: post ${post.id} (${p.id})`);
  }
  return { generated: done };
}
