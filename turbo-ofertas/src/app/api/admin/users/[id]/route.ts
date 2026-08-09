import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  setStatus,
  setRole,
  UserError,
  type Role,
  type UserStatus,
} from "@/services/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: UserStatus[] = ["pendente", "aprovado", "reprovado", "bloqueado"];
const ROLES: Role[] = ["admin", "operador"];

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const targetId = parseInt(id, 10);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let body: { status?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    let updated;
    if (body.status) {
      if (!STATUSES.includes(body.status as UserStatus)) {
        return NextResponse.json({ error: "Status inválido" }, { status: 400 });
      }
      updated = await setStatus(
        prisma,
        session.userId,
        targetId,
        body.status as UserStatus,
      );
    }
    if (body.role) {
      if (!ROLES.includes(body.role as Role)) {
        return NextResponse.json({ error: "Papel inválido" }, { status: 400 });
      }
      updated = await setRole(prisma, session.userId, targetId, body.role as Role);
    }
    if (!updated) {
      return NextResponse.json(
        { error: "Nada para atualizar (informe status ou role)" },
        { status: 400 },
      );
    }
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
    });
  } catch (e) {
    if (e instanceof UserError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.httpStatus },
      );
    }
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
  }
}
