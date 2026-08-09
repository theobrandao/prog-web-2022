"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface CampaignRow {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  channels: string;
  productIds: string;
  status: string;
  note: string;
  createdAt: string;
}

const CHANNELS = ["ig", "tg", "site", "grp", "cnl"];

const NEXT_STATUS: Record<string, string | null> = {
  planejada: "ativa",
  ativa: "encerrada",
  encerrada: null,
};

const NEXT_LABEL: Record<string, string> = {
  planejada: "Ativar",
  ativa: "Encerrar",
};

function statusBadge(status: string): string {
  if (status === "ativa") return "badge ok";
  if (status === "encerrada") return "badge muted";
  return "badge accent";
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function CampanhasClient({
  campaigns,
}: {
  campaigns: CampaignRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  // create form
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  function toggleChannel(c: string) {
    setChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  async function patch(id: number, body: Record<string, string>) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Falha na operação.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: number) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Falha ao excluir.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreateMsg(null);
    setError(null);
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        startDate,
        endDate,
        channels: channels.join(","),
        note,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Falha ao criar campanha.");
      return;
    }
    setCreateMsg(`Campanha "${data.name}" criada.`);
    setName("");
    setStartDate("");
    setEndDate("");
    setChannels([]);
    setNote("");
    router.refresh();
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}

      <h2>Nova campanha</h2>
      <form className="card" onSubmit={create}>
        <div className="grid cols-2">
          <div>
            <label htmlFor="c-name">Nome</label>
            <input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="c-note">Observação</label>
            <input
              id="c-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="c-start">Início</label>
            <input
              id="c-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="c-end">Fim</label>
            <input
              id="c-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <label>Canais</label>
          <div className="row">
            {CHANNELS.map((c) => (
              <label
                key={c}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={channels.includes(c)}
                  onChange={() => toggleChannel(c)}
                  style={{ width: "auto" }}
                />
                {c}
              </label>
            ))}
          </div>
        </div>
        {createMsg && <p className="notice">{createMsg}</p>}
        <button type="submit" className="accent" style={{ marginTop: "1rem" }}>
          Criar campanha
        </button>
      </form>

      <h2 style={{ marginTop: "1.5rem" }}>Campanhas</h2>
      {campaigns.length === 0 ? (
        <p className="muted">Nenhuma campanha cadastrada.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Período</th>
                <th>Canais</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const next = NEXT_STATUS[c.status];
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      {fmtDate(c.startDate)} — {fmtDate(c.endDate)}
                    </td>
                    <td>{c.channels || "—"}</td>
                    <td>
                      <span className={statusBadge(c.status)}>{c.status}</span>
                    </td>
                    <td>
                      <div className="row">
                        {next && (
                          <button
                            className="small accent"
                            disabled={busy === c.id}
                            onClick={() => patch(c.id, { status: next })}
                          >
                            {NEXT_LABEL[c.status]}
                          </button>
                        )}
                        <button
                          className="small danger"
                          disabled={busy === c.id}
                          onClick={() => remove(c.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
