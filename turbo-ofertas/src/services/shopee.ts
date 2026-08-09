import crypto from "node:crypto";
import { env, dryRun } from "../lib/env.js";

const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

/**
 * §8.3 — Signature for the Shopee Affiliate Open API.
 * Header signature = SHA256(AppId + Timestamp + Payload + Secret), hex-encoded.
 * (Exact header format must be confirmed against the panel docs; this is the
 * documented base string, covered by a known-vector test.)
 */
export function sign(appId: string, timestamp: number, payload: string, secret: string): string {
  return crypto
    .createHash("sha256")
    .update(`${appId}${timestamp}${payload}${secret}`)
    .digest("hex");
}

export interface ShopeeResult<T = unknown> {
  ok: boolean;
  dryRun: boolean;
  data?: T;
  error?: string;
  call: string;
}

async function graphql<T>(query: string, timestamp: number): Promise<ShopeeResult<T>> {
  const call = `shopee.graphql(${query.slice(0, 60).replace(/\s+/g, " ")}...)`;
  if (dryRun.shopee()) return { ok: true, dryRun: true, call };
  const appId = env("SHOPEE_APP_ID")!;
  const secret = env("SHOPEE_SECRET")!;
  const payload = JSON.stringify({ query });
  const signature = sign(appId, timestamp, payload, secret);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
      },
      body: payload,
    });
    const json = (await res.json()) as { data?: T; errors?: unknown };
    if (json.errors) return { ok: false, dryRun: false, error: JSON.stringify(json.errors), call };
    return { ok: true, dryRun: false, data: json.data, call };
  } catch (e) {
    return { ok: false, dryRun: false, error: (e as Error).message, call };
  }
}

/** Daily price/commission collection for watchlist Shopee items (fase 6). */
export function productOfferV2(itemIds: string[], timestamp: number) {
  const query = `{ productOfferV2(itemId:[${itemIds.join(",")}]) { nodes { itemId price commissionRate } } }`;
  return graphql(query, timestamp);
}

/** Generate a short link with a subId per channel (fase 6). */
export function generateShortLink(originUrl: string, subId: string, timestamp: number) {
  const query = `mutation { generateShortLink(input:{originUrl:"${originUrl}", subIds:["${subId}"]}) { shortLink } }`;
  return graphql(query, timestamp);
}

/** /config connection test. */
export function testConnection(timestamp: number) {
  return graphql(`{ shopeeOfferV2(limit:1){ nodes { commissionRate } } }`, timestamp);
}
