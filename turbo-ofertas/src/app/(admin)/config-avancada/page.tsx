import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import SettingsForm, {
  type SettingsValues,
} from "../_components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function ConfigAvancadaPage() {
  const session = await requireUser();
  if (session.role !== "admin") redirect("/hoje");

  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const initial: SettingsValues = {
    routeAllViaSite: map.routeAllViaSite ?? "false",
    handle: map.handle ?? "",
    weeklyReportDay: map.weeklyReportDay ?? "",
  };

  return (
    <div>
      <h1>Config Avançada</h1>
      <p className="muted">
        Configurações avançadas armazenadas na tabela chave-valor
        (<code>Setting</code>). Acesso restrito a administradores.
      </p>

      <SettingsForm initial={initial} />
    </div>
  );
}
