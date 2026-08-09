import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { truncDay } from "@/lib/dates";
import WhatsappActions from "../_components/WhatsappActions";

export const dynamic = "force-dynamic";

const SCHEDULE = ["09:00", "12:30", "20:00"] as const;

export default async function WhatsappPage() {
  await requireUser();

  const day = truncDay(new Date());
  const posts = await prisma.post.findMany({
    where: { date: day },
    orderBy: { slot: "asc" },
    include: { product: { select: { title: true } } },
  });

  return (
    <div>
      <h1>Pacote WhatsApp</h1>
      <p className="muted">
        Encaminhe manualmente cada oferta no horário programado.
      </p>

      {posts.length === 0 ? (
        <p className="muted">Nenhum post para hoje.</p>
      ) : (
        SCHEDULE.map((label, idx) => {
          const slot = idx + 1;
          const post = posts.find((p) => p.slot === slot);
          return (
            <div key={label} style={{ marginBottom: "1.5rem" }}>
              <h2>
                {label} · Vaga {slot}
              </h2>
              {!post ? (
                <p className="muted">Sem oferta nesta vaga.</p>
              ) : (
                <div className="card">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <h3 style={{ fontSize: "1rem" }}>{post.product.title}</h3>
                    {post.waForwarded && (
                      <span className="badge accent">encaminhado</span>
                    )}
                  </div>
                  {post.feedImage && (
                    <img
                      src={post.feedImage}
                      alt={`Feed vaga ${slot}`}
                      style={{
                        width: "100%",
                        maxWidth: 320,
                        borderRadius: 8,
                        margin: "0.5rem 0",
                      }}
                    />
                  )}
                  <textarea
                    readOnly
                    rows={8}
                    value={post.waMessage}
                    style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
                  />
                  <WhatsappActions
                    postId={post.id}
                    waMessage={post.waMessage}
                    initialForwarded={post.waForwarded}
                  />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
