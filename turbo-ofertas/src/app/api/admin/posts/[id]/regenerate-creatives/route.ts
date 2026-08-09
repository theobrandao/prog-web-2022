import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { withJob } from "@/jobs/runner";
import { makeCreatives } from "@/jobs/makeCreatives";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
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

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
  }

  const res = await withJob(
    prisma,
    `regenCreatives-${postId}`,
    new Date(),
    (l) => makeCreatives(prisma, { postIds: [postId], log: l }),
    { force: true },
  );

  return NextResponse.json({ jobId: res.jobId });
}
