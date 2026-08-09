"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RepublishButton({
  postId,
  kind,
}: {
  postId: number;
  kind: "feed" | "story";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/republish-ig`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "Falha.");
      } else {
        setMsg(`#${data.jobId ?? 0}`);
        router.refresh();
      }
    } catch {
      setMsg("Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
      <button className="small ghost" onClick={run} disabled={busy}>
        {busy ? "..." : `Republicar ${kind}`}
      </button>
      {msg && <span className="notice">{msg}</span>}
    </span>
  );
}
