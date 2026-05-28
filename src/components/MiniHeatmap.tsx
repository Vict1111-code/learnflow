import { useMemo } from 'react';

interface Props {
  /** Map of YYYY-MM-DD -> total focus seconds */
  data: Map<string, number>;
  weeks?: number;
  className?: string;
}

/** Compact GitHub-style heatmap of focus time, sized to fit a dashboard card. */
export default function MiniHeatmap({ data, weeks = 14, className }: Props) {
  const days = useMemo(() => {
    const out: { date: string; seconds: number }[] = [];
    const today = new Date();
    const total = weeks * 7;
    for (let i = total - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, seconds: data.get(key) || 0 });
    }
    return out;
  }, [data, weeks]);

  const max = Math.max(1, ...days.map(d => d.seconds));
  const intensity = (s: number) => {
    if (s <= 0) return 0;
    const r = s / max;
    if (r > 0.75) return 4;
    if (r > 0.5) return 3;
    if (r > 0.25) return 2;
    return 1;
  };
  const cls = ['bg-muted/30', 'bg-primary/20', 'bg-primary/40', 'bg-primary/70', 'bg-primary'];

  // Build columns of 7
  const cols: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));

  return (
    <div className={className}>
      <div className="flex gap-[3px]">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map(d => (
              <div
                key={d.date}
                title={`${d.date} — ${Math.round(d.seconds / 60)} min`}
                className={`h-2.5 w-2.5 rounded-[2px] ${cls[intensity(d.seconds)]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-[3px]">
          {cls.map((c, i) => (
            <div key={i} className={`h-2 w-2 rounded-[2px] ${c}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
