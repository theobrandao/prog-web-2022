import { readFile } from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import Decimal from "decimal.js";
import { colors, fonts, HANDLE, SELO } from "../theme.js";
import { formatBRL } from "../core/format.js";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const CREATIVES_DIR = path.join(process.cwd(), "public", "img", "creatives");

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

/** Minimal hyperscript so we can build satori vnodes without JSX in a .ts file. */
type Style = Record<string, unknown>;
type Node = { type: string; props: { style?: Style; children?: unknown } };
function el(type: string, style: Style, children?: unknown): Node {
  return { type, props: { style, children } };
}

export interface CreativeInput {
  title: string;
  currentPrice: Decimal;
  anchorPrice?: Decimal | null;
  coupon?: string | null;
  /** absolute path to a local product image, or null for the typographic fallback */
  imagePath?: string | null;
}

async function imageDataUri(imagePath: string): Promise<string | null> {
  try {
    const buf = await readFile(imagePath);
    const meta = imagePath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${meta};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function seloBox(): Node {
  return el(
    "div",
    {
      position: "absolute",
      top: 40,
      left: 40,
      backgroundColor: colors.accent,
      color: colors.ink,
      fontFamily: fonts.mono,
      fontSize: 26,
      padding: "12px 18px",
      borderRadius: 6,
      display: "flex",
    },
    SELO,
  );
}

function priceBlock(input: CreativeInput, priceSize: number): Node {
  const children: Node[] = [];
  if (input.anchorPrice) {
    children.push(
      el(
        "div",
        {
          fontFamily: fonts.mono,
          fontSize: 40,
          color: "#9AA1A7",
          textDecoration: "line-through",
          display: "flex",
        },
        `R$ ${formatBRL(input.anchorPrice)}`,
      ),
    );
  }
  children.push(
    el(
      "div",
      { fontFamily: fonts.display, fontSize: priceSize, color: colors.accent, display: "flex", lineHeight: 1 },
      `R$ ${formatBRL(input.currentPrice)}`,
    ),
  );
  return el("div", { display: "flex", flexDirection: "column" }, children);
}

/** §7.1 — Feed 1080×1080. */
export async function renderFeed(input: CreativeInput): Promise<Buffer> {
  const dataUri = input.imagePath ? await imageDataUri(input.imagePath) : null;
  const fontsData = await loadFonts();

  const photoArea = dataUri
    ? el("div", {
        position: "absolute",
        top: 40,
        left: 40,
        width: 1000,
        height: 620,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }, el("img", { src: dataUri, width: 1000, height: 620, style: { objectFit: "contain" } } as unknown as Style))
    : null;

  const bottom = el(
    "div",
    {
      position: "absolute",
      top: 700,
      left: 0,
      width: 1080,
      height: 380,
      backgroundColor: colors.ink,
      display: "flex",
      flexDirection: "column",
      padding: "30px 60px",
    },
    [
      el(
        "div",
        {
          fontFamily: fonts.body,
          fontSize: 34,
          color: colors.paper,
          display: "flex",
          lineHeight: 1.15,
          maxHeight: 90,
          overflow: "hidden",
        },
        input.title,
      ),
      el(
        "div",
        { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 20 },
        [
          priceBlock(input, 110),
          input.coupon
            ? el(
                "div",
                {
                  backgroundColor: colors.accent,
                  color: colors.ink,
                  fontFamily: fonts.mono,
                  fontSize: 30,
                  padding: "8px 16px",
                  borderRadius: 999,
                  display: "flex",
                },
                input.coupon,
              )
            : el("div", { display: "flex" }, ""),
        ],
      ),
      el(
        "div",
        { fontFamily: fonts.mono, fontSize: 26, color: "#9AA1A7", display: "flex", marginTop: 12, justifyContent: "flex-end" },
        HANDLE,
      ),
    ],
  );

  const root = el(
    "div",
    {
      width: 1080,
      height: 1080,
      display: "flex",
      position: "relative",
      backgroundColor: dataUri ? colors.paper : colors.ink,
    },
    [
      photoArea,
      !dataUri
        ? el(
            "div",
            {
              position: "absolute",
              top: 120,
              left: 60,
              width: 960,
              display: "flex",
              justifyContent: "center",
              fontFamily: fonts.display,
              fontSize: 64,
              color: colors.paper,
              textAlign: "center",
            },
            input.title,
          )
        : null,
      seloBox(),
      bottom,
    ].filter(Boolean),
  );

  const svg = await satori(root as unknown as React.ReactNode, {
    width: 1080,
    height: 1080,
    fonts: fontsData,
  });
  return sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();
}

/** §7.2 — Story 1080×1920. Bottom area kept clear for the IG link sticker. */
export async function renderStory(input: CreativeInput): Promise<Buffer> {
  const dataUri = input.imagePath ? await imageDataUri(input.imagePath) : null;
  const fontsData = await loadFonts();

  const root = el(
    "div",
    { width: 1080, height: 1920, display: "flex", position: "relative", backgroundColor: colors.paper },
    [
      el(
        "div",
        {
          position: "absolute",
          top: 0,
          left: 0,
          width: 1080,
          height: 140,
          backgroundColor: colors.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts.mono,
          fontSize: 30,
          color: colors.paper,
        },
        HANDLE,
      ),
      dataUri
        ? el(
            "div",
            { position: "absolute", top: 180, left: 60, width: 960, height: 900, display: "flex", alignItems: "center", justifyContent: "center" },
            el("img", { src: dataUri, width: 960, height: 900, style: { objectFit: "contain" } } as unknown as Style),
          )
        : el(
            "div",
            { position: "absolute", top: 300, left: 60, width: 960, display: "flex", justifyContent: "center", fontFamily: fonts.display, fontSize: 72, color: colors.ink, textAlign: "center" },
            input.title,
          ),
      seloBox(),
      el(
        "div",
        {
          position: "absolute",
          top: 1120,
          left: 0,
          width: 1080,
          height: 360,
          backgroundColor: colors.ink,
          display: "flex",
          flexDirection: "column",
          padding: "36px 60px",
        },
        [
          el("div", { fontFamily: fonts.body, fontSize: 38, color: colors.paper, display: "flex", maxHeight: 100, overflow: "hidden" }, input.title),
          el("div", { marginTop: 20, display: "flex" }, priceBlock(input, 130)),
        ],
      ),
      el(
        "div",
        { position: "absolute", top: 1540, left: 0, width: 1080, display: "flex", flexDirection: "column", alignItems: "center" },
        [
          el("div", { fontFamily: fonts.display, fontSize: 40, color: colors.ink, display: "flex" }, "↓"),
          el("div", { fontFamily: fonts.mono, fontSize: 28, color: colors.ink, display: "flex", marginTop: 8 }, "link aqui"),
        ],
      ),
    ].filter(Boolean),
  );

  const svg = await satori(root as unknown as React.ReactNode, {
    width: 1080,
    height: 1920,
    fonts: fontsData,
  });
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
