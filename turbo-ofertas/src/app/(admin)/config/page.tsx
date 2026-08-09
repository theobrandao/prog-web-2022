import { requireAdmin } from "@/lib/session";
import ConfigTester from "../_components/ConfigTester";

export const dynamic = "force-dynamic";

const IG_RENEW_CMD = `GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={TOKEN_ATUAL}`;

export default async function ConfigPage() {
  await requireAdmin();

  return (
    <div>
      <h1>Configuração</h1>
      <p className="muted">
        Status das integrações. As variáveis de ambiente são exibidas apenas
        como presentes/ausentes — nunca seus valores.
      </p>

      <ConfigTester />

      <h2 style={{ marginTop: "1.5rem" }}>Renovação do token do Instagram</h2>
      <div className="card">
        <p style={{ marginTop: 0 }}>
          O token de longa duração dura ~60 dias. Para trocar antes de vencer,
          faça a chamada abaixo, cole o novo token em{" "}
          <code>IG_ACCESS_TOKEN</code> e reinicie o serviço:
        </p>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontSize: "0.82rem",
            background: "var(--bg)",
            padding: "0.75rem",
            borderRadius: 8,
            margin: 0,
          }}
        >
          {IG_RENEW_CMD}
        </pre>
      </div>
    </div>
  );
}
