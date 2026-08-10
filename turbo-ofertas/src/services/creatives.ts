import { readFile } from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import Decimal from "decimal.js";
import { colors, fonts, HANDLE, SELO, CTA_FEED, CTA_STORY } from "../theme.js";
import { formatBRL } from "../core/format.js";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const CREATIVES_DIR = path.join(process.cwd(), "public", "img", "creatives");

/**
 * DESIGN PADRÃO — "canal de ofertas" (foto full-bleed + explosão de preço).
 * Todas as coordenadas ficam aqui, num só lugar, para o agente de criativos
 * aplicar o mesmo template em todos os posts. Ajuste aqui para recalibrar.
 */
const LAYOUT = {
  feed: {
    size: 1080,
    logo: { top: 36, left: 36, box: 96 },          // selo de marca (topo-esquerda)
    selo: { top: 52, right: 36 },                    // "MENOR PREÇO 90 DIAS" (topo-direita)
    burst: { size: 430, top: 452, right: 8, rot: -7 }, // explosão de preço (inferior-direita)
    overlay: { height: 400 },                        // faixa inferior (gradiente)
    titleSize: 40,
    titleMaxWidth: 620,
  },
  story: {
    width: 1080,
    height: 1920,
    logo: { top: 60, left: 48, box: 110 },
    selo: { top: 78, right: 48 },
    burst: { size: 420, top: 700, right: 24, rot: -7 }, // dentro da foto, acima da faixa
    overlay: { top: 1200, height: 540 },             // faixa inferior deixa espaço p/ link sticker
    titleSize: 46,
    titleMaxWidth: 640,
    stickerHint: { top: 1770 },
  },
} as const;

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
let fontCache: { name: string; data: Buffer; weight: FontWeight; style: "normal" }[] | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  const [display, mono, body] = await Promise.all([
    readFile(path.join(FONT_DIR, "Archivo-Bold.ttf")),
    readFile(path.join(FONT_DIR, "IBMPlexMono-SemiBold.ttf")),
    readFile(path.join(FONT_DIR, "IBMPlexSans-Regular.ttf")),
  ]);
  fontCache = [
    { name: fonts.display, data: display, weight: 800, style: "normal" },
    { name: fonts.mono, data: mono, weight: 600, style: "normal" },
    { name: fonts.body, data: body, weight: 400, style: "normal" },
  ];
  return fontCache;
}

const LOGO_PATH = path.join(process.cwd(), "public", "img", "brand", "logo.png");
let logoCache: string | null | undefined;

async function loadLogo(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const buf = await readFile(LOGO_PATH);
    logoCache = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    logoCache = null;
  }
  return logoCache;
}

/** Minimal hyperscript so we can build satori vnodes without JSX in a .ts file. */
type Style = Record<string, unknown>;
type Node = { type: string; props: { style?: Style; children?: unknown } };
function el(type: string, style: Style, children?: unknown): Node {
  return { type, props: { style, children } };
}

/** satori image vnode: src/width/height are PROPS, not style. */
function imgNode(src: string, width: number, height: number, style: Style = {}): unknown {
  return { type: "img", props: { src, width, height, style } };
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Spiky "explosion" star badge as an SVG data URI (yellow fill, dark outline). */
function starburstUri(size: number, spikes = 16): string {
  const cx = size / 2;
  const cy = size / 2;
  const outer = (size / 2) * 0.97;
  const inner = outer * 0.8;
  const pts: string[] = [];
  const total = spikes * 2;
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const ang = (Math.PI / spikes) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`);
  }
  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<polygon points="${pts.join(" ")}" fill="${colors.accent}" stroke="${colors.ink}" stroke-width="7" stroke-linejoin="round"/>` +
      `<polygon points="${pts.join(" ")}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round" transform="scale(0.9) translate(${(size * 0.05).toFixed(1)} ${(size * 0.05).toFixed(1)})"/>` +
      `</svg>`,
  );
}

export interface CreativeInput {
  title: string;
  currentPrice: Decimal;
  anchorPrice?: Decimal | null;
  coupon?: string | null;
  /** absolute path to a local product image, or null for the typographic fallback */
  imagePath?: string | null;
  /** mostra o selo "MENOR PREÇO 90 DIAS" só quando o histórico certifica (default false) */
  certifiedFloor?: boolean;
}

/** Foto processada para preencher EXATAMENTE w×h (cover), com recorte inteligente. */
async function coverDataUri(imagePath: string, w: number, h: number): Promise<string | null> {
  try {
    const src = await readFile(imagePath);
    const out = await sharp(src)
      .resize(w, h, { fit: "cover", position: "attention" })
      .jpeg({ quality: 90 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Produto "contain" centralizado no topo, sobre um fundo desfocado (para story 9:16). */
async function blurContainDataUri(imagePath: string, w: number, h: number): Promise<string | null> {
  try {
    const src = await readFile(imagePath);
    const bg = await sharp(src)
      .resize(w, h, { fit: "cover", position: "attention" })
      .blur(30)
      .modulate({ brightness: 0.72 })
      .toBuffer();
    const prodBuf = await sharp(src)
      .resize(Math.round(w * 0.9), Math.round(h * 0.52), { fit: "inside", withoutEnlargement: false })
      .toBuffer();
    const meta = await sharp(prodBuf).metadata();
    const pw = meta.width ?? Math.round(w * 0.9);
    const left = Math.max(0, Math.round((w - pw) / 2));
    const top = Math.round(h * 0.1);
    const out = await sharp(bg)
      .composite([{ input: prodBuf, top, left }])
      .jpeg({ quality: 88 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

function priceParts(price: Decimal): { intg: string; cents: string } {
  const s = formatBRL(price); // e.g. "2.364,90"
  const [intg, cents = "00"] = s.split(",");
  return { intg, cents };
}

/** Marca (logo em selo branco arredondado). */
function logoBadge(logo: string | null, box: number): Node {
  return el(
    "div",
    {
      backgroundColor: colors.paper,
      borderRadius: 20,
      padding: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
    },
    logo
      ? imgNode(logo, box, box, { borderRadius: 12 })
      : el(
          "div",
          {
            width: box,
            height: box,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: fonts.display,
            fontSize: 22,
            color: colors.ink,
            textAlign: "center",
          },
          "OFERTAS\nTURBO",
        ),
  );
}

/** Selo "MENOR PREÇO 90 DIAS". */
function seloPill(fontSize = 24): Node {
  return el(
    "div",
    {
      backgroundColor: colors.accent,
      color: colors.ink,
      fontFamily: fonts.mono,
      fontSize,
      padding: "10px 18px",
      borderRadius: 999,
      display: "flex",
      boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
    },
    SELO,
  );
}

/** Explosão amarela com o preço, inclinada. */
function priceBurst(input: CreativeInput, size: number, rot: number): Node {
  const { intg, cents } = priceParts(input.currentPrice);
  const len = intg.replace(/\D/g, "").length;
  // Tamanho do número ajustado ao comprimento (evita estourar a explosão).
  const big = len <= 2 ? size * 0.36 : len === 3 ? size * 0.3 : len === 4 ? size * 0.235 : size * 0.19;
  return el(
    "div",
    {
      width: size,
      height: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      transform: `rotate(${rot}deg)`,
    },
    [
      imgNode(starburstUri(size), size, size, { position: "absolute", top: 0, left: 0 }),
      el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: size * 0.72,
          color: colors.ink,
        },
        [
          el(
            "div",
            { fontFamily: fonts.display, fontSize: big * 0.32, display: "flex", lineHeight: 1 },
            "R$",
          ),
          el(
            "div",
            { display: "flex", alignItems: "flex-start", justifyContent: "center" },
            [
              el("div", { fontFamily: fonts.display, fontSize: big, lineHeight: 1, display: "flex" }, intg),
              el(
                "div",
                { fontFamily: fonts.display, fontSize: big * 0.36, marginTop: big * 0.1, marginLeft: 3, display: "flex" },
                cents,
              ),
            ],
          ),
        ],
      ),
    ],
  );
}

/** CTA em pílula amarela com seta. */
function ctaPill(text: string, arrow: "up" | "right"): Node {
  const path =
    arrow === "up"
      ? "M14 3 L14 25 M14 3 L6 12 M14 3 L22 12"
      : "M4 14 L24 14 M24 14 L15 6 M24 14 L15 22";
  const icon = svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="${path}" stroke="${colors.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  );
  return el(
    "div",
    {
      backgroundColor: colors.accent,
      borderRadius: 999,
      padding: "12px 22px",
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    [
      el("div", { fontFamily: fonts.display, fontSize: 30, color: colors.ink, display: "flex" }, text),
      imgNode(icon, 28, 28),
    ],
  );
}

/** Preço "de" riscado + cupom (linha auxiliar da faixa inferior). */
function subline(input: CreativeInput): Node {
  const children: Node[] = [];
  if (input.anchorPrice) {
    children.push(
      el(
        "div",
        {
          fontFamily: fonts.mono,
          fontSize: 30,
          color: "#C9CED2",
          textDecoration: "line-through",
          display: "flex",
        },
        `de R$ ${formatBRL(input.anchorPrice)}`,
      ),
    );
  }
  if (input.coupon) {
    children.push(
      el(
        "div",
        {
          backgroundColor: colors.paper,
          color: colors.ink,
          fontFamily: fonts.mono,
          fontSize: 26,
          padding: "6px 14px",
          borderRadius: 999,
          display: "flex",
        },
        `CUPOM ${input.coupon}`,
      ),
    );
  }
  return el("div", { display: "flex", gap: 16, alignItems: "center", minHeight: 2 }, children);
}

/** §7.1 — Feed 1080×1080 (design padrão canal de ofertas). */
export async function renderFeed(input: CreativeInput): Promise<Buffer> {
  const L = LAYOUT.feed;
  const dataUri = input.imagePath ? await coverDataUri(input.imagePath, L.size, L.size) : null;
  const fontsData = await loadFonts();
  const logo = await loadLogo();

  const bg = dataUri
    ? imgNode(dataUri, L.size, L.size, { position: "absolute", top: 0, left: 0 })
    : el(
        "div",
        {
          position: "absolute",
          top: 160,
          left: 60,
          width: 960,
          display: "flex",
          justifyContent: "center",
          textAlign: "center",
          fontFamily: fonts.display,
          fontSize: 68,
          color: colors.paper,
        },
        input.title,
      );

  const topGradient = el("div", {
    position: "absolute",
    top: 0,
    left: 0,
    width: L.size,
    height: 220,
    display: "flex",
    backgroundImage: "linear-gradient(to bottom, rgba(8,10,12,0.55), rgba(8,10,12,0))",
  });

  const overlay = el(
    "div",
    {
      position: "absolute",
      bottom: 0,
      left: 0,
      width: L.size,
      height: L.overlay.height,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      padding: "0 56px 48px 56px",
      backgroundImage:
        "linear-gradient(to top, rgba(8,10,12,0.96) 0%, rgba(8,10,12,0.85) 52%, rgba(8,10,12,0) 100%)",
    },
    [
      subline(input),
      el(
        "div",
        {
          fontFamily: fonts.display,
          fontSize: L.titleSize,
          color: colors.paper,
          display: "flex",
          lineHeight: 1.12,
          maxWidth: L.titleMaxWidth,
          maxHeight: L.titleSize * 2.4,
          overflow: "hidden",
          marginTop: 14,
        },
        input.title,
      ),
      el(
        "div",
        { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 },
        [
          ctaPill(CTA_FEED, "up"),
          el("div", { fontFamily: fonts.mono, fontSize: 26, color: "#C9CED2", display: "flex" }, HANDLE),
        ],
      ),
    ],
  );

  const root = el(
    "div",
    {
      width: L.size,
      height: L.size,
      display: "flex",
      position: "relative",
      backgroundColor: colors.ink,
    },
    [
      bg,
      topGradient,
      el("div", { position: "absolute", top: L.logo.top, left: L.logo.left, display: "flex" }, logoBadge(logo, L.logo.box)),
      input.certifiedFloor
        ? el("div", { position: "absolute", top: L.selo.top, right: L.selo.right, display: "flex" }, seloPill(24))
        : null,
      el(
        "div",
        { position: "absolute", top: L.burst.top, right: L.burst.right, display: "flex" },
        priceBurst(input, L.burst.size, L.burst.rot),
      ),
      overlay,
    ].filter(Boolean),
  );

  const svg = await satori(root as unknown as React.ReactNode, { width: L.size, height: L.size, fonts: fontsData });
  return sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();
}

/** §7.2 — Story 1080×1920 (mesmo design; base livre p/ o link sticker). */
export async function renderStory(input: CreativeInput): Promise<Buffer> {
  const L = LAYOUT.story;
  const dataUri = input.imagePath ? await blurContainDataUri(input.imagePath, L.width, L.height) : null;
  const fontsData = await loadFonts();
  const logo = await loadLogo();

  const bg = dataUri
    ? imgNode(dataUri, L.width, L.height, { position: "absolute", top: 0, left: 0 })
    : el(
        "div",
        {
          position: "absolute",
          top: 420,
          left: 60,
          width: 960,
          display: "flex",
          justifyContent: "center",
          textAlign: "center",
          fontFamily: fonts.display,
          fontSize: 78,
          color: colors.paper,
        },
        input.title,
      );

  const topGradient = el("div", {
    position: "absolute",
    top: 0,
    left: 0,
    width: L.width,
    height: 300,
    display: "flex",
    backgroundImage: "linear-gradient(to bottom, rgba(8,10,12,0.6), rgba(8,10,12,0))",
  });

  const overlay = el(
    "div",
    {
      position: "absolute",
      top: L.overlay.top,
      left: 0,
      width: L.width,
      height: L.overlay.height,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      padding: "56px 56px 0 56px",
      backgroundImage:
        "linear-gradient(to top, rgba(8,10,12,0.97) 0%, rgba(8,10,12,0.9) 60%, rgba(8,10,12,0) 100%)",
    },
    [
      subline(input),
      el(
        "div",
        {
          fontFamily: fonts.display,
          fontSize: L.titleSize,
          color: colors.paper,
          display: "flex",
          lineHeight: 1.12,
          maxWidth: L.titleMaxWidth,
          maxHeight: L.titleSize * 2.4,
          overflow: "hidden",
          marginTop: 16,
        },
        input.title,
      ),
    ],
  );

  const stickerHint = el(
    "div",
    {
      position: "absolute",
      top: L.stickerHint.top,
      left: 0,
      width: L.width,
      display: "flex",
      justifyContent: "center",
    },
    ctaPill(CTA_STORY, "up"),
  );

  const root = el(
    "div",
    { width: L.width, height: L.height, display: "flex", position: "relative", backgroundColor: colors.ink },
    [
      bg,
      topGradient,
      el("div", { position: "absolute", top: L.logo.top, left: L.logo.left, display: "flex" }, logoBadge(logo, L.logo.box)),
      input.certifiedFloor
        ? el("div", { position: "absolute", top: L.selo.top, right: L.selo.right, display: "flex" }, seloPill(26))
        : null,
      el(
        "div",
        { position: "absolute", top: L.burst.top, right: L.burst.right, display: "flex" },
        priceBurst(input, L.burst.size, L.burst.rot),
      ),
      overlay,
      stickerHint,
    ].filter(Boolean),
  );

  const svg = await satori(root as unknown as React.ReactNode, { width: L.width, height: L.height, fonts: fontsData });
  return sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();
}

/** Render + persist both creatives for a post; returns their public paths. */
export async function makePostCreatives(
  postId: number,
  input: CreativeInput,
): Promise<{ feedImage: string; storyImage: string }> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(CREATIVES_DIR, { recursive: true });
  const feed = await renderFeed(input);
  const story = await renderStory(input);
  await writeFile(path.join(CREATIVES_DIR, `${postId}-feed.png`), feed);
  await writeFile(path.join(CREATIVES_DIR, `${postId}-story.png`), story);
  return {
    feedImage: `/img/creatives/${postId}-feed.png`,
    storyImage: `/img/creatives/${postId}-story.png`,
  };
}
