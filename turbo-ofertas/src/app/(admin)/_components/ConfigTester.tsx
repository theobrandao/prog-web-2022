"use client";

import { useCallback, useEffect, useState } from "react";

interface IntegrationStatus {
  ok: boolean;
  dryRun: boolean;
  error?: string | null;
  tokenExpiresAt?: string | null;
}

interface StatusResponse {
  ig: IntegrationStatus;
  tg: IntegrationStatus;
  shopee: IntegrationStatus;
  baseUrlOk: boolean;
  present: Record<string, boolean>;
}

function StatusPill({ s }: { s: IntegrationStatus }) {
  if (s.dryRun) return <span className="badge">dry-run</span>;
  if (s.ok) return <span className="badge accent">ok</span>;
  return <span className="badge" style={{ background: "var(--danger)" }}>erro</span>;
}

function Card({
  title,
  status,
  presentKeys,
  present,
  children,
}: {
  title: string;
  status?: IntegrationStatus;
  presentKeys: string[];
  present?: Record<string, boolean>;
  children?: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ fontSize: "1rem" }}>{title}</h3>
        {status && <StatusPill s={status} />}
      </div>
      {status?.error && <p className="error">{status.error}</p>}
      {status?.tokenExpiresAt && (
        <p className="muted" style={{ fontSize: "0.82rem" }}>
          Token expira em: {status.tokenExpiresAt}
        </p>
      )}
      {children}
      <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem", fontSize: "0.82rem" }}>
        {presentKeys.map((k) => (
          <li key={k}>
            {present?.[k] ? "✓" : "✗"} {k}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ConfigTester() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/config/status");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Falha ao consultar status.");
      } else {
        setData(json as StatusResponse);
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const present = data?.present;

  return (
    <div>
      <div className="row" style={{ marginBottom: "1rem" }}>
        <button className="accent" onClick={load} disabled={loading}>
          {loading ? "Testando..." : "Testar conexões"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="grid cols-2">
        <Card
          title="Instagram"
          status={data?.ig}
          present={present}
          presentKeys={["IG_USER_ID", "IG_ACCESS_TOKEN"]}
        >
          <button className="small ghost" onClick={load} disabled={loading}>
            Testar
          </button>
        </Card>

        <Card
          title="Telegram"
          status={data?.tg}
          present={present}
          presentKeys={[
            "TELEGRAM_BOT_TOKEN",
            "TELEGRAM_CHANNEL_ID",
            "TELEGRAM_PRIVATE_CHAT_ID",
          ]}
        >
          <button className="small ghost" onClick={load} disabled={loading}>
            Testar
          </button>
        </Card>

        <Card
          title="Shopee"
          status={data?.shopee}
          present={present}
          presentKeys={["SHOPEE_APP_ID", "SHOPEE_SECRET"]}
        >
          <button className="small ghost" onClick={load} disabled={loading}>
            Testar
          </button>
        </Card>

        <Card
          title="Base URL"
          present={present}
          presentKeys={["PUBLIC_BASE_URL", "GROUP_INVITE_URL"]}
        >
          <p style={{ margin: "0.25rem 0" }}>
            {data
              ? data.baseUrlOk
                ? "✓ /ofertas acessível"
                : "✗ /ofertas inacessível"
              : "—"}
          </p>
          <button className="small ghost" onClick={load} disabled={loading}>
            Testar
          </button>
        </Card>
      </div>
    </div>
  );
}
