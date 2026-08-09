"use client";

import { useCallback, useEffect, useState } from "react";
import { displayBRL } from "@/lib/money";

interface AggRow {
  key: string;
  clicks: number;
  sales: number;
  revenue: string;
}
interface SrcRow {
  src: string;
  clicks: number;
}
interface Summary {
  from: string;
  to: string;
  byChannel: AggRow[];
  bySource: AggRow[];
  ownClicksBySrc: SrcRow[];
}

function isoToday(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function Bars({ rows }: { rows: AggRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.clicks));
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Cliques</th>
            <th>Vendas</th>
            <th>Receita</th>
            <th style={{ width: "30%" }}>Cliques (relativo)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>{r.key}</td>
              <td>{r.clicks}</td>
              <td>{r.sales}</td>
              <td>{displayBRL(r.revenue)}</td>
              <td>
                <div
                  style={{
                    background: "var(--accent)",
                    height: 12,
                    borderRadius: 4,
                    width: `${(r.clicks / max) * 100}%`,
                    minWidth: r.clicks > 0 ? 4 : 0,
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RelatoriosClient() {
  // manual entry
  const [date, setDate] = useState(isoToday());
  const [source, setSource] = useState("ml");
  const [channel, setChannel] = useState("grp");
  const [clicks, setClicks] = useState("0");
  const [sales, setSales] = useState("0");
  const [revenue, setRevenue] = useState("0");
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // summary window
  const [from, setFrom] = useState(isoToday(-30));
  const [to, setTo] = useState(isoToday());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/metrics/summary?from=${from}&to=${to}`,
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok) setSummary(json as Summary);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormMsg(null);
    setFormError(null);
    const res = await fetch("/api/admin/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        source,
        channel,
        clicks: Number(clicks),
        sales: Number(sales),
        revenue: revenue,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFormError(data.error ?? "Falha ao salvar métrica.");
      return;
    }
    setFormMsg("Métrica registrada.");
    setClicks("0");
    setSales("0");
    setRevenue("0");
    loadSummary();
  }

  return (
    <div>
      <h2>Lançamento manual</h2>
      <form className="card" onSubmit={submit}>
        <div className="grid cols-2">
          <div>
            <label htmlFor="m-date">Data</label>
            <input
              id="m-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="m-source">Origem (source)</label>
            <select
              id="m-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="ml">ml</option>
              <option value="shopee">shopee</option>
              <option value="amazon">amazon</option>
            </select>
          </div>
          <div>
            <label htmlFor="m-channel">Canal (channel)</label>
            <select
              id="m-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="grp">grp</option>
              <option value="cnl">cnl</option>
              <option value="ig">ig</option>
              <option value="site">site</option>
            </select>
          </div>
          <div>
            <label htmlFor="m-clicks">Cliques</label>
            <input
              id="m-clicks"
              type="number"
              min="0"
              value={clicks}
              onChange={(e) => setClicks(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="m-sales">Vendas</label>
            <input
              id="m-sales"
              type="number"
              min="0"
              value={sales}
              onChange={(e) => setSales(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="m-revenue">Receita (R$)</label>
            <input
              id="m-revenue"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>
        {formError && <p className="error">{formError}</p>}
        {formMsg && <p className="notice">{formMsg}</p>}
        <button type="submit" className="accent" style={{ marginTop: "1rem" }}>
          Registrar
        </button>
      </form>

      <h2 style={{ marginTop: "1.5rem" }}>Resumo</h2>
      <div className="row" style={{ marginBottom: "1rem" }}>
        <div>
          <label htmlFor="f-from">De</label>
          <input
            id="f-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="f-to">Até</label>
          <input
            id="f-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button className="ghost" onClick={loadSummary} disabled={loading}>
          {loading ? "Carregando..." : "Atualizar"}
        </button>
      </div>

      {!summary ? (
        <p className="muted">Sem dados.</p>
      ) : (
        <>
          <h3>Por canal</h3>
          {summary.byChannel.length === 0 ? (
            <p className="muted">Nenhum lançamento no período.</p>
          ) : (
            <Bars rows={summary.byChannel} />
          )}

          <h3 style={{ marginTop: "1rem" }}>Por origem</h3>
          {summary.bySource.length === 0 ? (
            <p className="muted">Nenhum lançamento no período.</p>
          ) : (
            <Bars rows={summary.bySource} />
          )}

          <h3 style={{ marginTop: "1rem" }}>Cliques próprios por origem (src)</h3>
          {summary.ownClicksBySrc.length === 0 ? (
            <p className="muted">Nenhum clique registrado.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>src</th>
                    <th>Cliques</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.ownClicksBySrc.map((r) => (
                    <tr key={r.src}>
                      <td>{r.src}</td>
                      <td>{r.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
