import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createUserByAdmin, UserError, type Role } from "@/services/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const users = await prisma.user.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      approvedAt: true,
    },
  });

  return NextResponse.json({ items: users });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  let body: { name?: string; email?: string; password?: string; role?: Role };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name, email, password } = body;
  const role: Role = body.role === "admin" ? "admin" : "operador";
  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Nome, e-mail e senha são obrigatórios" },
      { status: 400 },
    );
  }

  try {
    const user = await createUserByAdmin(prisma, session.userId, {
      name,
      email,
      password,
      role,
    });
    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof UserError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.httpStatus },
      );
    }
    return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 });
  }
}
