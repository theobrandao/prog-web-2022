import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { registerPending, UserError } from "@/services/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name, email, password } = body;
  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Nome, e-mail e senha são obrigatórios" },
      { status: 400 },
    );
  }

  try {
    await registerPending(prisma, { name, email, password });
    return NextResponse.json({ status: "pendente" }, { status: 201 });
  } catch (e) {
    if (e instanceof UserError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.httpStatus },
      );
    }
    return NextResponse.json({ error: "Erro ao registrar" }, { status: 500 });
  }
}
