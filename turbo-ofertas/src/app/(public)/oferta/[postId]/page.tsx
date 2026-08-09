import { prisma } from "@/lib/db";
import { displayBRL } from "@/lib/money";
import { groupInviteUrl } from "@/lib/env";
import { AFFILIATE_DISCLAIMER } from "@/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SRC = ["grp", "cnl", "ig", "site", "direct"];

export default async function OfertaPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { postId } = await params;
  const { src: srcRaw } = await searchParams;
  const src = srcRaw && VALID_SRC.includes(srcRaw) ? srcRaw : "direct";
  const id = Number(postId);

  const post = await prisma.post.findUnique({ where: { id }, include: { product: true } });
  if (!post) {
    return (
      <main className="offer-page">
        <p>Oferta não encontrada ou expirada.</p>
      </main>
    );
  }

  const p = post.product;
  const anchor = p.anchorPrice != null ? String(p.anchorPrice) : null;
  const invite = groupInviteUrl();

  return (
    <main className="offer-page">
      {post.feedImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="offer-creative" src={post.feedImage} alt={p.title} />
      ) : null}
      <h1 className="offer-title">{p.title}</h1>
      <div className="offer-price">
        {anchor ? <span className="offer-anchor">{displayBRL(anchor)}</span> : null}
        <span className="offer-now">{displayBRL(String(p.currentPrice))}</span>
      </div>
      {p.coupon ? (
        <p className="offer-coupon">
          🎟️ Cupom: <strong>{p.coupon}</strong>
          {p.couponHowTo ? <span className="offer-howto"> — {p.couponHowTo}</span> : null}
        </p>
      ) : null}
      {p.shippingNote ? <p className="offer-shipping">📦 {p.shippingNote}</p> : null}

      <a className="offer-cta" href={`/api/track/${id}?src=${src}`}>
        Pegar oferta →
      </a>

      <footer className="offer-footer">
        <p>{AFFILIATE_DISCLAIMER} Não somos loja.</p>
        {invite ? (
          <p>
            <a href={invite}>Entrar no grupo de ofertas</a>
          </p>
        ) : null}
      </footer>
    </main>
  );
}
