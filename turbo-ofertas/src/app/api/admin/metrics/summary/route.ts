import { NextResponse } from "next/server";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { truncDay, daysAgo } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Agg {
  clicks: number;
  sales: number;
  revenue: Decimal;
}

function emptyAgg(): Agg {
  return { clicks: 0, sales: 0, revenue: new Decimal(0) };
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const from = fromParam ? truncDay(fromParam) : daysAgo(30);
  const toDay = toParam ? truncDay(toParam) : truncDay(new Date());
  // inclusive upper bound: end of the `to` day
  const toExclusive = new Date(toDay.getTime() + 24 * 60 * 60 * 1000);

  const entries = await prisma.metricEntry.findMany({
    where: { date: { gte: from, lte: toDay } },
  });

  const byChannel: Record<string, Agg> = {};
  const bySource: Record<string, Agg> = {};

  for (const e of entries) {
    const c = (byChannel[e.channel] ??= emptyAgg());
    c.clicks += e.clicks;
    c.sales += e.sales;
    c.revenue = c.revenue.plus(new Decimal(String(e.revenue)));

    const s = (bySource[e.source] ??= emptyAgg());
    s.clicks += e.clicks;
    s.sales += e.sales;
    s.revenue = s.revenue.plus(new Decimal(String(e.revenue)));
  }

  const clickEvents = await prisma.clickEvent.groupBy({
    by: ["src"],
    where: { createdAt: { gte: from, lt: toExclusive } },
    _count: { _all: true },
  });

  function serializeMap(m: Record<string, Agg>) {
    return Object.entries(m).map(([key, a]) => ({
      key,
      clicks: a.clicks,
      sales: a.sales,
      revenue: a.revenue.toString(),
    }));
  }

  return NextResponse.json({
    from: from.toISOString().slice(0, 10),
    to: toDay.toISOString().slice(0, 10),
    byChannel: serializeMap(byChannel),
    bySource: serializeMap(bySource),
    ownClicksBySrc: clickEvents.map((g) => ({
      src: g.src,
      clicks: g._count._all,
    })),
  });
}
