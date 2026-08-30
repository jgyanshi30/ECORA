import type { DailyCount } from "@/lib/admin/analytics";

/** A plain CSS vertical-bar trend chart for the last N days — no charting library (see bar-list.tsx). */
export function TrendChart({ data, days }: { data: DailyCount[]; days: number }) {
  const byDate = new Map(data.map((d) => [d.date, d.count]));
  const series: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, count: byDate.get(key) ?? 0 });
  }
  const max = Math.max(1, ...series.map((s) => s.count));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No submissions in the last {days} days.</p>;
  }

  return (
    <div className="flex h-32 items-end gap-0.5">
      {series.map((s) => (
        <div key={s.date} className="group relative flex h-full flex-1 items-end" title={`${s.date}: ${s.count}`}>
          <div
            className="w-full rounded-t bg-primary transition-[height]"
            style={{ height: `${Math.max((s.count / max) * 100, s.count > 0 ? 4 : 1)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
