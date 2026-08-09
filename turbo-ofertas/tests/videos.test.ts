import { describe, it, expect } from "vitest";
import { processProductVideo } from "../src/services/videos.js";

describe("processProductVideo (§7.5 fallback contract)", () => {
  it("returns {ok:false} without throwing for an unreachable video URL", async () => {
    // Unreachable host -> fetch fails fast; must resolve to ok:false, never throw.
    const res = await processProductVideo(
      "x",
      "https://invalid.example/none.mp4",
      {},
    );
    expect(res.ok).toBe(false);
    expect(typeof res.error).toBe("string");
    expect(res.videoLocal).toBeUndefined();
  }, 25_000);
});
