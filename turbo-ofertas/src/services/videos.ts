import { mkdir, writeFile, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

import { mediaDir } from "../lib/env.js";
const VIDEOS_DIR = () => path.join(mediaDir(), "videos");
const DOWNLOAD_TIMEOUT_MS = 20_000;
const FFMPEG_TIMEOUT_MS = 120_000;
const MAX_BUFFER = 64 * 1024 * 1024;
/** ink (#15181B) as the ffmpeg pad color. */
const PAD_COLOR = "0x15181B";

export interface VideoResult {
  ok: boolean;
  /** public path, e.g. /vid/products/{id}.mp4 */
  videoLocal?: string;
  error?: string;
}

async function ffmpegPath(): Promise<string> {
  const mod = await import("ffmpeg-static");
  const p = (mod.default ?? (mod as unknown as string)) as string | null;
  if (!p) throw new Error("ffmpeg-static: binário não encontrado");
  return p;
}

async function downloadTo(url: string, dest: string): Promise<void> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
  } finally {
    clearTimeout(t);
  }
}

/** Escape a string for use inside an ffmpeg drawtext text= value. */
function escapeDrawText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%");
}

/**
 * §7.5 — Normalize a product ad video to a 1080×1920 vertical clip:
 * center + pad (ink), cap at 30s, H.264 + AAC, reasonable size. Optionally burn
 * the price label onto the lower area (best-effort). NEVER throws — any failure
 * (download, ffmpeg, timeout) returns {ok:false, error}; fallback is the caller's job.
 */
export async function processProductVideo(
  id: string,
  videoUrl: string,
  opts: { priceLabel?: string },
): Promise<VideoResult> {
  let tmpInput: string | null = null;
  try {
    const bin = await ffmpegPath();

    let input: string;
    const lower = videoUrl.toLowerCase();
    if (lower.endsWith(".m3u8")) {
      // Stream: hand the URL straight to ffmpeg.
      input = videoUrl;
    } else {
      // Treat everything else (incl. .mp4) as a file to download first.
      tmpInput = path.join(os.tmpdir(), `turbo-vid-${id}-${Date.now()}.mp4`);
      await downloadTo(videoUrl, tmpInput);
      input = tmpInput;
    }

    const vdir = VIDEOS_DIR();
    await mkdir(vdir, { recursive: true });
    const outPath = path.join(vdir, `${id}.mp4`);

    // scale to fit within 1080x1920, then pad to exact 1080x1920 centered.
    const baseFilter =
      "scale=1080:1920:force_original_aspect_ratio=decrease," +
      `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR}`;

    const drawtext = opts.priceLabel
      ? `,drawtext=text='${escapeDrawText(opts.priceLabel)}':` +
        "fontcolor=white:fontsize=64:box=1:boxcolor=0x15181B@0.6:boxborderw=24:" +
        "x=(w-text_w)/2:y=h-360"
      : "";

    function args(withText: boolean): string[] {
      return [
        "-y",
        "-i",
        input,
        "-t",
        "30",
        "-vf",
        baseFilter + (withText ? drawtext : ""),
        "-c:v",
        "libx264",
        "-crf",
        "28",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outPath,
      ];
    }

    try {
      await execFileAsync(bin, args(!!opts.priceLabel), {
        timeout: FFMPEG_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER,
      });
    } catch (e) {
      // drawtext (font) may be unavailable; retry without the text overlay but
      // still produce the normalized video.
      if (opts.priceLabel) {
        await execFileAsync(bin, args(false), {
          timeout: FFMPEG_TIMEOUT_MS,
          maxBuffer: MAX_BUFFER,
        });
      } else {
        throw e;
      }
    }

    return { ok: true, videoLocal: `/vid/${id}.mp4` };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "falha desconhecida" };
  } finally {
    if (tmpInput) {
      try {
        await unlink(tmpInput);
      } catch {
        /* best-effort cleanup */
      }
    }
  }
}
