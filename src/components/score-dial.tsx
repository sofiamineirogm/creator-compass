import { cn } from "@/lib/utils";

interface ScoreDialProps {
  value: number;
  label?: string;
  size?: number;
  className?: string;
}

export function ScoreDial({ value, label, size = 168, className }: ScoreDialProps) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="dial-sunset" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ember)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--muted)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#dial-sunset)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s var(--ease-out-soft)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-semibold tabular-nums">{Math.round(clamped)}</span>
        {label ? (
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ScoreBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-ember"
        style={{ width: `${clamped}%`, transition: "width 1s var(--ease-out-soft)" }}
      />
    </div>
  );
}
