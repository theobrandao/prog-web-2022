"use client";

import { useEffect, useState } from "react";

interface RuleForm {
  minCommissionR: string;
  minCommissionPct: string;
  minPrice: string;
  maxPrice: string;
  minReviews: string;
  minRating: string;
  highTicket: string;
  slotsPerDay: string;
  blocklist: string;
  launchMode: boolean;
}

const DEFAULTS: RuleForm = {
  minCommissionR: "5",
  minCommissionPct: "8",
  minPrice: "25",
  maxPrice: "2000",
  minReviews: "50",
  minRating: "4.5",
  highTicket: "300",
  slotsPerDay: "3",
  blocklist: "réplica,replica,similar,inspirado,estilo,genérico",
  launchMode: true,
};

const FIELDS: { key: keyof RuleForm; label: string }[] = [
  { key: "minCommissionR", label: "Comissão mínima (R$)" },
  { key: "minCommissionPct", label: "Comissão mínima (%)" },
  { key: "minPrice", label: "Preço mínimo (R$)" },
  { key: "maxPrice", label: "Preço máximo (R$)" },
  { key: "minReviews", label: "Avaliações mínimas" },
  { key: "minRating", label: "Nota mínima" },
  { key: "highTicket", label: "Limite ticket alto (R$)" },
  { key: "slotsPerDay", label: "Vagas por dia (1-5)" },
];

export default function RegrasPage() {
  const [form, setForm] = useState<RuleForm>(DEFAULTS);
  const [counts, setCounts] = useState<{ approvedToday: number; rejectedToday: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/rules");
        if (res.ok) {
          const data = await res.json();
          const r = data.rule;
          setForm({
            minCommissionR: String(r.minCommissionR),
            minCommissionPct: String(r.minCommissionPct),
            minPrice: String(r.minPrice),
            maxPrice: String(r.maxPrice),
            minReviews: String(r.minReviews),
            minRating: String(r.minRating),
            highTicket: String(r.highTicket),
            slotsPerDay: String(r.slotsPerDay),
            blocklist: r.blocklist,
            launchMode: !!r.launchMode,
          });
          setCounts({ approvedToday: data.approvedToday, rejectedToday: data.rejectedToday });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update(key: keyof RuleForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const payload = {
      minCommissionR: Number(form.minCommissionR),
      minCommissionPct: Number(form.minCommissionPct),
      minPrice: Number(form.minPrice),
      maxPrice: Number(form.maxPrice),
      minReviews: Number(form.minReviews),
      minRating: Number(form.minRating),
      highTicket: Number(form.highTicket),
      slotsPerDay: Number(form.slotsPerDay),
      blocklist: form.blocklist,
      launchMode: form.launchMode,
    };
    const res = await fetch("/api/admin/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Falha ao salvar regras.");
      return;
    }
    setCounts({ approvedToday: data.approvedToday, rejectedToday: data.rejectedToday });
    setNotice(
      `Com estas regras, hoje aprovariam ${data.approvedToday} e seriam barrados ${data.rejectedToday}.`,
    );
  }

  if (loading) return <p className="muted">Carregando...</p>;

  return (
    <div>
      <h1>Regras da casa</h1>

      {counts && !notice && (
        <p className="notice">
          Com estas regras, hoje aprovariam {counts.approvedToday} e seriam
          barrados {counts.rejectedToday}.
        </p>
      )}

      <form className="card" onSubmit={save}>
        <div className="grid cols-2">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key}>{f.label}</label>
              <input
                id={f.key}
                type="number"
                step="any"
                value={String(form[f.key])}
                onChange={(e) => update(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <label htmlFor="blocklist">Blocklist (termos separados por vírgula)</label>
        <textarea
          id="blocklist"
          rows={3}
          value={form.blocklist}
          onChange={(e) => update("blocklist", e.target.value)}
        />

        <div className="card" style={{ marginTop: "1rem", background: "rgba(232,178,26,0.08)" }}>
          <label htmlFor="launchMode" style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
            <input
              id="launchMode"
              type="checkbox"
              checked={form.launchMode}
              onChange={(e) => setForm((f) => ({ ...f, launchMode: e.target.checked }))}
              style={{ width: 20, height: 20 }}
            />
            <strong>Modo Lançamento</strong>
          </label>
          <p className="muted" style={{ marginTop: "0.4rem", marginBottom: 0 }}>
            Publica produtos <strong>sem exigir os 90 dias de histórico</strong> (ideal no começo).
            O selo e o gancho <em>&quot;menor preço 90 dias&quot;</em> só aparecem quando o histórico
            realmente comprova o fundo — então nada de promessa falsa. Desligue quando o histórico
            amadurecer para voltar à regra rígida.
          </p>
        </div>

        {error && <p className="error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}

        <div className="row" style={{ marginTop: "1rem" }}>
          <button type="submit" className="accent">
            Salvar regras
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => setForm(DEFAULTS)}
          >
            Restaurar padrão
          </button>
        </div>
      </form>
    </div>
  );
}
