import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { DailyAggregate } from '@/lib/database';

interface Props {
  data: DailyAggregate[];
  height?: number;
}

const fmtDay = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short' });
};

export default function FocusTrendChart({ data, height = 180 }: Props) {
  const chartData = data.map(d => ({
    day: fmtDay(d.date),
    Focus: +(d.focusSeconds / 3600).toFixed(2),
    Distractions: d.interruptions,
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--streak))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--streak))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Area type="monotone" dataKey="Focus" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#focusGrad)" />
          <Area type="monotone" dataKey="Distractions" stroke="hsl(var(--streak))" strokeWidth={1.5} fill="url(#distGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
