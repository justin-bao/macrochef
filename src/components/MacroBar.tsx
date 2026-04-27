import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  target?: number;
  unit?: string;
  color: "kcal" | "protein" | "carbs" | "fat";
  compact?: boolean;
};

const colorClass: Record<Props["color"], string> = {
  kcal: "bg-[var(--kcal)]",
  protein: "bg-[var(--protein)]",
  carbs: "bg-[var(--carbs)]",
  fat: "bg-[var(--fat)]",
};

export function MacroBar({ label, value, target, unit = "g", color, compact }: Props) {
  const pct = target ? Math.min(100, Math.max(0, (value / target) * 100)) : 0;
  const diff = target ? value - target : 0;
  return (
    <div className={cn("space-y-1", compact && "space-y-0.5")}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{Math.round(value)}</span>
          {target ? (
            <>
              {" / "}
              {target}
              {unit}
            </>
          ) : (
            unit
          )}
        </span>
      </div>
      {target ? (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className={cn("h-full rounded-full transition-all", colorClass[color])} style={{ width: `${pct}%` }} />
          </div>
          {!compact && (
            <div className="text-xs text-muted-foreground">
              {diff === 0 ? "on target" : `${diff > 0 ? "+" : ""}${Math.round(diff)}${unit} vs target`}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
