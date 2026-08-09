"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface SettingsValues {
  routeAllViaSite: string;
  handle: string;
  weeklyReportDay: string;
}

export default function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const [routeAllViaSite, setRouteAllViaSite] = useState(
    initial.routeAllViaSite === "true",
  );
  const [handle, setHandle] = useState(initial.handle);
  const [weeklyReportDay, setWeeklyReportDay] = useState(initial.weeklyReportDay);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeAllViaSite: routeAllViaSite ? "true" : "false",
          handle,
          weeklyReportDay,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Falha ao salvar.");
      } else {
        setMsg("Configurações salvas.");
        router.refresh();
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div style={{ marginBottom: "1rem" }}>
        <label className="row" style={{ gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={routeAllViaSite}
            onChange={(e) => setRouteAllViaSite(e.target.checked)}
            style={{ width: "auto" }}
          />
          <span>
            <strong>routeAllViaSite</strong> — rotear todos os links pela página
            /oferta
          </span>
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="handle">handle — @ do perfil</label>
        <input
          id="handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@turbo.ofertas"
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="weeklyReportDay">weeklyReportDay — dia do relatório</label>
        <input
          id="weeklyReportDay"
          value={weeklyReportDay}
          onChange={(e) => setWeeklyReportDay(e.target.value)}
          placeholder="segunda"
        />
      </div>

      {error && <p className="error">{error}</p>}
      {msg && <p className="notice">{msg}</p>}

      <button
        type="button"
        className="accent"
        onClick={save}
        disabled={busy}
      >
        {busy ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}
