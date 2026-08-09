import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHANNELS = ["grp", "cnl", "ig", "site"] as const;
type Channel = (typeof CHANNELS)[number];

const ML_DOMAIN = /^https?:\/\/([a-z0-9-]+\.)*(mercadolivre\.com\.br|meli\.la)(\/|$)/i;

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  let body: Partial<Record<Channel, string>>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const isMl = product.source === "ml";
  const updates: { channel: Channel; url: string }[] = [];

  for (const channel of CHANNELS) {
    const url = body[channel];
    if (url == null || url === "") continue;
    if (!isHttpUrl(url)) {
      return NextResponse.json(
        { error: `URL inválida para o canal ${channel}` },
        { status: 400 },
      );
    }
    if (isMl && !ML_DOMAIN.test(url)) {
      return NextResponse.json(
        {
          error: `Links de Mercado Livre devem usar mercadolivre.com.br ou meli.la (canal ${channel})`,
        },
        { status: 400 },
      );
    }
    updates.push({ channel, url });
  }

  for (const u of updates) {
    await prisma.affiliateLink.upsert({
      where: { productId_channel: { productId: id, channel: u.channel } },
      create: { productId: id, channel: u.channel, url: u.url },
      update: { url: u.url },
    });
  }

  const links = await prisma.affiliateLink.findMany({ where: { productId: id } });
  return NextResponse.json({
    id,
    links: links.map((l) => ({ channel: l.channel, url: l.url })),
  });
}
