import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SRC = ["grp", "cnl", "ig", "site", "direct"];

/**
 * §4.9 — Public click tracker. Records a ClickEvent (own per-channel metric)
 * then redirects to the affiliate link. Using a redirect (not just a beacon)
 * guarantees the click is measured even without JS, and swapping the stored
 * link later fixes every message already sent.
 */
export async function GET(req: Request, ctx: { params: Promise<{ postId: string }> }) {
  const { postId } = await ctx.params;
  const id = Number(postId);
  const url = new URL(req.url);
  const srcRaw = url.searchParams.get("src") || "direct";
  const src = VALID_SRC.includes(srcRaw) ? srcRaw : "direct";

  const post = await prisma.post.findUnique({
    where: { id },
    include: { product: { include: { links: true } } },
  });
  if (!post) return NextResponse.json({ error: "Oferta não encontrada" }, { status: 404 });

  // best-effort: never let a tracking failure block the redirect
  try {
    await prisma.clickEvent.create({ data: { postId: id, src } });
  } catch {
    /* ignore */
  }

  const links = post.product.links;
  const dest =
    links.find((l) => l.channel === "site")?.url ||
    links.find((l) => l.channel === "ig")?.url ||
    post.product.productUrl;

  return NextResponse.redirect(dest, 302);
}
