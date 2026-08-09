"use client";

import { useState } from "react";

interface Summary {
  imported: number;
  updated: number;
  rejected: { row: number; reasons: string[] }[];
  warnings: { row: number; warnings: string[] }[];
}

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/import", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Falha ao importar.");
      } else {
        setSummary(data as Summary);
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Importar planilha</h1>
      <div className="card">
        <a className="btn ghost" href="/api/admin/template">
          Baixar template (.xlsx)
        </a>
      </div>

      <form className="card" onSubmit={upload}>
        <label htmlFor="file">Arquivo .xlsx (máx. 5MB)</label>
        <input
          id="file"
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="submit"
          className="accent"
          style={{ marginTop: "1rem" }}
          disabled={!file || loading}
        >
          {loading ? "Importando..." : "Importar"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>

      {summary && (
        <div className="card">
          <h2>Resultado</h2>
          <p>
            Importados: <strong>{summary.imported}</strong> · Atualizados:{" "}
            <strong>{summary.updated}</strong> · Rejeitados:{" "}
            <strong>{summary.rejected.length}</strong>
          </p>

          {summary.rejected.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Motivos</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rejected.map((r) => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td className="reasons">{r.reasons.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {summary.warnings.length > 0 && (
            <div className="table-wrap" style={{ marginTop: "1rem" }}>
              <h3>Avisos</h3>
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Avisos</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.warnings.map((w) => (
                    <tr key={w.row}>
                      <td>{w.row}</td>
                      <td>{w.warnings.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
