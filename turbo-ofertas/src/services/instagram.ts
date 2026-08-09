import { env, dryRun, publicBaseUrl } from "../lib/env.js";

const GRAPH = "https://graph.facebook.com/v21.0";

export interface IgResult {
  ok: boolean;
  dryRun: boolean;
  id?: string;
  error?: string;
  call: string;
}

function userId() {
  return env("IG_USER_ID");
}
function accessToken() {
  return env("IG_ACCESS_TOKEN");
}

async function graph(pathname: string, params: Record<string, string>, method: "GET" | "POST" = "POST") {
  const url = new URL(`${GRAPH}/${pathname}`);
  const full = { ...params, access_token: accessToken()! };
  let res: Response;
  if (method === "GET") {
    for (const [k, v] of Object.entries(full)) url.searchParams.set(k, v);
    res = await fetch(url);
  } else {
    const form = new URLSearchParams(full);
    res = await fetch(url, { method: "POST", body: form });
  }
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * §8.1 — Publish a feed image: create container, poll until FINISHED, publish.
 * kind "feed" uses the feed creative; "story" uses media_type=STORIES.
 */
export async function publish(
  postId: number,
  kind: "feed" | "story",
  caption: string,
): Promise<IgResult> {
  const image = `${publicBaseUrl().replace(/\/$/, "")}/img/creatives/${postId}-${kind}.png`;
  const call = `instagram.publish(${kind}, ${image})`;
  if (dryRun.instagram()) return { ok: true, dryRun: true, call };

  try {
    const createParams: Record<string, string> =
      kind === "story"
        ? { image_url: image, media_type: "STORIES" }
        : { image_url: image, caption };
    const container = await graph(`${userId()}/media`, createParams);
    const containerId = container.id as string | undefined;
    if (!containerId) return { ok: false, dryRun: false, error: JSON.stringify(container), call };

    // poll up to ~60s
    for (let i = 0; i < 30; i++) {
      const status = await graph(containerId, { fields: "status_code" }, "GET");
      if (status.status_code === "FINISHED") break;
      if (status.status_code === "ERROR") return { ok: false, dryRun: false, error: JSON.stringify(status), call };
      await new Promise((r) => setTimeout(r, 2000));
    }

    const published = await graph(`${userId()}/media_publish`, { creation_id: containerId });
    const id = published.id as string | undefined;
    if (!id) return { ok: false, dryRun: false, error: JSON.stringify(published), call };
    return { ok: true, dryRun: false, id, call };
  } catch (e) {
    return { ok: false, dryRun: false, error: (e as Error).message, call };
  }
}

/** /config connection test: GET /me/accounts and read token expiry. */
export async function testConnection(): Promise<IgResult & { tokenExpiresAt?: string }> {
  if (dryRun.instagram()) return { ok: false, dryRun: true, error: "IG_ACCESS_TOKEN/IG_USER_ID ausentes", call: "instagram.testConnection" };
  try {
    const me = await graph("me/accounts", {}, "GET");
    const ok = !me.error;
    return { ok, dryRun: false, error: ok ? undefined : JSON.stringify(me.error), call: "instagram.testConnection" };
  } catch (e) {
    return { ok: false, dryRun: false, error: (e as Error).message, call: "instagram.testConnection" };
  }
}
