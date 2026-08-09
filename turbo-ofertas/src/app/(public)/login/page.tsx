"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (res.status === 204) {
          router.push("/hoje");
          router.refresh();
          return;
        }
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Falha ao entrar.");
      } else {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        if (res.status === 201) {
          setNotice(
            "Cadastro recebido. Aguarde a aprovação do administrador para acessar.",
          );
          setName("");
          setPassword("");
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Falha ao solicitar acesso.");
        }
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand">TURBO OFERTAS</div>
        <div className="tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError(null);
              setNotice(null);
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError(null);
              setNotice(null);
            }}
          >
            Solicitar acesso
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <label htmlFor="name">Nome</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </>
          )}
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="error">{error}</p>}
          {notice && <p className="notice">{notice}</p>}

          <button
            type="submit"
            className="accent"
            style={{ width: "100%", marginTop: "1rem" }}
            disabled={loading}
          >
            {loading
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : "Solicitar acesso"}
          </button>
        </form>
      </div>
    </div>
  );
}
