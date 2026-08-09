import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import UsersManager, { type UserRow } from "../_components/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  const rows: UserRow[] = users;

  return (
    <div>
      <h1>Usuários</h1>
      <UsersManager users={rows} />
    </div>
  );
}
