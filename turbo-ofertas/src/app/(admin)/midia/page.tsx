import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import CollectMediaButton from "./_components/CollectMediaButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function MidiaPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; semImagem?: string; page?: string }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const source = sp.source?.trim() || "";
  const semImagem = sp.semImagem === "1";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (source) where.source = source;
  if (semImagem) where.imageLocal = null;

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (source) params.set("source", source);
    if (semImagem) params.set("semImagem", "1");
    params.set("page", String(p));
    return `/midia?${params.toString()}`;
  }

  return (
    <div>
      <h1>Mídia (imagens e vídeos)</h1>
      <p className="muted">
        {total} produto(s). Página {page} de {totalPages}.
      </p>

      <CollectMediaButton />
      <p className="muted" style={{ fontSize: "0.8rem", marginTop: "-0.5rem" }}>
        Baixa as fotos das URLs do Mercado Livre para o servidor (aparecem aqui e entram nos criativos).
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Título</th>
              <th>Imagem</th>
              <th>Vídeo</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const thumb = p.customImage || p.imageLocal || null;
              const hasVideo = !!(p.videoLocal || p.videoUrl);
              return (
                <tr key={p.id}>
                  <td style={{ fontSize: "0.8rem" }}>{p.id}</td>
                  <td>{p.title}</td>
                  <td>
                    {thumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={thumb}
                        alt={p.title}
                        style={{
                          width: 56,
                          height: 56,
                          objectFit: "cover",
                          borderRadius: 6,
                        }}
                      />
                    ) : (
                      <span
                        className="badge muted"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 56,
                          height: 56,
                          fontSize: "0.7rem",
                          textAlign: "center",
                        }}
                      >
                        sem imagem
                      </span>
                    )}
                  </td>
                  <td>{hasVideo ? "sim" : "não"}</td>
                  <td>
                    <span className={`badge ${p.source}`}>{p.source}</span>
                    <div className="muted" style={{ fontSize: "0.72rem" }}>
                      {p.imageUrl ? "URL externa" : "—"}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="row" style={{ marginTop: "1rem" }}>
        {page > 1 && (
          <Link className="btn ghost small" href={pageHref(page - 1)}>
            ← Anterior
          </Link>
        )}
        {page < totalPages && (
          <Link className="btn ghost small" href={pageHref(page + 1)}>
            Próxima →
          </Link>
        )}
      </div>
    </div>
  );
}
