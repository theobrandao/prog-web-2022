import Link from "next/link";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { TZ } from "@/lib/dates";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function parseMonth(raw: string | undefined): DateTime {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const dt = DateTime.fromFormat(raw, "yyyy-MM", { zone: TZ });
    if (dt.isValid) return dt.startOf("month");
  }
  return DateTime.now().setZone(TZ).startOf("month");
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireUser();

  const params = await searchParams;
  const monthStart = parseMonth(params.month);
  const monthEnd = monthStart.endOf("month");
  const nextMonthStart = monthStart.plus({ months: 1 });

  const rangeStart = monthStart.toJSDate();
  const rangeEnd = nextMonthStart.toJSDate();

  const [posts, campaigns] = await Promise.all([
    prisma.post.findMany({
      where: { date: { gte: rangeStart, lt: rangeEnd } },
      select: { id: true, date: true },
    }),
    prisma.campaign.findMany({
      where: {
        startDate: { lte: monthEnd.toJSDate() },
        endDate: { gte: rangeStart },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    }),
  ]);

  // Count posts per day-of-month (in TZ).
  const postCounts = new Map<number, number>();
  for (const p of posts) {
    const day = DateTime.fromJSDate(p.date, { zone: TZ }).day;
    postCounts.set(day, (postCounts.get(day) ?? 0) + 1);
  }

  const daysInMonth = monthStart.daysInMonth ?? 30;
  const firstWeekday = monthStart.weekday % 7; // luxon: 1=Mon..7=Sun → 0=Sun..6=Sat
  const totalCells = firstWeekday + daysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const cells: (number | null)[] = [];
  for (let i = 0; i < rows * 7; i++) {
    const dayNum = i - firstWeekday + 1;
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null);
  }

  function campaignsOnDay(day: number) {
    const dayStart = monthStart.set({ day }).startOf("day");
    return campaigns.filter((c) => {
      const cs = DateTime.fromJSDate(c.startDate, { zone: TZ }).startOf("day");
      const ce = DateTime.fromJSDate(c.endDate, { zone: TZ }).endOf("day");
      return dayStart >= cs && dayStart <= ce;
    });
  }

  const prevMonth = monthStart.minus({ months: 1 }).toFormat("yyyy-MM");
  const nextMonth = nextMonthStart.toFormat("yyyy-MM");
  const today = DateTime.now().setZone(TZ);
  const isCurrentMonth =
    today.year === monthStart.year && today.month === monthStart.month;

  return (
    <div>
      <h1>Calendário de publicações</h1>

      <div
        className="row"
        style={{ alignItems: "center", marginBottom: "1rem" }}
      >
        <Link className="btn ghost small" href={`/calendario?month=${prevMonth}`}>
          ← Anterior
        </Link>
        <strong style={{ minWidth: "12rem", textAlign: "center" }}>
          {MONTHS[monthStart.month - 1]} {monthStart.year}
        </strong>
        <Link className="btn ghost small" href={`/calendario?month=${nextMonth}`}>
          Próximo →
        </Link>
      </div>

      <div className="cal-grid cal-head">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-weekday">
            {w}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className="cal-cell cal-empty" />;
          }
          const count = postCounts.get(day) ?? 0;
          const dayCampaigns = campaignsOnDay(day);
          const isToday = isCurrentMonth && today.day === day;
          return (
            <div
              key={idx}
              className={`card cal-cell${isToday ? " cal-today" : ""}`}
            >
              <div className="cal-daynum">{day}</div>
              {count > 0 && (
                <div className="badge accent cal-count">
                  {count} {count === 1 ? "post" : "posts"}
                </div>
              )}
              {dayCampaigns.map((c) => (
                <div key={c.id} className="badge ok cal-campaign" title={c.name}>
                  {c.name}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
