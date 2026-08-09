"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface LinkItem {
  id: string;
  title: string;
  productUrl: string;
  grp: string;
  cnl: string;
  ig: string;
}

function Row({ item }: { item: LinkItem }) {
  const router = useRouter();
  const [grp, setGrp] = useState(item.grp);
  const [cnl, setCnl] = useState(item.cnl);
  const [ig, setIg] = useState(item.ig);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(item.productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${item.id}/links`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grp, cnl, ig }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Falha ao salvar.");
      } else {
        setMsg("Links salvos.");
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
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ fontSize: "1rem" }}>{item.title}</h3>
        <span className="badge ml">ml</span>
      </div>
      <p className="muted" style={{ fontSize: "0.8rem", margin: "0.25rem 0" }}>
        {item.id}
      </p>
      <div className="row">
        <a
          href={item.productUrl}
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: "underline", fontSize: "0.85rem" }}
        >
          Abrir anúncio
        </a>
        <button type="button" className="ghost small" onClick={copyUrl}>
          {copied ? "Copiado!" : "Copiar URL"}
        </button>
      </div>

      <div className="grid cols-2">
        <div>
          <label htmlFor={`grp-${item.id}`}>Link Grupo (grp)</label>
          <input
            id={`grp-${item.id}`}
            value={grp}
            onChange={(e) => setGrp(e.target.value)}
            placeholder="https://mercadolivre.com.br/..."
          />
        </div>
        <div>
          <label htmlFor={`cnl-${item.id}`}>Link Canal (cnl)</label>
          <input
            id={`cnl-${item.id}`}
            value={cnl}
            onChange={(e) => setCnl(e.target.value)}
            placeholder="https://mercadolivre.com.br/..."
          />
        </div>
        <div>
          <label htmlFor={`ig-${item.id}`}>Link Instagram (ig)</label>
          <input
            id={`ig-${item.id}`}
            value={ig}
            onChange={(e) => setIg(e.target.value)}
            placeholder="https://mercadolivre.com.br/..."
          />
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {msg && <p className="notice">{msg}</p>}

      <button
        type="button"
        className="accent"
        style={{ marginTop: "0.75rem" }}
        onClick={save}
        disabled={busy}
      >
        {busy ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}

export default function LinksEditor({ items }: { items: LinkItem[] }) {
  if (items.length === 0) {
    return <p className="muted">Nenhum produto ML pendente de link.</p>;
  }
  return (
    <div>
      {items.map((item) => (
        <Row key={item.id} item={item} />
      ))}
    </div>
  );
}
