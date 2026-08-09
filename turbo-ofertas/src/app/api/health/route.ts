import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness probe that does NOT touch the database — the platform health check
 * points here so the deploy goes live as soon as the server binds, independent
 * of DB/seed state (which is handled at start/preDeploy).
 */
export function GET() {
  return NextResponse.json({ ok: true });
}
