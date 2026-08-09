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

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const items = await prisma.campaign.findMany({
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

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Campo 'name' é obrigatório" }, { status: 400 });
  }
  if (!body.startDate || !body.endDate) {
    return NextResponse.json(
      { error: "Campos 'startDate' e 'endDate' são obrigatórios" },
      { status: 400 },
    );
  }

  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Datas inválidas" }, { status: 400 });
  }

  const status =
    body.status && STATUSES.includes(body.status) ? body.status : "planejada";

  const created = await prisma.campaign.create({
    data: {
      name: body.name,
      startDate,
      endDate,
      channels: typeof body.channels === "string" ? body.channels : "",
      productIds: typeof body.productIds === "string" ? body.productIds : "",
      status,
      note: typeof body.note === "string" ? body.note : "",
    },
  });

  return NextResponse.json(serialize(created), { status: 201 });
}
