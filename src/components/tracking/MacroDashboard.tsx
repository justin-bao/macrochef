import { useMemo, useState } from "react";
import { parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { getGarminCalorieBreakdown, getBurnTimeSeries } from "@/lib/garmin-calories";
import { sumFood, type TrackingDay, type TrackingSettings } from "@/lib/tracking";

type MacroKey = "kcal" | "protein_g" | "carbs_g" | "fat_g";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"] as const;

const MACRO_FIELDS: Array<{ key: MacroKey; label: string; unit: string }> = [
  { key: "kcal", label: "Calories", unit: "kcal" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
];

const mealConfig = {
  breakfast: { label: "Breakfast", color: "var(--kcal)" },
  lunch: { label: "Lunch", color: "var(--protein)" },
  dinner: { label: "Dinner", color: "var(--carbs)" },
  snacks: { label: "Snacks", color: "var(--fat)" },
} satisfies ChartConfig;

const macroConfig = {
  kcal: { label: "Calories", color: "var(--kcal)" },
  protein_g: { label: "Protein", color: "var(--protein)" },
  carbs_g: { label: "Carbs", color: "var(--carbs)" },
  fat_g: { label: "Fat", color: "var(--fat)" },
} satisfies ChartConfig;

const progressConfig = {
  kcalPct: { label: "Calories", color: "var(--kcal)" },
  proteinPct: { label: "Protein", color: "var(--protein)" },
  carbsPct: { label: "Carbs", color: "var(--carbs)" },
  fatPct: { label: "Fat", color: "var(--fat)" },
} satisfies ChartConfig;

const burnConfig = {
  burned: { label: "Burned so far", color: "var(--fat)" },
} satisfies ChartConfig;

function hourLabel(hour: number) {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

export function MacroDashboard({
  day,
  settings,
}: {
  day: TrackingDay;
  settings: TrackingSettings;
}) {
  const [timingMacro, setTimingMacro] = useState<MacroKey>("kcal");

  const profile = {
    weight: settings.weight,
    height: settings.height,
    age: settings.age,
    sex: settings.sex,
    unitSystem: settings.unitSystem,
  };

  const allItemsWithMeal = useMemo(
    () =>
      day.meals.flatMap((meal) =>
        meal.items.map((item) => ({ ...item, mealType: meal.type })),
      ),
    [day],
  );

  const hasFood = allItemsWithMeal.length > 0;

  // Calorie burn timeline (Garmin model)
  const burnBreakdown = useMemo(() => getGarminCalorieBreakdown(day, profile), [day, profile]);
  const burnTimeSeries = useMemo(() => getBurnTimeSeries(day, profile), [day, profile]);
  const hasBurnData = burnTimeSeries.length > 0;

  // Chart 1: per-meal % distribution for each macro
  const mealDistData = useMemo(() => {
    if (!hasFood) return [];

    const mealTotals = Object.fromEntries(
      MEAL_TYPES.map((mealType) => {
        const meal = day.meals.find((m) => m.type === mealType);
        return [
          mealType,
          meal ? sumFood(meal.items) : { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        ];
      }),
    ) as Record<(typeof MEAL_TYPES)[number], ReturnType<typeof sumFood>>;

    return MACRO_FIELDS.map(({ key, label }) => {
      const total = MEAL_TYPES.reduce((sum, mt) => sum + mealTotals[mt][key], 0);
      if (total === 0) return { macro: label, breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };
      return {
        macro: label,
        breakfast: Math.round((mealTotals.breakfast[key] / total) * 100),
        lunch: Math.round((mealTotals.lunch[key] / total) * 100),
        dinner: Math.round((mealTotals.dinner[key] / total) * 100),
        snacks: Math.round((mealTotals.snacks[key] / total) * 100),
      };
    });
  }, [day, hasFood]);

  // Also compute absolute per-meal values for the summary table
  const mealAbsData = useMemo(() => {
    return MEAL_TYPES.map((mealType) => {
      const meal = day.meals.find((m) => m.type === mealType);
      const totals = meal ? sumFood(meal.items) : { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
      return { mealType, ...totals };
    });
  }, [day]);

  // Chart 2: histogram — amount consumed per hour of day
  const timingData = useMemo(() => {
    if (!hasFood) return [];

    const buckets: Record<
      number,
      { kcal: number; protein_g: number; carbs_g: number; fat_g: number }
    > = {};

    for (const item of allItemsWithMeal) {
      let hour: number;
      try {
        hour = parseISO(item.loggedAt).getHours();
      } catch {
        hour = 12;
      }
      if (!buckets[hour]) {
        buckets[hour] = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
      }
      buckets[hour].kcal += item.kcal;
      buckets[hour].protein_g += item.protein_g;
      buckets[hour].carbs_g += item.carbs_g;
      buckets[hour].fat_g += item.fat_g;
    }

    const hours = Object.keys(buckets).map(Number).sort((a, b) => a - b);
    if (!hours.length) return [];

    const minHour = Math.max(0, hours[0] - 1);
    const maxHour = Math.min(23, hours[hours.length - 1] + 1);

    return Array.from({ length: maxHour - minHour + 1 }, (_, i) => {
      const hour = minHour + i;
      const b = buckets[hour] ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
      return {
        hour: hourLabel(hour),
        kcal: Math.round(b.kcal),
        protein_g: Math.round(b.protein_g),
        carbs_g: Math.round(b.carbs_g),
        fat_g: Math.round(b.fat_g),
      };
    });
  }, [allItemsWithMeal, hasFood]);

  // Chart 3: cumulative intake vs food budget (as % of goal)
  // Food budget = projected full-day burn + net calorie goal adjustment.
  // dailyCalorieTarget is net: 0 = break even, −500 = deficit, +500 = surplus.
  const foodBudgetKcal = burnBreakdown.projectedDayBurn + settings.dailyCalorieTarget;

  const cumulativeData = useMemo(() => {
    if (!hasFood) return [];

    const sorted = [...allItemsWithMeal].sort(
      (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
    );

    let cumKcal = 0,
      cumProtein = 0,
      cumCarbs = 0,
      cumFat = 0;

    return sorted.map((item) => {
      cumKcal += item.kcal;
      cumProtein += item.protein_g;
      cumCarbs += item.carbs_g;
      cumFat += item.fat_g;

      let timeLabel: string;
      try {
        const d = parseISO(item.loggedAt);
        timeLabel = `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
      } catch {
        timeLabel = "—";
      }

      return {
        time: timeLabel,
        // Calorie % is vs food budget (BMR + active calories + net goal)
        kcalPct: foodBudgetKcal > 0 ? Math.round((cumKcal / foodBudgetKcal) * 100) : 0,
        proteinPct:
          settings.dailyProteinTarget > 0
            ? Math.round((cumProtein / settings.dailyProteinTarget) * 100)
            : 0,
        carbsPct:
          settings.dailyCarbsTarget > 0
            ? Math.round((cumCarbs / settings.dailyCarbsTarget) * 100)
            : 0,
        fatPct:
          settings.dailyFatTarget > 0
            ? Math.round((cumFat / settings.dailyFatTarget) * 100)
            : 0,
      };
    });
  }, [allItemsWithMeal, hasFood, settings, foodBudgetKcal]);

  const maxProgressPct = useMemo(() => {
    if (!cumulativeData.length) return 110;
    const last = cumulativeData[cumulativeData.length - 1];
    return Math.max(110, last.kcalPct, last.proteinPct, last.carbsPct, last.fatPct) + 5;
  }, [cumulativeData]);

  if (!hasFood && !hasBurnData) {
    return (
      <Card className="p-8 text-center">
        <p className="font-medium text-muted-foreground">No food logged for this day</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Start logging meals to see your macro analytics.
        </p>
      </Card>
    );
  }

  const timingField = MACRO_FIELDS.find((f) => f.key === timingMacro)!;

  return (
    <Tabs defaultValue={hasFood ? "distribution" : "burn"} className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="distribution" disabled={!hasFood}>Distribution</TabsTrigger>
        <TabsTrigger value="timing" disabled={!hasFood}>Timing</TabsTrigger>
        <TabsTrigger value="progress" disabled={!hasFood}>Progress</TabsTrigger>
        <TabsTrigger value="burn">Burn</TabsTrigger>
      </TabsList>

      {/* Tab 1: per-meal macro distribution */}
      <TabsContent value="distribution" className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Macro distribution by meal</CardTitle>
            <CardDescription>
              Share of each macronutrient contributed by breakfast, lunch, dinner, and snacks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={mealConfig} className="h-[240px] w-full">
              <BarChart
                data={mealDistData}
                layout="vertical"
                margin={{ left: 4, right: 16, top: 4, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} strokeOpacity={0.4} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="macro"
                  width={62}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        `${value}%`,
                        mealConfig[name as keyof typeof mealConfig]?.label ?? String(name),
                      ]}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="breakfast" stackId="a" fill="var(--color-breakfast)" radius={0} />
                <Bar dataKey="lunch" stackId="a" fill="var(--color-lunch)" radius={0} />
                <Bar dataKey="dinner" stackId="a" fill="var(--color-dinner)" radius={0} />
                <Bar
                  dataKey="snacks"
                  stackId="a"
                  fill="var(--color-snacks)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Absolute values table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Meal totals</CardTitle>
            <CardDescription>Absolute amounts logged per meal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Meal</th>
                    <th className="pb-2 text-right font-medium">Calories</th>
                    <th className="pb-2 text-right font-medium">Protein</th>
                    <th className="pb-2 text-right font-medium">Carbs</th>
                    <th className="pb-2 text-right font-medium">Fat</th>
                  </tr>
                </thead>
                <tbody>
                  {mealAbsData.map(({ mealType, kcal, protein_g, carbs_g, fat_g }) => {
                    const hasItems = kcal > 0 || protein_g > 0 || carbs_g > 0 || fat_g > 0;
                    if (!hasItems) return null;
                    const label =
                      mealType.charAt(0).toUpperCase() + mealType.slice(1);
                    return (
                      <tr key={mealType} className="border-b last:border-0">
                        <td className="py-2 font-medium">{label}</td>
                        <td className="py-2 text-right tabular-nums">{Math.round(kcal)} kcal</td>
                        <td className="py-2 text-right tabular-nums text-[var(--protein)]">
                          {Math.round(protein_g)}g
                        </td>
                        <td className="py-2 text-right tabular-nums text-[var(--carbs)]">
                          {Math.round(carbs_g)}g
                        </td>
                        <td className="py-2 text-right tabular-nums text-[var(--fat)]">
                          {Math.round(fat_g)}g
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab 2: hourly histogram */}
      <TabsContent value="timing">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">When you ate today</CardTitle>
            <CardDescription>
              Non-cumulative intake per hour — see which times of day had the most consumption
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              {MACRO_FIELDS.map(({ key, label }) => (
                <Button
                  key={key}
                  size="sm"
                  variant={timingMacro === key ? "default" : "outline"}
                  onClick={() => setTimingMacro(key)}
                  className="h-7 px-3 text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
            <ChartContainer config={macroConfig} className="h-[240px] w-full">
              <BarChart
                data={timingData}
                margin={{ left: 4, right: 16, top: 4, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeOpacity={0.4} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    timingMacro === "kcal" ? `${v}` : `${v}g`
                  }
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [
                        `${value}${timingMacro === "kcal" ? " kcal" : "g"}`,
                        timingField.label,
                      ]}
                      hideLabel
                    />
                  }
                  labelFormatter={(label) => `${label}`}
                />
                <Bar
                  dataKey={timingMacro}
                  fill={`var(--color-${timingMacro})`}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab 3: cumulative progress vs goals */}
      <TabsContent value="progress">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cumulative intake vs goals</CardTitle>
            <CardDescription>
              How intake builds throughout the day as a percentage of your daily targets — dashed
              line marks 100%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={progressConfig} className="h-[280px] w-full">
              <LineChart
                data={cumulativeData}
                margin={{ left: 4, right: 16, top: 4, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeOpacity={0.4} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, maxProgressPct]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <ReferenceLine
                  y={100}
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                  label={{
                    value: "Goal",
                    position: "insideTopRight",
                    fontSize: 10,
                    opacity: 0.6,
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        `${value}%`,
                        progressConfig[name as keyof typeof progressConfig]?.label ??
                          String(name),
                      ]}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="kcalPct"
                  stroke="var(--color-kcalPct)"
                  strokeWidth={2}
                  dot={cumulativeData.length <= 20 ? { r: 3 } : false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="proteinPct"
                  stroke="var(--color-proteinPct)"
                  strokeWidth={2}
                  dot={cumulativeData.length <= 20 ? { r: 3 } : false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="carbsPct"
                  stroke="var(--color-carbsPct)"
                  strokeWidth={2}
                  dot={cumulativeData.length <= 20 ? { r: 3 } : false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="fatPct"
                  stroke="var(--color-fatPct)"
                  strokeWidth={2}
                  dot={cumulativeData.length <= 20 ? { r: 3 } : false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab 4: Calorie burn timeline */}
      <TabsContent value="burn">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Calories burned — today so far</CardTitle>
            <CardDescription>
              BMR accruing linearly · walking spread 6am–10pm · activities credited at end time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Burn breakdown summary */}
            <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-md bg-muted/40 px-4 py-3 text-xs text-muted-foreground sm:grid-cols-4">
              <div>
                <div className="font-medium text-foreground">{burnBreakdown.bmrPerDay} kcal</div>
                <div>BMR / day</div>
              </div>
              <div>
                <div className="font-medium text-foreground">{Math.round(burnBreakdown.bmrPerHour)} kcal</div>
                <div>BMR / hour</div>
              </div>
              <div>
                <div className="font-medium text-foreground">{burnBreakdown.walkingCalories} kcal</div>
                <div>Walking ({burnBreakdown.effectiveWalkingDistanceMi} mi)</div>
              </div>
              <div>
                <div className="font-medium text-foreground">{burnBreakdown.projectedDayBurn} kcal</div>
                <div>Projected total</div>
              </div>
            </div>

            {hasBurnData ? (
              <ChartContainer config={burnConfig} className="h-[240px] w-full">
                <LineChart
                  data={burnTimeSeries}
                  margin={{ left: 4, right: 16, top: 4, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeOpacity={0.4} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `${v}`}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <ReferenceLine
                    y={burnBreakdown.projectedDayBurn}
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                    label={{
                      value: "Projected",
                      position: "insideTopRight",
                      fontSize: 10,
                      opacity: 0.6,
                    }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [`${value} kcal`, "Burned so far"]}
                        hideLabel
                      />
                    }
                    labelFormatter={(label) => `${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="burned"
                    stroke="var(--color-burned)"
                    strokeWidth={2}
                    dot={burnTimeSeries.length <= 20 ? { r: 3 } : false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="rounded-md bg-muted/35 py-6 text-center text-sm text-muted-foreground">
                Enter today's Garmin distance in the activity panel to see your burn curve.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
