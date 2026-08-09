import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NOTE: kept in sync with SESSION_COOKIE in @/lib/auth. We do NOT import that
// module here because it pulls in node:crypto, which is not available in the
// Edge middleware runtime. Middleware only does a lightweight presence + a
// best-effort (unverified) payload decode for routing decisions. Real signature
// verification and role enforcement happen inside route handlers and pages via
// @/lib/session (Node runtime).
const SESSION_COOKIE = "to_session";

const PAGE_PREFIXES = [
  "/hoje",
  "/produtos",
  "/importar",
  "/links",
  "/regras",
  "/relatorios",
  "/config",
  "/usuarios",
  "/criativos",
  "/publicacoes",
  "/whatsapp",
];

const ADMIN_PAGE_PREFIXES = ["/usuarios", "/config"];

function isMatch(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Best-effort decode of the token payload WITHOUT verifying the signature. */
function decodePayload(
  token: string | undefined,
): { role?: string; exp?: number } | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payloadB64 = token.slice(0, dot);
  try {
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApiAdmin = pathname.startsWith("/api/admin");
  const isProtectedPage = isMatch(pathname, PAGE_PREFIXES);

  if (!isApiAdmin && !isProtectedPage) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const payload = decodePayload(token);
  const authed =
    !!payload &&
    typeof payload.exp === "number" &&
    payload.exp > Date.now() / 1000;

  if (!authed) {
    if (isApiAdmin) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Admin-only areas.
  const isAdminApi =
    pathname.startsWith("/api/admin/users") ||
    pathname.startsWith("/api/admin/config");
  const isAdminPage = isMatch(pathname, ADMIN_PAGE_PREFIXES);

  if ((isAdminApi || isAdminPage) && payload?.role !== "admin") {
    if (isApiAdmin) {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/hoje/:path*",
    "/produtos/:path*",
    "/importar/:path*",
    "/links/:path*",
    "/regras/:path*",
    "/relatorios/:path*",
    "/config/:path*",
    "/usuarios/:path*",
    "/criativos/:path*",
    "/publicacoes/:path*",
    "/whatsapp/:path*",
    "/api/admin/:path*",
  ],
};
