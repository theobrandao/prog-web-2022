import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["hook", "creative", "horario"];
const STATUSES = ["planejado", "ativo", "encerrado"];
const WINNERS = ["", "A", "B"];

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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const targetId = parseInt(id, 10);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let body: {
    name?: string;
    kind?: string;
    variantA?: string;
    variantB?: string;
    status?: string;
    winner?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.variantA === "string") data.variantA = body.variantA;
  if (typeof body.variantB === "string") data.variantB = body.variantB;
  if (typeof body.note === "string") data.note = body.note;
  if (typeof body.kind === "string") {
    if (!KINDS.includes(body.kind)) {
      return NextResponse.json({ error: "kind inválido" }, { status: 400 });
    }
    data.kind = body.kind;
  }
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (typeof body.winner === "string") {
    if (!WINNERS.includes(body.winner)) {
      return NextResponse.json({ error: "winner inválido" }, { status: 400 });
    }
    data.winner = body.winner;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  try {
    const updated = await prisma.abTest.update({
      where: { id: targetId },
      data,
    });
    return NextResponse.json(serialize(updated));
  } catch {
    return NextResponse.json({ error: "Teste não encontrado" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const targetId = parseInt(id, 10);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    await prisma.abTest.delete({ where: { id: targetId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Teste não encontrado" }, { status: 404 });
  }
}
