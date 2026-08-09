import { env, dryRun } from "../lib/env.js";
import { redact } from "../lib/log.js";

const API = "https://api.telegram.org";

export interface TgResult {
  ok: boolean;
  dryRun: boolean;
  messageId?: number;
  error?: string;
  /** description of the call, for Job.log */
  call: string;
}

function token(): string | undefined {
  return env("TELEGRAM_BOT_TOKEN");
}

async function call(method: string, body: Record<string, unknown>): Promise<TgResult> {
  const call = `telegram.${method}(${redact(JSON.stringify(body)).slice(0, 300)})`;
  if (dryRun.telegram()) {
    return { ok: true, dryRun: true, call };
  }
  try {
    const res = await fetch(`${API}/bot${token()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok: boolean; result?: { message_id?: number }; description?: string };
    if (!json.ok) return { ok: false, dryRun: false, error: json.description, call };
    return { ok: true, dryRun: false, messageId: json.result?.message_id, call };
  } catch (e) {
    return { ok: false, dryRun: false, error: (e as Error).message, call };
  }
}

/** getMe — connection test for /config. */
export async function getMe(): Promise<TgResult> {
  if (dryRun.telegram()) return { ok: false, dryRun: true, error: "TELEGRAM_BOT_TOKEN ausente", call: "telegram.getMe" };
  try {
    const res = await fetch(`${API}/bot${token()}/getMe`);
    const json = (await res.json()) as { ok: boolean; description?: string };
    return { ok: json.ok, dryRun: false, error: json.description, call: "telegram.getMe" };
  } catch (e) {
    return { ok: false, dryRun: false, error: (e as Error).message, call: "telegram.getMe" };
  }
}

export function sendMessage(chatId: string, text: string) {
  return call("sendMessage", { chat_id: chatId, text, disable_web_page_preview: false });
}

/** photo is a public URL to the creative. caption truncated to 1024 by caller. */
export function sendPhoto(chatId: string, photoUrl: string, caption: string) {
  return call("sendPhoto", { chat_id: chatId, photo: photoUrl, caption });
}

export function sendVideo(chatId: string, videoUrl: string, caption: string) {
  return call("sendVideo", { chat_id: chatId, video: videoUrl, caption });
}

export function channelId(): string | undefined {
  return env("TELEGRAM_CHANNEL_ID");
}
export function privateChatId(): string | undefined {
  return env("TELEGRAM_PRIVATE_CHAT_ID");
}

/** Telegram caption cap is 1024 chars; truncate the TITLE region, never the link (§8.2). */
export function capCaption(msg: string, max = 1024): string {
  if (msg.length <= max) return msg;
  const marker = "Compre aqui:";
  const idx = msg.indexOf(marker);
  if (idx < 0) return msg.slice(0, max);
  const tail = msg.slice(idx); // keep from "Compre aqui:" onward
  const room = max - tail.length - 2;
  if (room <= 0) return tail.slice(0, max);
  return `${msg.slice(0, room).trimEnd()}\n${tail}`;
}
