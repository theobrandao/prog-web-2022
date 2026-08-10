import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { truncDay } from "@/lib/dates";
import RegenerateButton from "../_components/RegenerateButton";

export const dynamic = "force-dynamic";

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function CriativosPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireUser();

  const { date: dateParam } = await searchParams;
  const day = truncDay(dateParam ?? new Date());
  const value = dateParam ?? toDateInput(day);

  const posts = await prisma.post.findMany({
    where: { date: day },
    orderBy: { slot: "asc" },
    include: { product: { select: { title: true, videoLocal: true } } },
  });

  return (
    <div>
      <h1>Criativos</h1>

      <form method="get" className="row" style={{ marginBottom: "1rem" }}>
        <div>
          <label htmlFor="date">Data</label>
          <input id="date" name="date" type="date" defaultValue={value} />
        </div>
        <button type="submit" className="ghost">
          Ver
        </button>
      </form>

      {posts.length === 0 ? (
        <p className="muted">Nenhum criativo gerado para esta data.</p>
      ) : (
        <div className="grid cols-2">
          {posts.map((p) => (
            <div className="card" key={p.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="badge accent">Vaga {p.slot}</span>
                <RegenerateButton postId={p.id} />
              </div>
              <h3 style={{ fontSize: "1rem", marginTop: "0.5rem" }}>
                {p.product.title}
              </h3>

              {(p.videoCreative || p.product.videoLocal) && (
                <div style={{ marginTop: "0.5rem" }}>
                  <span className="badge">🎬 vídeo-criativo</span>
                  <video
                    controls
                    src={p.videoCreative || p.product.videoLocal || undefined}
                    style={{ width: "100%", borderRadius: 8, marginTop: 4 }}
                  />
                  <a
                    className="btn ghost small"
                    href={p.videoCreative || p.product.videoLocal || "#"}
                    download
                    style={{ marginTop: 4, display: "inline-block" }}
                  >
                    Baixar vídeo
                  </a>
                </div>
              )}

              <div className="grid cols-2" style={{ marginTop: "0.5rem" }}>
                <div>
                  <strong style={{ fontSize: "0.8rem" }}>Feed</strong>
                  {p.feedImage ? (
                    <>
                      <img
                        src={p.feedImage}
                        alt={`Feed post ${p.id}`}
                        style={{ width: "100%", borderRadius: 8, marginTop: 4 }}
                      />
                      <a
                        className="btn ghost small"
                        href={p.feedImage}
                        download
                        style={{ marginTop: 4, display: "inline-block" }}
                      >
                        Baixar feed
                      </a>
                    </>
                  ) : (
                    <p className="muted">—</p>
                  )}
                </div>
                <div>
                  <strong style={{ fontSize: "0.8rem" }}>Story</strong>
                  {p.storyImage ? (
                    <>
                      <img
                        src={p.storyImage}
                        alt={`Story post ${p.id}`}
                        style={{ width: "100%", borderRadius: 8, marginTop: 4 }}
                      />
                      <a
                        className="btn ghost small"
                        href={p.storyImage}
                        download
                        style={{ marginTop: 4, display: "inline-block" }}
                      >
                        Baixar story
                      </a>
                    </>
                  ) : (
                    <p className="muted">—</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
