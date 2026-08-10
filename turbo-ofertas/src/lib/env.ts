/** Centralized env access + dry-run detection for external integrations. */

import path from "node:path";

export function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

/**
 * Diretório persistente para mídia gerada em runtime (imagens de produto e
 * criativos). NUNCA usar public/ para isso: no Render, public/ é efêmero e some
 * a cada deploy/restart. Em produção aponta para o disco montado (/data/media);
 * localmente cai em .media na raiz do projeto. Servido pelas rotas /img/*.
 */
export function mediaDir(): string {
  return env("MEDIA_DIR") ?? path.join(process.cwd(), ".media");
}


export function publicBaseUrl(): string {
  // Prefer explicit config; otherwise use the URL Render injects automatically,
  // so the app knows its own public address without manual setup.
  return env("PUBLIC_BASE_URL") ?? env("RENDER_EXTERNAL_URL") ?? "http://localhost:3000";
}

export function groupInviteUrl(): string {
  return env("GROUP_INVITE_URL") ?? "";
}

/** An integration runs in dry-run (logs instead of calling) when its secrets are absent. */
export const dryRun = {
  telegram: () => !env("TELEGRAM_BOT_TOKEN"),
  instagram: () => !env("IG_ACCESS_TOKEN") || !env("IG_USER_ID"),
  shopee: () => !env("SHOPEE_APP_ID") || !env("SHOPEE_SECRET"),
};
