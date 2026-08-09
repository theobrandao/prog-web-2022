import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { truncDay } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const day = truncDay(dateParam ?? new Date());

  const posts = await prisma.post.findMany({
    where: { date: day },
    orderBy: { slot: "asc" },
    include: { product: { select: { title: true } } },
  });

  return NextResponse.json({
    date: dateParam ?? day.toISOString().slice(0, 10),
    items: posts.map((p) => ({
      id: p.id,
      slot: p.slot,
      productId: p.productId,
      title: p.product.title,
      feedImage: p.feedImage,
      storyImage: p.storyImage,
      igFeedId: p.igFeedId,
      igStoryId: p.igStoryId,
      tgSent: p.tgSent,
    })),
  });
}
