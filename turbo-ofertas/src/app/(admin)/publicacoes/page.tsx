import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { truncDay } from "@/lib/dates";
import RepublishButton from "../_components/RepublishButton";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().replace("T", " ").slice(0, 16);
}

export default async function PublicacoesPage() {
  await requireUser();

  const day = truncDay(new Date());
  const [jobs, posts] = await Promise.all([
    prisma.job.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.post.findMany({
      where: { date: day },
      orderBy: { slot: "asc" },
      include: { product: { select: { title: true } } },
    }),
  ]);

  return (
    <div>
      <h1>Publicações</h1>

      <h2>Status dos posts de hoje</h2>
      {posts.length === 0 ? (
        <p className="muted">Nenhum post gerado para hoje.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vaga</th>
                <th>Título</th>
                <th>Telegram</th>
                <th>IG Feed</th>
                <th>IG Story</th>
                <th>Republicar</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>{p.slot}</td>
                  <td>{p.product.title}</td>
                  <td>{p.tgSent ? "enviado" : "—"}</td>
                  <td>{p.igFeedId ? "publicado" : "—"}</td>
                  <td>{p.igStoryId ? "publicado" : "—"}</td>
                  <td>
                    <div className="row">
                      <RepublishButton postId={p.id} kind="feed" />
                      <RepublishButton postId={p.id} kind="story" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: "1.5rem" }}>Jobs recentes ({jobs.length})</h2>
      {jobs.length === 0 ? (
        <p className="muted">Nenhum job registrado.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Status</th>
                <th>Data (runDate)</th>
                <th>Criado</th>
                <th>Log</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.type}</td>
                  <td>
                    <span
                      className={`badge ${j.status === "done" ? "accent" : ""}`}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td>{fmt(j.runDate)}</td>
                  <td>{fmt(j.createdAt)}</td>
                  <td>
                    {j.log ? (
                      <details>
                        <summary>ver log</summary>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            fontSize: "0.78rem",
                            margin: "0.5rem 0 0",
                          }}
                        >
                          {j.log}
                        </pre>
                      </details>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
