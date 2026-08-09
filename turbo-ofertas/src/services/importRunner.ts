import ExcelJS from "exceljs";
import type { PrismaClient } from "@prisma/client";
import { COLUMNS, validateRow, type RawRow, type RowResult } from "./importer.js";
import { truncDay } from "../lib/dates.js";

export interface ImportSummary {
  imported: number;
  updated: number;
  rejected: { row: number; reasons: string[] }[];
  warnings: { row: number; warnings: string[] }[];
}

const SHEET_NAME = "PRODUTOS";

/** Read the PRODUTOS sheet into raw string rows keyed by column name. */
export async function parseSheet(buffer: Buffer): Promise<RawRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.getWorksheet(SHEET_NAME) ?? wb.worksheets[0];
  if (!ws) throw new Error(`Aba "${SHEET_NAME}" não encontrada`);

  // Map header row -> column index.
  const header = ws.getRow(1);
  const colIndex = new Map<string, number>();
  header.eachCell((cell, col) => {
    const name = String(cell.value ?? "").trim().toLowerCase();
    if (name) colIndex.set(name, col);
  });

  const rows: RawRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const raw: RawRow = {};
    let hasAny = false;
    for (const col of COLUMNS) {
      const idx = colIndex.get(col);
      const val = idx ? cellText(row.getCell(idx).value) : "";
      raw[col] = val;
      if (val) hasAny = true;
    }
    if (hasAny) rows.push(raw);
  }
  return rows;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    // rich text / formula results / hyperlinks
    const anyVal = value as { text?: string; result?: unknown; hyperlink?: string };
    if (typeof anyVal.text === "string") return anyVal.text.trim();
    if (anyVal.result != null) return String(anyVal.result).trim();
    if (typeof anyVal.hyperlink === "string") return anyVal.hyperlink.trim();
  }
  return String(value).trim();
}

/**
 * Import a workbook: validate every row (never aborting the batch on one bad
 * row, R6), then upsert Product / PricePoint / AffiliateLink. Reimport is
 * idempotent thanks to the @@unique([productId, date]) constraint.
 */
export async function runImport(
  prisma: PrismaClient,
  buffer: Buffer,
): Promise<ImportSummary> {
  const raws = await parseSheet(buffer);
  const summary: ImportSummary = { imported: 0, updated: 0, rejected: [], warnings: [] };

  for (let i = 0; i < raws.length; i++) {
    const rowNo = i + 2; // sheet row (header is row 1)
    let result: RowResult;
    try {
      result = validateRow(raws[i]);
    } catch (e) {
      summary.rejected.push({ row: rowNo, reasons: [`ERRO_LINHA: ${(e as Error).message}`] });
      continue;
    }
    if (result.skipped) continue;
    if (!result.ok || !result.product) {
      summary.rejected.push({ row: rowNo, reasons: result.reasons });
      continue;
    }
    if (result.warnings.length) summary.warnings.push({ row: rowNo, warnings: result.warnings });

    const p = result.product;
    const existing = await prisma.product.findUnique({ where: { id: p.id } });

    await prisma.product.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        source: p.source,
        title: p.title,
        productUrl: p.productUrl,
        imageUrl: p.imageUrl,
        videoUrl: p.videoUrl,
        currentPrice: p.currentPrice.toString(),
        anchorPrice: p.anchorPrice ? p.anchorPrice.toString() : null,
        priceNote: p.priceNote,
        commissionPct: p.commissionPct.toString(),
        coupon: p.coupon,
        couponHowTo: p.couponHowTo,
        shippingNote: p.shippingNote,
        urgency: p.urgency,
        comment: p.comment,
        reviews: p.reviews,
        rating: p.rating.toString(),
        sellerRep: p.sellerRep,
        sellerName: p.sellerName,
      },
      update: {
        source: p.source,
        title: p.title,
        productUrl: p.productUrl,
        imageUrl: p.imageUrl,
        videoUrl: p.videoUrl,
        currentPrice: p.currentPrice.toString(),
        anchorPrice: p.anchorPrice ? p.anchorPrice.toString() : null,
        priceNote: p.priceNote,
        commissionPct: p.commissionPct.toString(),
        coupon: p.coupon,
        couponHowTo: p.couponHowTo,
        shippingNote: p.shippingNote,
        urgency: p.urgency,
        comment: p.comment,
        reviews: p.reviews,
        rating: p.rating.toString(),
        sellerRep: p.sellerRep,
        sellerName: p.sellerName,
      },
    });

    // PricePoint upsert — idempotent per (productId, day).
    const day = truncDay(p.collectedAt);
    await prisma.pricePoint.upsert({
      where: { productId_date: { productId: p.id, date: day } },
      create: { productId: p.id, date: day, price: p.currentPrice.toString() },
      update: { price: p.currentPrice.toString() },
    });

    // AffiliateLinks upsert per channel.
    for (const l of p.links) {
      await prisma.affiliateLink.upsert({
        where: { productId_channel: { productId: p.id, channel: l.channel } },
        create: { productId: p.id, channel: l.channel, url: l.url },
        update: { url: l.url },
      });
    }

    if (existing) summary.updated++;
    else summary.imported++;
  }

  return summary;
}

/** Build the template workbook (§ protocol §7). Returns an xlsx Buffer. */
export async function buildTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Turbo Ofertas";
  const ws = wb.addWorksheet("PRODUTOS");
  ws.addRow([...COLUMNS]);
  ws.getRow(1).font = { bold: true };

  // Example row (ignored on import: id MLB1234567890 + EXEMPLO in title).
  ws.addRow([
    "ml",
    "MLB1234567890",
    "EXEMPLO — Fone Bluetooth XYZ (esta linha é ignorada)",
    "https://www.mercadolivre.com.br/p/MLB1234567890",
    "https://http2.mlstatic.com/exemplo.jpg",
    "",
    "149,90",
    "199,90",
    "via Pix",
    "12",
    "TURBO10",
    "resgate o cupom antes de finalizar",
    "Frete grátis",
    "",
    "",
    "1200",
    "4.8",
    "verde",
    "Loja Oficial XYZ",
    "https://mercadolivre.com.br/sec/grp",
    "https://mercadolivre.com.br/sec/cnl",
    "",
    "2024-06-01",
    "=G2*J2/100",
  ]);

  for (let c = 1; c <= COLUMNS.length; c++) ws.getColumn(c).width = 18;

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
