process.env.DATABASE_URL ||= "file:../data/test.db";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  registerPending,
  createUserByAdmin,
  setStatus,
  setRole,
  authenticate,
  UserError,
} from "../src/services/users.js";

const prisma = new PrismaClient();
const EMAILS = [
  "reg@test.local",
  "admin1@test.local",
  "admin2@test.local",
  "op@test.local",
];

async function cleanup() {
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
}

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("users service", () => {
  it("self-registration creates a PENDING account and cannot log in", async () => {
    await registerPending(prisma, {
      name: "Reg",
      email: "reg@test.local",
      password: "senha12345",
    });
    const u = await prisma.user.findUnique({ where: { email: "reg@test.local" } });
    expect(u?.status).toBe("pendente");

    const auth = await authenticate(prisma, "reg@test.local", "senha12345");
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      expect(auth.code).toBe("PENDENTE");
      expect(auth.httpStatus).toBe(403);
    }
  });

  it("approved user logs in; wrong password is 401 credencial", async () => {
    const admin = await createUserByAdmin(prisma, 0, {
      name: "Admin1",
      email: "admin1@test.local",
      password: "senha12345",
      role: "admin",
    });
    // approve the pending reg user
    const reg = await prisma.user.findUnique({ where: { email: "reg@test.local" } });
    await setStatus(prisma, admin.id, reg!.id, "aprovado");

    const good = await authenticate(prisma, "reg@test.local", "senha12345");
    expect(good.ok).toBe(true);

    const bad = await authenticate(prisma, "reg@test.local", "errada");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe("CREDENCIAL");
  });

  it("admin cannot block themselves", async () => {
    const admin = await prisma.user.findUnique({ where: { email: "admin1@test.local" } });
    await expect(
      setStatus(prisma, admin!.id, admin!.id, "bloqueado"),
    ).rejects.toBeInstanceOf(UserError);
  });

  it("the last active admin cannot be demoted or blocked", async () => {
    const admin = await prisma.user.findUnique({ where: { email: "admin1@test.local" } });
    // admin1 is the only admin -> cannot demote
    await expect(setRole(prisma, admin!.id, admin!.id, "operador")).rejects.toBeInstanceOf(UserError);

    // add a second admin -> now demotion of admin1 is allowed
    const admin2 = await createUserByAdmin(prisma, admin!.id, {
      name: "Admin2",
      email: "admin2@test.local",
      password: "senha12345",
      role: "admin",
    });
    const demoted = await setRole(prisma, admin2.id, admin!.id, "operador");
    expect(demoted.role).toBe("operador");
  });

  it("admin-created user is already approved and can log in", async () => {
    const admin = await prisma.user.findUnique({ where: { email: "admin2@test.local" } });
    await createUserByAdmin(prisma, admin!.id, {
      name: "Op",
      email: "op@test.local",
      password: "senha12345",
      role: "operador",
    });
    const auth = await authenticate(prisma, "op@test.local", "senha12345");
    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.user.role).toBe("operador");
  });

  it("duplicate email registration is rejected", async () => {
    await expect(
      registerPending(prisma, { name: "Dup", email: "op@test.local", password: "senha12345" }),
    ).rejects.toBeInstanceOf(UserError);
  });
});
