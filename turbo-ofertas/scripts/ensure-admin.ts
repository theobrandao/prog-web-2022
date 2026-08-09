// Production first-boot init: ensure the default Rule and the bootstrap admin
// exist (idempotent). Does NOT insert demo products — production starts clean
// and is populated via the importer. Safe to run on every deploy/restart.
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  await prisma.rule.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });

  const email = (process.env.ADMIN_EMAIL || "admin@turbo.local").toLowerCase();
  const pass = process.env.ADMIN_PASSWORD || "troca-me-123";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        name: "Administrador",
        passwordHash: await argon2.hash(pass, { type: argon2.argon2id }),
        role: "admin",
        status: "aprovado",
        approvedAt: new Date(),
      },
    });
    console.log(`ensure-admin: admin criado (${email})`);
  } else {
    console.log(`ensure-admin: admin já existe (${email})`);
  }
}

main()
  .catch((e) => {
    console.error("ensure-admin falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
