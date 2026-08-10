import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { withJob } from "@/jobs/runner";
import { collectMedia } from "@/jobs/collectMedia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Baixa as imagens de todos os produtos sem imagem local. Session-guarded. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const r = await withJob(prisma, "collectMedia", new Date(), (l) => collectMedia(prisma, { log: l }), { force: true });
  return NextResponse.json(r.result ?? { error: "falha ao coletar" });
}
