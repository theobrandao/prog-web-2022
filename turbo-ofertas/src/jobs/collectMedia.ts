import type { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import path from "node:path";
import { downloadProductImage } from "../services/images.js";
import { mediaDir } from "../lib/env.js";
import type { JobLogger } from "../lib/log.js";

const PRODUCTS_DIR = () => path.join(mediaDir(), "products");

/**
 * Coleta as imagens de todos os produtos cujo arquivo local NÃO existe no disco
 * (cobre tanto os sem imageLocal quanto os que perderam o arquivo em restart).
 * Baixa de `imageUrl`, re-encoda e salva em MEDIA_DIR/products/{id}.jpg.
 * Sequencial (baixa pegada de memória). Falhas por produto não abortam o lote.
 */
export async function collectMedia(
  prisma: PrismaClient,
  opts: { log?: JobLogger } = {},
) {
  const log = opts.log?.log ?? (() => {});
  const products = await prisma.product.findMany();
  let ok = 0;
  let fail = 0;
  let scanned = 0;
  let lastError = "";
  const dir = PRODUCTS_DIR();

  for (const p of products) {
    if (!p.imageUrl) continue;
    const local = path.join(dir, `${p.id}.jpg`);

    // Arquivo já existe no disco → só garante o ponteiro no banco.
    if (existsSync(local)) {
      if (p.imageLocal !== `/img/products/${p.id}.jpg`) {
        await prisma.product.update({ where: { id: p.id }, data: { imageLocal: `/img/products/${p.id}.jpg` } });
      }
      continue;
    }

    scanned++;
    const res = await downloadProductImage(p.id, p.imageUrl);
    if (res.ok) {
      await prisma.product.update({ where: { id: p.id }, data: { imageLocal: res.imageLocal } });
      ok++;
      log(`imagem coletada: ${p.id}`);
    } else {
      // Zera o ponteiro quebrado para a UI mostrar "sem imagem" corretamente.
      if (p.imageLocal) await prisma.product.update({ where: { id: p.id }, data: { imageLocal: null } });
      fail++;
      lastError = res.error ?? "erro";
      log(`imagem falhou (${p.id}): ${res.error}`);
    }
  }

  return { images: ok, failed: fail, scanned, lastError };
}
