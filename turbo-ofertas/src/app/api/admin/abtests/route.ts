import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["hook", "creative", "horario"];

interface AbTestRow {
  id: number;
  name: string;
  kind: string;
  variantA: string;
  variantB: string;
  status: string;
  winner: string;
  startDate: Date;
  note: string;
  createdAt: Date;
}

function serialize(t: AbTestRow) {
  return {
    id: t.id,
    name: t.name,
    kind: t.kind,
    variantA: t.variantA,
    variantB: t.variantB,
    status: t.status,
    winner: t.winner,
    startDate: t.startDate.toISOString(),
    note: t.note,
    createdAt: t.createdAt.toISOString(),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const items = await prisma.abTest.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items: items.map(serialize) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: {
    name?: string;
    kind?: string;
    variantA?: string;
    variantB?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Campo 'name' é obrigatório" }, { status: 400 });
  }

  const kind = body.kind && KINDS.includes(body.kind) ? body.kind : "hook";

  const created = await prisma.abTest.create({
    data: {
      name: body.name,
      kind,
      variantA: typeof body.variantA === "string" ? body.variantA : "",
      variantB: typeof body.variantB === "string" ? body.variantB : "",
      note: typeof body.note === "string" ? body.note : "",
    },
  });

  return NextResponse.json(serialize(created), { status: 201 });
}
