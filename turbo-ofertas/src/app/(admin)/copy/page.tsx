import Decimal from "decimal.js";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { daysAgo } from "@/lib/dates";
import { publicBaseUrl, groupInviteUrl } from "@/lib/env";
import { HISTORY_WINDOW_DAYS } from "@/core/constants";
import { toCoreProduct, toCoreRule } from "@/services/selection";
import { copyVariations } from "@/core/copyVariations";
import CopyText from "../_components/CopyText";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CopyPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  await requireUser();

  const flag = await prisma.setting.findUnique({ where: { key: "copyIaEnabled" } });
  const enabled = flag?.value === "true";

  if (!enabled) {
    return (
      <div>
        <h1>Copy IA</h1>
        <div className="card">
          <p>
            A Copy IA gera <strong>variações determinísticas</strong> de texto
            (IG / WhatsApp / Telegram) a partir da rotação de ganchos (§5.6) e
            dos modelos de mensagem (§5.5/§7.3) — sem IA externa.
          </p>
          <p className="muted">
            Recurso desativado. Ative a chave <code>copyIaEnabled</code> em{" "}
            <code>/config-avancada</code> para usar esta página.
          </p>
        </div>
      </div>
    );
  }

  const { productId } = await searchParams;

  const activeProducts = await prisma.product.findMany({
    where: { active: true },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  const selected = productId
    ? await prisma.product.findUnique({
        where: { id: productId },
        include: {
          links: true,
          prices: {
            where: { date: { gte: daysAgo(HISTORY_WINDOW_DAYS) } },
            orderBy: { date: "asc" },
          },
        },
      })
    : null;

  let variations: ReturnType<typeof copyVariations> = [];
  if (selected) {
    const rule = toCoreRule(
      await prisma.rule.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }),
    );
    const core = toCoreProduct(selected);
    const hist = selected.prices.map((pp) => ({
      date: pp.date,
      price: new Decimal(String(pp.price)),
    }));
    variations = copyVariations(core, hist, rule, {
      seeds: [0, 1, 2, 3, 4],
      publicBaseUrl: publicBaseUrl(),
      groupInviteUrl: groupInviteUrl(),
      postId: 0,
    });
  }

  const channels: { key: "ig" | "wa" | "tg"; label: string }[] = [
    { key: "ig", label: "Instagram" },
    { key: "wa", label: "WhatsApp" },
    { key: "tg", label: "Telegram" },
  ];

  return (
    <div>
      <h1>Copy IA</h1>
      <p className="muted">
        Variações determinísticas por seed (0–4). Mesmo produto e seed sempre
        geram o mesmo texto — auditável, sem IA externa.
      </p>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <strong>Produto</strong>
        {activeProducts.length === 0 ? (
          <p className="muted">Nenhum produto ativo.</p>
        ) : (
          <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            {activeProducts.map((p) => (
              <a
                key={p.id}
                href={`/copy?productId=${encodeURIComponent(p.id)}`}
                className={`btn small ${p.id === productId ? "accent" : "ghost"}`}
              >
                {p.title.length > 40 ? p.title.slice(0, 40) + "…" : p.title}
              </a>
            ))}
          </div>
        )}
      </div>

      {!selected ? (
        <p className="muted">Selecione um produto acima para gerar as variações.</p>
      ) : (
        <>
          <h2 style={{ fontSize: "1.1rem" }}>{selected.title}</h2>
          {channels.map((ch) => (
            <div key={ch.key} style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem" }}>{ch.label}</h3>
              <div className="grid cols-2">
                {variations.map((v) => (
                  <div className="card" key={`${ch.key}-${v.seed}`}>
                    <div
                      className="row"
                      style={{ justifyContent: "space-between", alignItems: "center" }}
                    >
                      <span className="badge">seed {v.seed}</span>
                      <CopyText text={v[ch.key]} />
                    </div>
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        marginTop: "0.5rem",
                        fontSize: "0.8rem",
                      }}
                    >
                      {v[ch.key]}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
