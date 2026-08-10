"use client";

import { useState } from "react";

export default function RunSelectionButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<"select" | "reset" | "publish" | null>(null);

  async function run(reset = false) {
    setLoading(reset ? "reset" : "select");
    setMsg(null);
    try {
      const url = reset ? "/api/admin/run/select?reset=1" : "/api/admin/run/select";
      const res = await fetch(url, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      const n = data?.selection?.created ?? 0;
      setMsg(
        reset
          ? `Seleção refeita: ${n} vaga(s) para hoje. Criativos em geração.`
          : `Seleção enfileirada (job #${data.jobId ?? 0}). Pacote enviado ao seu Telegram privado.`,
      );
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
      <button className="accent" onClick={() => run(false)} disabled={loading !== null}>
        {loading === "select" ? "Rodando..." : "Rodar seleção"}
      </button>
      <button onClick={() => run(true)} disabled={loading !== null} title="Limpa os posts de hoje e re-seleciona (use após importar produtos novos)">
        {loading === "reset" ? "Refazendo..." : "Refazer seleção do dia"}
      </button>
      <button onClick={publish} disabled={loading !== null}>
        {loading === "publish" ? "Publicando..." : "Publicar no canal agora"}
      </button>
      {msg && <span className="notice">{msg}</span>}
    </span>
  );
}
