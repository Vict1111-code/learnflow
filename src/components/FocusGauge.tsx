import { motion } from 'framer-motion';

interface FocusGaugeProps {
  score: number;
  size?: number;
  label?: string;
  breakdown?: {
    consistency: number;
    completion: number;
    interruption: number;
    proofQuality: number;
  };
}

export default function FocusGauge({ score, size = 160, label = 'Focus Integrity', breakdown }: FocusGaugeProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return 'hsl(var(--xp-green))';
    if (s >= 50) return 'hsl(var(--streak-amber))';
    return 'hsl(var(--destructive))';
  };

  const color = getColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-display text-3xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(score)}
          </motion.span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </div>

      {breakdown && (
        <div className="grid w-full grid-cols-2 gap-2 text-xs">
          {[
            { label: 'Consistency', value: breakdown.consistency, color: 'text-primary' },
            { label: 'Completion', value: breakdown.completion, color: 'text-xp' },
            { label: 'Focus', value: breakdown.interruption, color: 'text-streak' },
            { label: 'Proof Quality', value: breakdown.proofQuality, color: 'text-level' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5">
              <span className="text-muted-foreground">{item.label}</span>
              <span className={`font-medium ${item.color}`}>{Math.round(item.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
