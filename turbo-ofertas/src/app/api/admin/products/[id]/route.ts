import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  let body: { active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (typeof body.active !== "boolean") {
    return NextResponse.json(
      { error: "Campo 'active' (boolean) é obrigatório" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: { active: body.active },
    });
    return NextResponse.json({ id: updated.id, active: updated.active });
  } catch {
    return NextResponse.json(
      { error: "Produto não encontrado" },
      { status: 404 },
    );
  }
}
