import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { DateTime } from "luxon";

const prisma = new PrismaClient();
const TZ = "America/Sao_Paulo";

function dayAgo(n: number): Date {
  return DateTime.now().setZone(TZ).startOf("day").minus({ days: n }).toJSDate();
}

interface SeedProduct {
  id: string;
  source: string;
  title: string;
  currentPrice: number;
  anchorPrice?: number;
  commissionPct: number;
  reviews: number;
  rating: number;
  sellerRep?: string;
  coupon?: string;
  sellerName?: string;
  shippingNote?: string;
  urgency?: string;
  comment?: string;
  /** history generator: price for a point `age` days ago (0 = today) */
  hist: (age: number) => number;
  links?: { channel: string; url: string }[];
  active?: boolean;
}

const mlLinks = (id: string) => [
  { channel: "grp", url: `https://mercadolivre.com.br/sec/${id}-grp` },
  { channel: "cnl", url: `https://mercadolivre.com.br/sec/${id}-cnl` },
  { channel: "site", url: `https://mercadolivre.com.br/sec/${id}-site` },
];

// 12 fictional products. A handful are crafted to pass today's filter (at the
// 90d floor, good reviews/rating, green rep, links) so /hoje shows a selection.
const products: SeedProduct[] = [
  // --- Should PASS (low ticket, at floor) ---
  {
    id: "MLB1000001",
    source: "ml",
    title: "Fone de Ouvido Bluetooth TWS à prova d'água",
    currentPrice: 99.9,
    anchorPrice: 159.9,
    commissionPct: 14,
    reviews: 1820,
    rating: 4.8,
    sellerRep: "verde",
    coupon: "TURBO10",
    sellerName: "AudioTech Oficial",
    shippingNote: "Frete grátis",
    hist: (a) => (a <= 1 ? 99.9 : 130 + (a % 5) * 3),
    links: mlLinks("MLB1000001"),
  },
  {
    id: "MLB1000002",
    source: "ml",
    title: "Cafeteira Elétrica Programável 30 xícaras inox",
    currentPrice: 189.0,
    anchorPrice: 249.0,
    commissionPct: 10,
    reviews: 640,
    rating: 4.7,
    sellerRep: "verde",
    sellerName: "Casa & Cia",
    hist: (a) => (a <= 1 ? 189 : 230 + (a % 4) * 5),
    links: mlLinks("MLB1000002"),
  },
  {
    id: "MLB1000003",
    source: "shopee",
    title: "Kit 10 unidades Meias Esportivas cano médio",
    currentPrice: 37.0,
    commissionPct: 18,
    reviews: 3200,
    rating: 4.9,
    sellerRep: "verde",
    hist: (a) => (a <= 1 ? 37 : 49 + (a % 3) * 2),
    links: [{ channel: "grp", url: "https://shopee.com.br/sec/MLB1000003-grp" }, { channel: "site", url: "https://shopee.com.br/sec/MLB1000003-site" }],
  },
  // --- High ticket, should PASS -> vaga 1 ---
  {
    id: "MLB1000004",
    source: "ml",
    title: "Smart TV 50 polegadas 4K UHD LED HDR",
    currentPrice: 1799.0,
    anchorPrice: 2499.0,
    commissionPct: 8,
    reviews: 410,
    rating: 4.6,
    sellerRep: "verde",
    sellerName: "MegaEletro",
    shippingNote: "Frete grátis para todo o Brasil",
    hist: (a) => (a <= 1 ? 1799 : 2350 + (a % 6) * 20),
    links: mlLinks("MLB1000004"),
  },
  {
    id: "B00AMAZON01",
    source: "amazon",
    title: "Echo Dot 5ª geração Smart Speaker com Alexa",
    currentPrice: 279.0,
    anchorPrice: 399.0,
    commissionPct: 9,
    reviews: 9800,
    rating: 4.8,
    sellerRep: "",
    shippingNote: "Frete grátis com Prime",
    hist: (a) => (a <= 1 ? 279 : 349 + (a % 5) * 6),
    links: [{ channel: "site", url: "https://www.amazon.com.br/dp/B00AMAZON01?tag=aff" }],
  },
  // --- FAILS: not at floor ---
  {
    id: "MLB1000006",
    source: "ml",
    title: "Liquidificador Turbo 1200W 12 velocidades",
    currentPrice: 210.0,
    commissionPct: 11,
    reviews: 500,
    rating: 4.7,
    sellerRep: "verde",
    hist: (a) => (a === 0 ? 210 : 180 + (a % 4) * 3), // today ABOVE floor
    links: mlLinks("MLB1000006"),
  },
  // --- FAILS: ML without links (pendente de link) ---
  {
    id: "MLB1000007",
    source: "ml",
    title: "Aspirador de Pó Vertical sem Fio Recarregável",
    currentPrice: 320.0,
    anchorPrice: 459.0,
    commissionPct: 12,
    reviews: 720,
    rating: 4.6,
    sellerRep: "verde",
    hist: (a) => (a <= 1 ? 320 : 420 + (a % 5) * 5),
    links: [], // no links -> LINK fail, appears in "ML pendentes de link"
  },
  // --- FAILS: blocklist term ---
  {
    id: "MLB1000008",
    source: "ml",
    title: "Tênis Réplica Premium modelo importado",
    currentPrice: 129.0,
    commissionPct: 15,
    reviews: 300,
    rating: 4.6,
    sellerRep: "verde",
    hist: (a) => (a <= 1 ? 129 : 160 + (a % 3) * 4),
    links: mlLinks("MLB1000008"),
  },
  // --- FAILS: low rating ---
  {
    id: "MLB1000009",
    source: "ml",
    title: "Carregador Portátil Power Bank 20000mAh",
    currentPrice: 89.0,
    commissionPct: 13,
    reviews: 150,
    rating: 3.9,
    sellerRep: "verde",
    hist: (a) => (a <= 1 ? 89 : 110 + (a % 3) * 2),
    links: mlLinks("MLB1000009"),
  },
  // --- FAILS: low reviews ---
  {
    id: "MLB1000010",
    source: "ml",
    title: "Panela de Pressão Elétrica 6 litros digital",
    currentPrice: 275.0,
    commissionPct: 10,
    reviews: 12,
    rating: 4.8,
    sellerRep: "verde",
    hist: (a) => (a <= 1 ? 275 : 340 + (a % 4) * 5),
    links: mlLinks("MLB1000010"),
  },
  // --- FAILS: ML seller reputation not green ---
  {
    id: "MLB1000011",
    source: "ml",
    title: "Relógio Smartwatch com Monitor Cardíaco",
    currentPrice: 145.0,
    anchorPrice: 220.0,
    commissionPct: 16,
    reviews: 2100,
    rating: 4.7,
    sellerRep: "outra",
    hist: (a) => (a <= 1 ? 145 : 190 + (a % 5) * 3),
    links: mlLinks("MLB1000011"),
  },
  // --- PASSES: low ticket with human comment + urgency + coupon ---
  {
    id: "MLB1000012",
    source: "ml",
    title: "Air Fryer Fritadeira sem Óleo 5 litros digital",
    currentPrice: 289.0,
    anchorPrice: 449.0,
    commissionPct: 12,
    reviews: 5400,
    rating: 4.9,
    sellerRep: "verde",
    coupon: "AIR20",
    couponHowTo: undefined,
    sellerName: "Cozinha Prática",
    urgency: "oferta relâmpago encerra hoje",
    comment: "Melhor custo-benefício de air fryer que já vi no menor preço",
    hist: (a) => (a <= 1 ? 289 : 380 + (a % 6) * 8),
    links: mlLinks("MLB1000012"),
  },
];

async function main() {
  // 1. Default Rule (id=1)
  await prisma.rule.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });

  // 2. Bootstrap admin
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@turbo.local").toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || "troca-me-123";
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Administrador",
      passwordHash: await argon2.hash(adminPass, { type: argon2.argon2id }),
      role: "admin",
      status: "aprovado",
      approvedAt: new Date(),
    },
    update: { role: "admin", status: "aprovado" },
  });

  // 3. Products + 20 days of history + links
  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        source: p.source,
        title: p.title,
        productUrl: `https://exemplo.com/${p.id}`,
        imageUrl: `https://picsum.photos/seed/${p.id}/800/800`,
        currentPrice: p.currentPrice.toString(),
        anchorPrice: p.anchorPrice?.toString() ?? null,
        commissionPct: p.commissionPct.toString(),
        coupon: p.coupon ?? null,
        couponHowTo: p.couponHowTo ?? null,
        sellerName: p.sellerName ?? null,
        shippingNote: p.shippingNote ?? null,
        urgency: p.urgency ?? null,
        comment: p.comment ?? null,
        reviews: p.reviews,
        rating: p.rating.toString(),
        sellerRep: p.sellerRep ?? "outra",
        active: p.active ?? true,
      },
      update: {
        currentPrice: p.currentPrice.toString(),
        anchorPrice: p.anchorPrice?.toString() ?? null,
        commissionPct: p.commissionPct.toString(),
        reviews: p.reviews,
        rating: p.rating.toString(),
        sellerRep: p.sellerRep ?? "outra",
      },
    });

    for (let age = 19; age >= 0; age--) {
      const price = p.hist(age);
      const date = dayAgo(age);
      await prisma.pricePoint.upsert({
        where: { productId_date: { productId: p.id, date } },
        create: { productId: p.id, date, price: price.toString() },
        update: { price: price.toString() },
      });
    }

    for (const l of p.links ?? []) {
      await prisma.affiliateLink.upsert({
        where: { productId_channel: { productId: p.id, channel: l.channel } },
        create: { productId: p.id, channel: l.channel, url: l.url },
        update: { url: l.url },
      });
    }
  }

  const count = await prisma.product.count();
  console.log(`Seed pronto: ${count} produtos, admin=${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
