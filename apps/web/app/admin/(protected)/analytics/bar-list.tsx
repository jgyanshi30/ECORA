export interface BarListItem {
  label: string;
  count: number;
  color?: string;
}

/** A plain CSS horizontal bar chart — no charting library, per CLAUDE.md §2's "no heavy motion, no glassmorphism" and to avoid an extra dependency for this dashboard. Every number here is real (CLAUDE.md §0). */
export function BarList({ items }: { items: BarListItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate text-muted-foreground" title={item.label}>
            {item.label}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.count / max) * 100}%`, backgroundColor: item.color ?? "#0F5C4E" }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-medium tabular-nums">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}
