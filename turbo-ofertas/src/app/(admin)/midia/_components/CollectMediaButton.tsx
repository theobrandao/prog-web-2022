"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CollectMediaButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/media/collect", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(d.error ?? "Falha ao coletar mídias.");
      } else {
        setMsg(
          `Coletadas ${d.images ?? 0} imagem(ns)` +
            (d.failed ? ` — ${d.failed} falha(s)` : "") +
            ` de ${d.scanned ?? 0} sem imagem.`,
        );
        router.refresh();
      }
    } catch {
      setMsg("Falha ao coletar mídias.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="row" style={{ margin: "0.5rem 0 1rem", gap: "0.75rem", alignItems: "center" }}>
      <button className="accent" onClick={run} disabled={loading}>
        {loading ? "Coletando imagens..." : "Coletar mídias agora"}
      </button>
      {msg && <span className="notice">{msg}</span>}
    </div>
  );
}
