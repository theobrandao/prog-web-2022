import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const postId = parseInt(id, 10);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  let body: { value?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (typeof body.value !== "boolean") {
    return NextResponse.json(
      { error: "Campo 'value' (boolean) é obrigatório" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.post.update({
      where: { id: postId },
      data: { waForwarded: body.value },
    });
    return NextResponse.json({
      id: updated.id,
      slot: updated.slot,
      waForwarded: updated.waForwarded,
    });
  } catch {
    return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
  }
}
