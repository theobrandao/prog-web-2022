import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { loadEvaluated, toCoreRule } from "@/services/selection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DbRule = {
  id: number;
  minCommissionR: unknown;
  minCommissionPct: unknown;
  minPrice: unknown;
  maxPrice: unknown;
  minReviews: number;
  minRating: unknown;
  highTicket: unknown;
  slotsPerDay: number;
  blocklist: string;
};

function serializeRule(r: DbRule) {
  return {
    id: r.id,
    minCommissionR: String(r.minCommissionR),
    minCommissionPct: String(r.minCommissionPct),
    minPrice: String(r.minPrice),
    maxPrice: String(r.maxPrice),
    minReviews: r.minReviews,
    minRating: String(r.minRating),
    highTicket: String(r.highTicket),
    slotsPerDay: r.slotsPerDay,
    blocklist: r.blocklist,
  };
}

async function getOrCreateRule() {
  const existing = await prisma.rule.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.rule.create({ data: { id: 1 } });
}

async function countEvaluated(rule: DbRule) {
  const evaluated = await loadEvaluated(prisma, toCoreRule(rule));
  const approvedToday = evaluated.filter((e) => e.result.ok).length;
  const rejectedToday = evaluated.filter((e) => !e.result.ok).length;
  return { approvedToday, rejectedToday };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rule = await getOrCreateRule();
  const { approvedToday, rejectedToday } = await countEvaluated(rule);
  return NextResponse.json({
    rule: serializeRule(rule),
    approvedToday,
    rejectedToday,
  });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const num = (v: unknown, fallback: number) => {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : fallback;
  };

  await getOrCreateRule();
  const current = (await prisma.rule.findUnique({ where: { id: 1 } }))!;

  const minPrice = num(body.minPrice, Number(current.minPrice));
  const maxPrice = num(body.maxPrice, Number(current.maxPrice));
  const slotsPerDay = Math.round(num(body.slotsPerDay, current.slotsPerDay));

  if (minPrice >= maxPrice) {
    return NextResponse.json(
      { error: "minPrice deve ser menor que maxPrice" },
      { status: 400 },
    );
  }
  if (slotsPerDay < 1 || slotsPerDay > 5) {
    return NextResponse.json(
      { error: "slotsPerDay deve estar entre 1 e 5" },
      { status: 400 },
    );
  }

  const updated = await prisma.rule.update({
    where: { id: 1 },
    data: {
      minCommissionR: String(num(body.minCommissionR, Number(current.minCommissionR))),
      minCommissionPct: String(num(body.minCommissionPct, Number(current.minCommissionPct))),
      minPrice: String(minPrice),
      maxPrice: String(maxPrice),
      minReviews: Math.round(num(body.minReviews, current.minReviews)),
      minRating: String(num(body.minRating, Number(current.minRating))),
      highTicket: String(num(body.highTicket, Number(current.highTicket))),
      slotsPerDay,
      blocklist:
        typeof body.blocklist === "string" ? body.blocklist : current.blocklist,
    },
  });

  const { approvedToday, rejectedToday } = await countEvaluated(updated);
  return NextResponse.json({
    rule: serializeRule(updated),
    approvedToday,
    rejectedToday,
  });
}
