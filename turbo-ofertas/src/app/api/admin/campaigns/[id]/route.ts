import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["planejada", "ativa", "encerrada"];

interface CampaignRow {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  channels: string;
  productIds: string;
  status: string;
  note: string;
  createdAt: Date;
}

function serialize(c: CampaignRow) {
  return {
    id: c.id,
    name: c.name,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate.toISOString(),
    channels: c.channels,
    productIds: c.productIds,
    status: c.status,
    note: c.note,
    createdAt: c.createdAt.toISOString(),
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
    startDate?: string;
    endDate?: string;
    channels?: string;
    productIds?: string;
    status?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.channels === "string") data.channels = body.channels;
  if (typeof body.productIds === "string") data.productIds = body.productIds;
  if (typeof body.note === "string") data.note = body.note;
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (typeof body.startDate === "string") {
    const d = new Date(body.startDate);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "startDate inválido" }, { status: 400 });
    }
    data.startDate = d;
  }
  if (typeof body.endDate === "string") {
    const d = new Date(body.endDate);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "endDate inválido" }, { status: 400 });
    }
    data.endDate = d;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  try {
    const updated = await prisma.campaign.update({
      where: { id: targetId },
      data,
    });
    return NextResponse.json(serialize(updated));
  } catch {
    return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
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
    await prisma.campaign.delete({ where: { id: targetId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
  }
}
