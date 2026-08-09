import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runImport } from "@/services/importRunner";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Envio inválido (multipart esperado)" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "Arquivo 'file' não enviado" },
      { status: 400 },
    );
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "Apenas arquivos .xlsx são aceitos" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo excede 5MB" },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const summary = await runImport(prisma, buffer);
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json(
      { error: "Falha ao importar", details: (e as Error).message },
      { status: 400 },
    );
  }
}
