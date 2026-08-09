import { requireUser } from "@/lib/session";
import RelatoriosClient from "../_components/RelatoriosClient";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  await requireUser();

  return (
    <div>
      <h1>Relatórios</h1>
      <RelatoriosClient />
    </div>
  );
}
