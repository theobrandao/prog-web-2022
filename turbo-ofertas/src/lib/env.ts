/** Centralized env access + dry-run detection for external integrations. */

export function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export function publicBaseUrl(): string {
  return env("PUBLIC_BASE_URL") ?? "http://localhost:3000";
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
