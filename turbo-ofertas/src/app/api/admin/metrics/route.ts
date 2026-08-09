import { NextResponse } from "next/server";
import Decimal from "decimal.js";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { truncDay } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: {
    date?: string;
    source?: string;
    channel?: string;
    clicks?: number | string;
    sales?: number | string;
    revenue?: number | string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.date || typeof body.date !== "string") {
    return NextResponse.json({ error: "Campo 'date' é obrigatório" }, { status: 400 });
  }
  if (!body.source || typeof body.source !== "string") {
    return NextResponse.json({ error: "Campo 'source' é obrigatório" }, { status: 400 });
  }
  if (!body.channel || typeof body.channel !== "string") {
    return NextResponse.json({ error: "Campo 'channel' é obrigatório" }, { status: 400 });
  }

  let date: Date;
  try {
    date = truncDay(body.date);
    if (Number.isNaN(date.getTime())) throw new Error("nan");
  } catch {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  const clicks = Math.trunc(Number(body.clicks ?? 0));
  const sales = Math.trunc(Number(body.sales ?? 0));
  if (!Number.isFinite(clicks) || clicks < 0) {
    return NextResponse.json({ error: "clicks inválido" }, { status: 400 });
  }
  if (!Number.isFinite(sales) || sales < 0) {
    return NextResponse.json({ error: "sales inválido" }, { status: 400 });
  }

  let revenue: Decimal;
  try {
    revenue = new Decimal(String(body.revenue ?? "0"));
    if (!revenue.isFinite() || revenue.isNegative()) throw new Error("neg");
  } catch {
    return NextResponse.json({ error: "revenue inválido" }, { status: 400 });
  }

  const entry = await prisma.metricEntry.create({
    data: {
      date,
      source: body.source,
      channel: body.channel,
      clicks,
      sales,
      revenue: revenue.toString(),
    },
  });

  return NextResponse.json({
    id: entry.id,
    date: entry.date.toISOString(),
    source: entry.source,
    channel: entry.channel,
    clicks: entry.clicks,
    sales: entry.sales,
    revenue: String(entry.revenue),
  });
}
