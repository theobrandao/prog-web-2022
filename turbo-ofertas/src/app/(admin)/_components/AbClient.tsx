"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AbTestRow {
  id: number;
  name: string;
  kind: string;
  variantA: string;
  variantB: string;
  status: string;
  winner: string;
  startDate: string;
  note: string;
  createdAt: string;
}

const KINDS = ["hook", "creative", "horario"];

const NEXT_STATUS: Record<string, string | null> = {
  planejado: "ativo",
  ativo: "encerrado",
  encerrado: null,
};

const NEXT_LABEL: Record<string, string> = {
  planejado: "Ativar",
  ativo: "Encerrar",
};

function statusBadge(status: string): string {
  if (status === "ativo") return "badge ok";
  if (status === "encerrado") return "badge muted";
  return "badge accent";
}

export default function AbClient({ tests }: { tests: AbTestRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  // create form
  const [name, setName] = useState("");
  const [kind, setKind] = useState("hook");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [note, setNote] = useState("");
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  async function patch(id: number, body: Record<string, string>) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/abtests/${id}`, {
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
      const res = await fetch(`/api/admin/abtests/${id}`, { method: "DELETE" });
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
    const res = await fetch("/api/admin/abtests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind, variantA, variantB, note }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Falha ao criar teste.");
      return;
    }
    setCreateMsg(`Teste "${data.name}" criado.`);
    setName("");
    setKind("hook");
    setVariantA("");
    setVariantB("");
    setNote("");
    router.refresh();
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}

      <h2>Novo teste A/B</h2>
      <form className="card" onSubmit={create}>
        <div className="grid cols-2">
          <div>
            <label htmlFor="a-name">Nome</label>
            <input
              id="a-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="a-kind">Tipo</label>
            <select
              id="a-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="a-va">Variante A</label>
            <input
              id="a-va"
              value={variantA}
              onChange={(e) => setVariantA(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="a-vb">Variante B</label>
            <input
              id="a-vb"
              value={variantB}
              onChange={(e) => setVariantB(e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <label htmlFor="a-note">Observação</label>
          <input
            id="a-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {createMsg && <p className="notice">{createMsg}</p>}
        <button type="submit" className="accent" style={{ marginTop: "1rem" }}>
          Criar teste
        </button>
      </form>

      <h2 style={{ marginTop: "1.5rem" }}>Testes</h2>
      {tests.length === 0 ? (
        <p className="muted">Nenhum teste cadastrado.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>A / B</th>
                <th>Status</th>
                <th>Vencedor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => {
                const next = NEXT_STATUS[t.status];
                return (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{t.kind}</td>
                    <td>
                      {t.variantA || "—"} / {t.variantB || "—"}
                    </td>
                    <td>
                      <span className={statusBadge(t.status)}>{t.status}</span>
                    </td>
                    <td>
                      {t.winner ? (
                        <span className="badge ok">{t.winner}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <div className="row">
                        {next && (
                          <button
                            className="small accent"
                            disabled={busy === t.id}
                            onClick={() => patch(t.id, { status: next })}
                          >
                            {NEXT_LABEL[t.status]}
                          </button>
                        )}
                        <button
                          className="small ghost"
                          disabled={busy === t.id}
                          onClick={() => patch(t.id, { winner: "A" })}
                        >
                          Vence A
                        </button>
                        <button
                          className="small ghost"
                          disabled={busy === t.id}
                          onClick={() => patch(t.id, { winner: "B" })}
                        >
                          Vence B
                        </button>
                        <button
                          className="small danger"
                          disabled={busy === t.id}
                          onClick={() => remove(t.id)}
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
