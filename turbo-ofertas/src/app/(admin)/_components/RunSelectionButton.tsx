"use client";

import { useState } from "react";

export default function RunSelectionButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<"select" | "publish" | null>(null);

  async function run() {
    setLoading("select");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/run/select", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setMsg(`Seleção enfileirada (job #${data.jobId ?? 0}). Pacote enviado ao seu Telegram privado.`);
    } catch {
      setMsg("Falha ao enfileirar seleção.");
    } finally {
      setLoading(null);
    }
  }

  async function publish() {
    setLoading("publish");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/run/publish", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      const tg = data?.tg?.sent ?? 0;
      const dry = data?.tg?.dryRun;
      setMsg(
        dry
          ? "Publicação em dry-run (sem credenciais Telegram configuradas)."
          : `Publicado no canal: ${tg} post(s) enviados.`,
      );
    } catch {
      setMsg("Falha ao publicar no canal.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
      <button className="accent" onClick={run} disabled={loading !== null}>
        {loading === "select" ? "Rodando..." : "Rodar seleção"}
      </button>
      <button onClick={publish} disabled={loading !== null}>
        {loading === "publish" ? "Publicando..." : "Publicar no canal agora"}
      </button>
      {msg && <span className="notice">{msg}</span>}
    </span>
  );
}
