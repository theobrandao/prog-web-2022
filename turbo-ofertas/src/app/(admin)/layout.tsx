import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import LogoutButton from "./_components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, role: true },
  });

  const isAdmin = session.role === "admin";

  return (
    <div>
      <header className="site-header">
        <span className="brand">TURBO OFERTAS</span>
        <nav>
          <Link href="/">Início</Link>
          <Link href="/hoje">Hoje</Link>
          <Link href="/produtos">Produtos</Link>
          <Link href="/midia">Mídia</Link>
          <Link href="/importar">Importar</Link>
          <Link href="/links">Links</Link>
          <Link href="/regras">Regras</Link>
          <Link href="/criativos">Criativos</Link>
          <Link href="/copy">Copy IA</Link>
          <Link href="/publicacoes">Publicações</Link>
          <Link href="/jobs">Jobs</Link>
          <Link href="/whatsapp">WhatsApp</Link>
          <Link href="/campanhas">Campanhas</Link>
          <Link href="/calendario">Calendário</Link>
          <Link href="/tracking">Tracking</Link>
          <Link href="/relatorios">Relatórios</Link>
          <Link href="/ab">Testes A/B</Link>
          <Link href="/alertas">Alertas</Link>
          <Link href="/health">Health</Link>
          {isAdmin && <Link href="/config">Config</Link>}
          {isAdmin && <Link href="/config-avancada">Config Avançada</Link>}
          {isAdmin && <Link href="/auditoria">Auditoria</Link>}
          {isAdmin && <Link href="/usuarios">Usuários</Link>}
        </nav>
        <div className="user-box">
          <span>
            {user?.name ?? "Usuário"} · {user?.role ?? session.role}
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}
