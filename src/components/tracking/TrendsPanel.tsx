import { useMemo, useState } from "react";
import { subDays, format, eachDayOfInterval } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { getDayTotals, type TrackingData, type TrackingSettings } from "@/lib/tracking";

const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];

const calConfig = {
  kcal: { label: "Calories", color: "var(--kcal)" },
} satisfies ChartConfig;

const macroConfig = {
  protein_g: { label: "Protein", color: "var(--protein)" },
  carbs_g:   { label: "Carbs",   color: "var(--carbs)"   },
  fat_g:     { label: "Fat",     color: "var(--fat)"     },
} satisfies ChartConfig;

const PIE_COLORS = ["var(--protein)", "var(--carbs)", "var(--fat)"];

export function TrendsPanel({
  diary,
  settings,
}: {
  diary: TrackingData;
  settings: TrackingSettings;
}) {
  const [range, setRange] = useState<Range>(7);

  const today = new Date();
  const days = useMemo(
    () =>
      eachDayOfInterval({ start: subDays(today, range - 1), end: today }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range],
  );

  // Per-day calorie + macro data
  const dailyRows = useMemo(
    () =>
      days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const totals = diary[key] ? getDayTotals(diary[key]) : null;
        return {
          label: format(day, range === 7 ? "EEE" : "MMM d"),
          kcal: totals ? Math.round(totals.kcal) : 0,
          protein_g: totals ? Math.round(totals.protein_g) : 0,
          carbs_g: totals ? Math.round(totals.carbs_g) : 0,
          fat_g: totals ? Math.round(totals.fat_g) : 0,
          logged: totals !== null && totals.kcal > 0,
        };
      }),
    [days, diary, range],
  );

  const loggedDays = dailyRows.filter((d) => d.logged);

  // Averages
  const avg = useMemo(() => {
    if (!loggedDays.length)
      return { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    const sum = loggedDays.reduce(
      (acc, d) => ({
        kcal: acc.kcal + d.kcal,
        protein_g: acc.protein_g + d.protein_g,
        carbs_g: acc.carbs_g + d.carbs_g,
        fat_g: acc.fat_g + d.fat_g,
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
    const n = loggedDays.length;
    return {
      kcal: Math.round(sum.kcal / n),
      protein_g: Math.round(sum.protein_g / n),
      carbs_g: Math.round(sum.carbs_g / n),
      fat_g: Math.round(sum.fat_g / n),
    };
  }, [loggedDays]);

  // Macro distribution (from calorie contributions)
  const totalProteinKcal = avg.protein_g * 4;
  const totalCarbsKcal   = avg.carbs_g * 4;
  const totalFatKcal     = avg.fat_g * 9;
  const totalMacroKcal   = totalProteinKcal + totalCarbsKcal + totalFatKcal;
  const pieData = totalMacroKcal > 0
    ? [
        { name: "Protein", pct: Math.round((totalProteinKcal / totalMacroKcal) * 100) },
        { name: "Carbs",   pct: Math.round((totalCarbsKcal   / totalMacroKcal) * 100) },
        { name: "Fat",     pct: Math.round((totalFatKcal     / totalMacroKcal) * 100) },
      ]
    : [];

  // Comparison rows: avg vs goal
  const comparisons = [
    { label: "Protein",  avg: avg.protein_g, goal: settings.dailyProteinTarget, unit: "g",    color: "var(--protein)" },
    { label: "Carbs",    avg: avg.carbs_g,   goal: settings.dailyCarbsTarget,   unit: "g",    color: "var(--carbs)"   },
    { label: "Fat",      avg: avg.fat_g,     goal: settings.dailyFatTarget,     unit: "g",    color: "var(--fat)"     },
  ];

  // Best / worst day
  const bestDay  = loggedDays.length ? loggedDays.reduce((a, b) => a.kcal > b.kcal ? a : b) : null;

  if (loggedDays.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="font-medium text-muted-foreground">No data in the last {range} days</p>
        <p className="mt-1 text-sm text-muted-foreground">Log some food to see your trends.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Range picker */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Range:</span>
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              range === r
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-muted"
            }`}
          >
            {r}d
          </button>
        ))}
      </div>

      {/* Calorie trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Calorie trend</CardTitle>
          <CardDescription>Daily calories logged over the last {range} days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={calConfig} className="h-[200px] w-full">
            <BarChart data={dailyRows} margin={{ left: 4, right: 16, top: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              {settings.dailyCalorieTarget !== 0 && (
                <ReferenceLine
                  y={settings.dailyCalorieTarget > 0 ? settings.dailyCalorieTarget : undefined}
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                  label={{ value: "Goal", position: "insideTopRight", fontSize: 10, opacity: 0.6 }}
                />
              )}
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(v) => [`${v} kcal`, "Calories"]}
                    hideLabel
                  />
                }
                labelFormatter={(l) => l}
              />
              <Bar dataKey="kcal" fill="var(--color-kcal)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Macro trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Macro trend</CardTitle>
          <CardDescription>Protein / carbs / fat per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={macroConfig} className="h-[200px] w-full">
            <BarChart data={dailyRows} margin={{ left: 4, right: 16, top: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${v}g`}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <ReferenceLine
                y={settings.dailyProteinTarget}
                stroke="var(--protein)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(v, name) => [
                      `${v}g`,
                      macroConfig[name as keyof typeof macroConfig]?.label ?? String(name),
                    ]}
                  />
                }
                labelFormatter={(l) => l}
              />
              <Bar dataKey="protein_g" fill="var(--color-protein_g)" radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="carbs_g"   fill="var(--color-carbs_g)"   radius={0}             stackId="a" />
              <Bar dataKey="fat_g"     fill="var(--color-fat_g)"     radius={0}             stackId="a" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Avg vs goal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Avg vs goal ({range}d)</CardTitle>
            <CardDescription>Based on {loggedDays.length} logged days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {comparisons.map(({ label, avg: a, goal, unit, color }) => {
              const pct = goal > 0 ? Math.min(1.5, a / goal) : 0;
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium">{label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {a} / {goal}{unit}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, pct * 100)}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Macro distribution donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Macro distribution</CardTitle>
            <CardDescription>Average calorie split from protein / carbs / fat</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-6">
                <PieChart width={120} height={120}>
                  <Pie
                    data={pieData}
                    dataKey="pct"
                    cx={55}
                    cy={55}
                    innerRadius={36}
                    outerRadius={55}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="space-y-2">
                  {pieData.map((seg, i) => (
                    <div key={seg.name} className="flex items-center gap-2 text-sm">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ background: PIE_COLORS[i] }}
                      />
                      <span>{seg.name}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground">
                        {seg.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{range}-day summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Days logged",   value: `${loggedDays.length} / ${range}` },
              { label: "Avg calories",  value: `${avg.kcal} kcal` },
              { label: "Avg protein",   value: `${avg.protein_g}g` },
              { label: "Best day",      value: bestDay ? `${bestDay.kcal} kcal` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-xl font-bold tabular-nums">{value}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
