import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { env, publicBaseUrl } from "@/lib/env";
import * as tg from "@/services/telegram";
import * as ig from "@/services/instagram";
import * as shopee from "@/services/shopee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRESENT_KEYS = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHANNEL_ID",
  "TELEGRAM_PRIVATE_CHAT_ID",
  "IG_USER_ID",
  "IG_ACCESS_TOKEN",
  "SHOPEE_APP_ID",
  "SHOPEE_SECRET",
  "PUBLIC_BASE_URL",
  "GROUP_INVITE_URL",
] as const;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
  }

  const [igRes, tgRes, shopeeRes] = await Promise.all([
    ig.testConnection(),
    tg.getMe(),
    shopee.testConnection(Date.now()),
  ]);

  let baseUrlOk = false;
  try {
    const res = await fetch(`${publicBaseUrl().replace(/\/$/, "")}/ofertas`);
    baseUrlOk = res.ok;
  } catch {
    baseUrlOk = false;
  }

  const present: Record<string, boolean> = {};
  for (const key of PRESENT_KEYS) present[key] = !!env(key);

  return NextResponse.json({
    ig: {
      ok: igRes.ok,
      dryRun: igRes.dryRun,
      tokenExpiresAt: igRes.tokenExpiresAt ?? null,
      error: igRes.error ?? null,
    },
    tg: { ok: tgRes.ok, dryRun: tgRes.dryRun, error: tgRes.error ?? null },
    shopee: { ok: shopeeRes.ok, dryRun: shopeeRes.dryRun, error: shopeeRes.error ?? null },
    baseUrlOk,
    present,
  });
}
