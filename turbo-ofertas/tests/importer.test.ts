import { describe, it, expect } from "vitest";
import { validateRow, COLUMNS, type RawRow } from "../src/services/importer.js";

function row(overrides: Partial<RawRow> = {}): RawRow {
  const base: RawRow = {
    fonte: "ml",
    id_item: "MLB123456",
    titulo: "Produto válido com título longo",
    url_produto: "https://mercadolivre.com.br/p/MLB123456",
    url_imagem: "https://http2.mlstatic.com/x.jpg",
    url_video: "",
    preco_atual: "149,90",
    preco_ancora: "199,90",
    condicao_preco: "via Pix",
    comissao_pct: "12",
    cupom: "TURBO10",
    instrucao_cupom: "",
    frete: "",
    urgencia: "",
    comentario: "",
    avaliacoes: "1200",
    nota: "4.8",
    reputacao_vendedor: "verde",
    vendedor: "Loja XYZ",
    link_grp: "https://mercadolivre.com.br/sec/grp",
    link_cnl: "https://mercadolivre.com.br/sec/cnl",
    link_ig: "",
    data_coleta: "2024-06-01",
    comissao_reais: "",
  };
  return { ...base, ...overrides };
}

describe("importer.validateRow", () => {
  it("accepts a well-formed row", () => {
    const r = validateRow(row());
    expect(r.ok).toBe(true);
    expect(r.product?.id).toBe("MLB123456");
    expect(r.product?.anchorPrice?.toString()).toBe("199.9");
    expect(r.product?.links).toHaveLength(2);
  });

  it("rejects tiktok with the R4 message", () => {
    const r = validateRow(row({ fonte: "tiktok" }));
    expect(r.ok).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/TikTok Shop não é suportado \(R4\)/);
  });

  it("skips the template example row", () => {
    const r = validateRow(
      row({ id_item: "MLB1234567890", titulo: "EXEMPLO — não importar" }),
    );
    expect(r.skipped).toBe(true);
    expect(r.ok).toBe(false);
    expect(r.product).toBeUndefined();
  });

  it("rejects invalid id for the source", () => {
    expect(validateRow(row({ id_item: "XYZ" })).reasons.join(" ")).toMatch(/ID_INVALIDO/);
    expect(
      validateRow(row({ fonte: "amazon", id_item: "SHORT" })).reasons.join(" "),
    ).toMatch(/ID_INVALIDO/);
  });

  it("rejects short title, bad url, bad price, bad commission, future/invalid date", () => {
    expect(validateRow(row({ titulo: "curto" })).reasons.join(" ")).toMatch(/TITULO_CURTO/);
    expect(validateRow(row({ url_produto: "ftp://x" })).reasons.join(" ")).toMatch(/URL_INVALIDA/);
    expect(validateRow(row({ preco_atual: "0" })).reasons.join(" ")).toMatch(/PRECO_INVALIDO/);
    expect(validateRow(row({ comissao_pct: "80" })).reasons.join(" ")).toMatch(/COMISSAO_INVALIDA/);
    expect(validateRow(row({ data_coleta: "01/06/2024" })).reasons.join(" ")).toMatch(/DATA_INVALIDA/);
    expect(validateRow(row({ data_coleta: "2999-01-01" })).reasons.join(" ")).toMatch(/futuro/);
  });

  it("anchor <= price is a warning, imports without anchor", () => {
    const r = validateRow(row({ preco_ancora: "100" }));
    expect(r.ok).toBe(true);
    expect(r.product?.anchorPrice).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/ANCORA_MENOR_QUE_PRECO/);
  });

  it("missing reviews/rating defaults to 0 with warnings", () => {
    const r = validateRow(row({ avaliacoes: "", nota: "" }));
    expect(r.ok).toBe(true);
    expect(r.product?.reviews).toBe(0);
    expect(r.product?.rating.toString()).toBe("0");
    expect(r.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it("bad url_video is a warning, product still imports", () => {
    const r = validateRow(row({ url_video: "https://x/video.avi" }));
    expect(r.ok).toBe(true);
    expect(r.product?.videoUrl).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/url_video/);
  });

  it("processing a batch never aborts on one bad row (R6)", () => {
    const batch = [row(), row({ fonte: "tiktok" }), row({ id_item: "MLB999" })];
    const results = batch.map((r) => validateRow(r));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(results.filter((r) => !r.ok && !r.skipped)).toHaveLength(1);
  });

  it("column order matches the spec template", () => {
    expect(COLUMNS[0]).toBe("fonte");
    expect(COLUMNS[COLUMNS.length - 1]).toBe("comissao_reais");
    expect(COLUMNS).toContain("data_coleta");
  });
});
