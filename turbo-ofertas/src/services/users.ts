import type { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "../lib/auth.js";

export type UserStatus = "pendente" | "aprovado" | "reprovado" | "bloqueado";
export type Role = "admin" | "operador";

export class UserError extends Error {
  constructor(
    message: string,
    public code: string,
    public httpStatus = 400,
  ) {
    super(message);
  }
}

async function audit(
  prisma: PrismaClient,
  userId: number | null,
  action: string,
  detail = "",
) {
  await prisma.auditLog.create({ data: { userId: userId ?? undefined, action, detail } });
}

/** Public self-registration — always creates a PENDING account (§10, R: nunca concede acesso). */
export async function registerPending(
  prisma: PrismaClient,
  input: { name: string; email: string; password: string },
) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new UserError("E-mail inválido", "EMAIL_INVALIDO");
  }
  if (input.password.length < 8) {
    throw new UserError("Senha deve ter ao menos 8 caracteres", "SENHA_CURTA");
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new UserError("E-mail já cadastrado", "EMAIL_DUPLICADO", 409);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      role: "operador",
      status: "pendente",
    },
  });
  await audit(prisma, null, "user.register", `email=${email}`);
  return user;
}

/** Admin creates a user that is already APPROVED (§4.15). */
export async function createUserByAdmin(
  prisma: PrismaClient,
  adminId: number,
  input: { name: string; email: string; password: string; role: Role },
) {
  const email = input.email.trim().toLowerCase();
  if (input.password.length < 8) {
    throw new UserError("Senha deve ter ao menos 8 caracteres", "SENHA_CURTA");
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new UserError("E-mail já cadastrado", "EMAIL_DUPLICADO", 409);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      status: "aprovado",
      approvedAt: new Date(),
      approvedById: adminId,
    },
  });
  await audit(prisma, adminId, "user.create", `email=${email} role=${input.role}`);
  return user;
}

async function countActiveAdmins(prisma: PrismaClient, exceptId?: number) {
  return prisma.user.count({
    where: {
      role: "admin",
      status: "aprovado",
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
}

/** Change a user's status with the spec's guardrails (§4.15). */
export async function setStatus(
  prisma: PrismaClient,
  adminId: number,
  targetId: number,
  status: UserStatus,
) {
  if (adminId === targetId && (status === "reprovado" || status === "bloqueado")) {
    throw new UserError("Admin não pode reprovar/bloquear a si mesmo", "SELF_BLOCK", 403);
  }
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new UserError("Usuário não encontrado", "NAO_ENCONTRADO", 404);

  if (target.role === "admin" && status === "bloqueado") {
    const others = await countActiveAdmins(prisma, targetId);
    if (others === 0) {
      throw new UserError("Não é possível bloquear o último admin ativo", "LAST_ADMIN", 409);
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      status,
      ...(status === "aprovado" ? { approvedAt: new Date(), approvedById: adminId } : {}),
    },
  });
  await audit(prisma, adminId, `user.${status}`, `target=${targetId}`);
  return updated;
}

/** Change a user's role, protecting the last active admin (§4.15). */
export async function setRole(
  prisma: PrismaClient,
  adminId: number,
  targetId: number,
  role: Role,
) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new UserError("Usuário não encontrado", "NAO_ENCONTRADO", 404);

  if (target.role === "admin" && role === "operador") {
    const others = await countActiveAdmins(prisma, targetId);
    if (others === 0) {
      throw new UserError("Não é possível rebaixar o último admin ativo", "LAST_ADMIN", 409);
    }
  }
  const updated = await prisma.user.update({ where: { id: targetId }, data: { role } });
  await audit(prisma, adminId, "user.role", `target=${targetId} role=${role}`);
  return updated;
}

export interface AuthOk {
  ok: true;
  user: { id: number; role: Role; name: string; email: string };
}
export interface AuthFail {
  ok: false;
  code: "CREDENCIAL" | "PENDENTE" | "REPROVADO" | "BLOQUEADO";
  message: string;
  httpStatus: number;
}

const STATUS_MESSAGES: Record<string, { code: AuthFail["code"]; message: string }> = {
  pendente: { code: "PENDENTE", message: "Conta aguardando aprovação do administrador." },
  reprovado: { code: "REPROVADO", message: "Cadastro reprovado. Fale com o administrador." },
  bloqueado: { code: "BLOQUEADO", message: "Conta bloqueada. Fale com o administrador." },
};

/** Authenticate for login. Returns the status-specific message, never "senha incorreta" for non-approved (§4.16). */
export async function authenticate(
  prisma: PrismaClient,
  email: string,
  password: string,
): Promise<AuthOk | AuthFail> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    return { ok: false, code: "CREDENCIAL", message: "E-mail ou senha incorretos.", httpStatus: 401 };
  }
  if (user.status !== "aprovado") {
    const m = STATUS_MESSAGES[user.status] ?? STATUS_MESSAGES.pendente;
    return { ok: false, code: m.code, message: m.message, httpStatus: 403 };
  }
  const okPass = await verifyPassword(user.passwordHash, password);
  if (!okPass) {
    return { ok: false, code: "CREDENCIAL", message: "E-mail ou senha incorretos.", httpStatus: 401 };
  }
  return {
    ok: true,
    user: { id: user.id, role: user.role as Role, name: user.name, email: user.email },
  };
}
