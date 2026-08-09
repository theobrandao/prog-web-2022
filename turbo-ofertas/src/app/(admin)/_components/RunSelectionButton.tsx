"use client";

import { useState } from "react";

export default function RunSelectionButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/run/select", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setMsg(`Seleção enfileirada (job #${data.jobId ?? 0}).`);
    } catch {
      setMsg("Falha ao enfileirar seleção.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.75rem", alignItems: "center" }}>
      <button className="accent" onClick={run} disabled={loading}>
        {loading ? "Rodando..." : "Rodar seleção"}
      </button>
      {msg && <span className="notice">{msg}</span>}
    </span>
  );
}
