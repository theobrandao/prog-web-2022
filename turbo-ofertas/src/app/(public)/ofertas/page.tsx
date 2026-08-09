import { prisma } from "@/lib/db";
import { displayBRL } from "@/lib/money";
import { HANDLE, AFFILIATE_DISCLAIMER } from "@/theme";
import { daysAgo } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function OfertasPage() {
  const since = daysAgo(7);
  const posts = await prisma.post.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "desc" },
    include: { product: true },
    take: 30,
  });

  return (
    <div>
      <header className="site-header">
        <span className="brand" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/brand/logo.png" alt="Ofertas Turbo BR" width={40} height={40} style={{ borderRadius: 8 }} />
          OFERTAS TURBO BR
        </span>
        <nav>
          <span className="muted" style={{ color: "#fff", opacity: 0.7 }}>
            {HANDLE}
          </span>
        </nav>
      </header>
      <p className="container" style={{ marginTop: "1rem", opacity: 0.85 }}>
        Só publicamos produto no menor preço dos últimos 90 dias.
      </p>

      <main className="container">
        <h1>Ofertas dos últimos 7 dias</h1>
        {posts.length === 0 ? (
          <div className="card">
            <p className="muted">
              Nenhuma oferta publicada nos últimos 7 dias. Volte em breve.
            </p>
          </div>
        ) : (
          <div className="offer-grid">
            {posts.map((post) => (
              <div className="card" key={post.id}>
                <span className={`badge ${post.product.source}`}>
                  {post.product.source}
                </span>
                <h3 style={{ fontSize: "1rem", marginTop: "0.5rem" }}>
                  {post.product.title}
                </h3>
                <p className="price">{displayBRL(String(post.product.currentPrice))}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="offer-footer">{AFFILIATE_DISCLAIMER}</footer>
    </div>
  );
}
