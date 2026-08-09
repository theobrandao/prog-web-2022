import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import CampanhasClient, {
  type CampaignRow,
} from "../_components/CampanhasClient";

export const dynamic = "force-dynamic";

export default async function CampanhasPage() {
  await requireUser();

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows: CampaignRow[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate.toISOString(),
    channels: c.channels,
    productIds: c.productIds,
    status: c.status,
    note: c.note,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1>Campanhas</h1>
      <CampanhasClient campaigns={rows} />
    </div>
  );
}
