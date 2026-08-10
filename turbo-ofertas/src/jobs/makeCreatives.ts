import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";
import { writeFile, unlink } from "node:fs/promises";
import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { makePostCreatives, renderStoryOverlay } from "../services/creatives.js";
import { downloadProductImage } from "../services/images.js";
import { processProductVideo } from "../services/videos.js";
import { formatBRL } from "../core/format.js";
import { truncDay } from "../lib/dates.js";
import type { JobLogger } from "../lib/log.js";

import { mediaDir } from "../lib/env.js";
const PRODUCTS_DIR = () => path.join(mediaDir(), "products");

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
      const local = path.join(PRODUCTS_DIR(), `${p.id}.jpg`);
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

    const input = {
      title: p.title,
      currentPrice: new Decimal(String(p.currentPrice)),
      anchorPrice: p.anchorPrice != null ? new Decimal(String(p.anchorPrice)) : null,
      coupon: p.coupon,
      imagePath,
      certifiedFloor: post.floorCertified,
    };

    // Criativos estáticos (feed + story).
    const { feedImage, storyImage } = await makePostCreatives(post.id, input);
    await prisma.post.update({ where: { id: post.id }, data: { feedImage, storyImage } });

    // §7.5 — CRIATIVO EM VÍDEO: sobrepõe a identidade (marca + preço) ao vídeo do
    // produto. Pesado de memória/CPU → só com ENABLE_VIDEO=1 (plano >=2GB).
    if (process.env.ENABLE_VIDEO === "1" && p.videoUrl) {
      try {
        const overlayBuf = await renderStoryOverlay(input);
        const overlayPath = path.join(os.tmpdir(), `overlay-${post.id}.png`);
        await writeFile(overlayPath, overlayBuf);
        const res = await processProductVideo(String(post.id), p.videoUrl, {
          overlayPath,
          priceLabel: `R$ ${formatBRL(input.currentPrice)}`,
        });
        await unlink(overlayPath).catch(() => {});
        if (res.ok) {
          await prisma.post.update({ where: { id: post.id }, data: { videoCreative: res.videoLocal } });
          log(`  vídeo-criativo: post ${post.id}`);
        } else {
          log(`  vídeo falhou (post ${post.id}): ${res.error}`);
        }
      } catch (e) {
        log(`  vídeo erro (post ${post.id}): ${(e as Error).message}`);
      }
    }

    done++;
    log(`  criativos gerados: post ${post.id} (${p.id})`);
  }
  return { generated: done };
}
