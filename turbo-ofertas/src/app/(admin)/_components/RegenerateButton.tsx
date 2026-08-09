"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegenerateButton({ postId }: { postId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/posts/${postId}/regenerate-creatives`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "Falha ao regenerar.");
      } else {
        setMsg(`Regenerado (job #${data.jobId ?? 0}).`);
        router.refresh();
      }
    } catch {
      setMsg("Erro de conexão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
      <button className="small accent" onClick={run} disabled={busy}>
        {busy ? "Regenerando..." : "Regenerar"}
      </button>
      {msg && <span className="notice">{msg}</span>}
    </span>
  );
}
