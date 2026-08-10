import type { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import path from "node:path";
import { downloadProductImage } from "../services/images.js";
import { mediaDir } from "../lib/env.js";
import type { JobLogger } from "../lib/log.js";

const PRODUCTS_DIR = () => path.join(mediaDir(), "products");

/**
 * Coleta as imagens de todos os produtos que ainda não têm imagem local,
 * baixando de `imageUrl`, re-encodando e salvando em /img/products/{id}.jpg.
 * Sequencial (baixa pegada de memória). Falhas por produto não abortam o lote.
 */
export async function collectMedia(
  prisma: PrismaClient,
  opts: { log?: JobLogger } = {},
) {
  const log = opts.log?.log ?? (() => {});
  const products = await prisma.product.findMany({ where: { imageLocal: null } });
  let ok = 0;
  let fail = 0;
  for (const p of products) {
    if (!p.imageUrl) continue;
    // Já existe o arquivo local? só aponta.
    const local = path.join(PRODUCTS_DIR(), `${p.id}.jpg`);
    if (existsSync(local)) {
      await prisma.product.update({ where: { id: p.id }, data: { imageLocal: `/img/products/${p.id}.jpg` } });
      ok++;
      continue;
    }
    const res = await downloadProductImage(p.id, p.imageUrl);
    if (res.ok) {
      await prisma.product.update({ where: { id: p.id }, data: { imageLocal: res.imageLocal } });
      ok++;
      log(`imagem coletada: ${p.id}`);
    } else {
      fail++;
      log(`imagem falhou (${p.id}): ${res.error}`);
    }
  }
  return { images: ok, failed: fail, scanned: products.length };
}
