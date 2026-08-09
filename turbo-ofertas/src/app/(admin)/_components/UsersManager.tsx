"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  // create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("operador");
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const pending = users.filter((u) => u.status === "pendente");

  async function patch(id: number, body: Record<string, string>) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
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

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreateMsg(null);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Falha ao criar usuário.");
      return;
    }
    setCreateMsg(`Usuário ${data.email} criado.`);
    setName("");
    setEmail("");
    setPassword("");
    setRole("operador");
    router.refresh();
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}

      <h2>Pendentes de aprovação ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="muted">Nenhum cadastro pendente.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <div className="row">
                      <button
                        className="small accent"
                        disabled={busy === u.id}
                        onClick={() => patch(u.id, { status: "aprovado" })}
                      >
                        Aprovar
                      </button>
                      <button
                        className="small danger"
                        disabled={busy === u.id}
                        onClick={() => patch(u.id, { status: "reprovado" })}
                      >
                        Reprovar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: "1.5rem" }}>Todos os usuários</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.status}</td>
                <td>
                  <div className="row">
                    {u.status === "bloqueado" ? (
                      <button
                        className="small"
                        disabled={busy === u.id}
                        onClick={() => patch(u.id, { status: "aprovado" })}
                      >
                        Desbloquear
                      </button>
                    ) : (
                      <button
                        className="small danger"
                        disabled={busy === u.id}
                        onClick={() => patch(u.id, { status: "bloqueado" })}
                      >
                        Bloquear
                      </button>
                    )}
                    {u.role === "admin" ? (
                      <button
                        className="small ghost"
                        disabled={busy === u.id}
                        onClick={() => patch(u.id, { role: "operador" })}
                      >
                        Rebaixar
                      </button>
                    ) : (
                      <button
                        className="small ghost"
                        disabled={busy === u.id}
                        onClick={() => patch(u.id, { role: "admin" })}
                      >
                        Promover
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: "1.5rem" }}>Criar usuário</h2>
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
            <label htmlFor="c-email">E-mail</label>
            <input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="c-pass">Senha (mín. 8)</label>
            <input
              id="c-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="c-role">Papel</label>
            <select
              id="c-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="operador">operador</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
        {createMsg && <p className="notice">{createMsg}</p>}
        <button type="submit" className="accent" style={{ marginTop: "1rem" }}>
          Criar usuário
        </button>
      </form>
    </div>
  );
}
