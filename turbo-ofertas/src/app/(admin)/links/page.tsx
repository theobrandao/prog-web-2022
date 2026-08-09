import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import LinksEditor, { type LinkItem } from "../_components/LinksEditor";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  await requireUser();

  const products = await prisma.product.findMany({
    where: { source: "ml" },
    include: { links: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const items: LinkItem[] = products
    .map((p) => {
      const byChannel = Object.fromEntries(
        p.links.map((l) => [l.channel, l.url]),
      );
      return {
        id: p.id,
        title: p.title,
        productUrl: p.productUrl,
        grp: byChannel.grp ?? "",
        cnl: byChannel.cnl ?? "",
        ig: byChannel.ig ?? "",
      };
    })
    // pendentes = falta grp OU cnl
    .filter((p) => !(p.grp && p.cnl));

  return (
    <div>
      <h1>Links do Mercado Livre</h1>

      <div className="card" style={{ borderColor: "var(--accent)" }}>
        <p style={{ margin: 0 }}>
          Os links são gerados por você no Portal do Afiliado. O sistema nunca
          gera links do Mercado Livre.
        </p>
      </div>

      <p className="muted">{items.length} produto(s) ML pendente(s) de link.</p>

      <LinksEditor items={items} />
    </div>
  );
}
