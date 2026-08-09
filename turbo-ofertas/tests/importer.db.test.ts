// Integration test against the real sqlite dev DB (created via `prisma db push`).
process.env.DATABASE_URL ||= "file:../data/test.db";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import { runImport } from "../src/services/importRunner.js";
import { COLUMNS } from "../src/services/importer.js";

const prisma = new PrismaClient();
const IDS = ["MLB700001", "MLB700002"];

async function makeWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("PRODUTOS");
  ws.addRow([...COLUMNS]);
  const mk = (id: string, price: string) => {
    const r: Record<string, string> = {
      fonte: "ml",
      id_item: id,
      titulo: `Produto de integração ${id}`,
      url_produto: `https://mercadolivre.com.br/p/${id}`,
      url_imagem: "https://http2.mlstatic.com/x.jpg",
      preco_atual: price,
      comissao_pct: "12",
      avaliacoes: "500",
      nota: "4.7",
      reputacao_vendedor: "verde",
      link_grp: "https://mercadolivre.com.br/sec/grp",
      link_cnl: "https://mercadolivre.com.br/sec/cnl",
      data_coleta: "2024-06-01",
    };
    return COLUMNS.map((c) => r[c] ?? "");
  };
  ws.addRow(mk(IDS[0], "149,90"));
  ws.addRow(mk(IDS[1], "89,90"));
  // one invalid row (tiktok) to prove the batch is not aborted
  const bad = COLUMNS.map((c) => (c === "fonte" ? "tiktok" : c === "id_item" ? "MLB700003" : c === "titulo" ? "Item TikTok proibido" : ""));
  ws.addRow(bad);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

async function cleanup() {
  await prisma.pricePoint.deleteMany({ where: { productId: { in: IDS } } });
  await prisma.affiliateLink.deleteMany({ where: { productId: { in: IDS } } });
  await prisma.product.deleteMany({ where: { id: { in: IDS } } });
}

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("importRunner (DB integration)", () => {
  it("imports valid rows, rejects tiktok, and is idempotent on reimport", async () => {
    const buf = await makeWorkbook();

    const first = await runImport(prisma, buf);
    expect(first.imported).toBe(2);
    expect(first.rejected).toHaveLength(1);
    expect(first.rejected[0].reasons.join(" ")).toMatch(/R4/);

    let points = await prisma.pricePoint.count({ where: { productId: { in: IDS } } });
    expect(points).toBe(2);

    // Reimport the same sheet: no new products, no duplicate price points.
    const second = await runImport(prisma, buf);
    expect(second.updated).toBe(2);
    expect(second.imported).toBe(0);

    points = await prisma.pricePoint.count({ where: { productId: { in: IDS } } });
    expect(points).toBe(2);

    const links = await prisma.affiliateLink.count({ where: { productId: { in: IDS } } });
    expect(links).toBe(4);
  });
});
