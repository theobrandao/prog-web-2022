/**
 * Next.js instrumentation — runs once at server boot. Arms the in-process
 * scheduler by hitting the internal /api/cron/ensure route with an in-memory
 * token. Keeps ZERO heavy/node-only imports here so the edge bundle stays clean
 * (the job graph is imported only inside the nodejs API route, never here).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const g = globalThis as typeof globalThis & { __cronToken?: string };
    g.__cronToken = globalThis.crypto.randomUUID();
    const port = process.env.PORT || "3000";
    const url = `http://127.0.0.1:${port}/api/cron/ensure?t=${g.__cronToken}`;
    // Retry a few times while the HTTP listener comes up.
    let tries = 0;
    const arm = () => {
      tries++;
      fetch(url)
        .then((r) => {
          if (!r.ok && tries < 5) setTimeout(arm, 3000);
        })
        .catch(() => {
          if (tries < 5) setTimeout(arm, 3000);
        });
    };
    setTimeout(arm, 4000);
  } catch {
    /* never block boot */
  }
}
