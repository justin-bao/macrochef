import { addDays, format, subDays } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ActivityLogger } from "@/components/tracking/ActivityLogger";
import { ActivityPanel } from "@/components/tracking/ActivityPanel";
import { FoodLogModal } from "@/components/tracking/FoodLogModal";
import { FuelSummary } from "@/components/tracking/FuelSummary";
import { MealLogSection } from "@/components/tracking/MealLogSection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { MacroInputs, type MacrosOptional } from "@/components/MacroInputs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocalTracking } from "@/hooks/useLocalTracking";
import { getBurnedCalories, getDayTotals, type MealType } from "@/lib/tracking";
import {
  CalendarDays,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Target,
} from "lucide-react";

export function UnifiedDashboard({ focus = "all" }: { focus?: "all" | "activity" }) {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [foodOpen, setFoodOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeMeal, setActiveMeal] = useState<MealType>("breakfast");
  const [query, setQuery] = useState("");
  const {
    settings,
    getDay,
    addFoodItems,
    removeFoodItem,
    addActivity,
    removeActivity,
    updateActivity,
  } = useLocalTracking();

  const day = getDay(date);
  const totals = getDayTotals(day);
  const burned = getBurnedCalories(day);
  const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const remaining: MacrosOptional = useMemo(
    () => ({
      kcal: Math.max(0, Math.round(settings.dailyCalorieTarget - (totals.kcal - burned))),
      protein_g: Math.max(0, Math.round(settings.dailyProteinTarget - totals.protein_g)),
      carbs_g: Math.max(0, Math.round(settings.dailyCarbsTarget - totals.carbs_g)),
      fat_g: Math.max(0, Math.round(settings.dailyFatTarget - totals.fat_g)),
    }),
    [burned, settings, totals],
  );
  const [target, setTarget] = useState<MacrosOptional>(remaining);

  useEffect(() => {
    setTarget((prev) =>
      prev.kcal === remaining.kcal &&
      prev.protein_g === remaining.protein_g &&
      prev.carbs_g === remaining.carbs_g &&
      prev.fat_g === remaining.fat_g
        ? prev
        : remaining,
    );
  }, [remaining]);

  const openFood = (mealType: MealType) => {
    setActiveMeal(mealType);
    setFoodOpen(true);
  };

  const findFood = (event: React.FormEvent) => {
    event.preventDefault();
    navigate({
      to: "/search",
      search: {
        mode: "recipes",
        q: query.trim(),
        kcal: target.kcal ?? remaining.kcal ?? undefined,
        p: target.protein_g ?? remaining.protein_g ?? undefined,
        c: target.carbs_g ?? remaining.carbs_g ?? undefined,
        f: target.fat_g ?? remaining.fat_g ?? undefined,
        subs: true,
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">MacroChef unified</p>
          <h1 className="text-3xl font-bold tracking-tight">
            {focus === "activity" ? "Training log" : "Fuel, food, and training"}
          </h1>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <Button variant="ghost" size="icon" onClick={() => setDate((d) => subDays(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="gap-2 px-3">
                <CalendarDays className="h-4 w-4" />
                {isToday ? "Today" : format(date, "EEE, MMM d")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(selectedDate) => {
                  if (!selectedDate) return;
                  setDate(selectedDate);
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          {!isToday && (
            <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>
              Today
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setDate((d) => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        <FuelSummary day={day} settings={settings} />

        {focus !== "activity" && (
          <Card className="p-5">
            <form
              onSubmit={findFood}
              className="grid gap-4 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end"
            >
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <ChefHat className="h-4 w-4 text-primary" />
                  Decide what to eat next
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="dinner, high protein, thai..."
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Target className="h-4 w-4 text-primary" />
                  Remaining macro target
                </div>
                <MacroInputs value={target} onChange={setTarget} />
              </div>
              <Button type="submit" className="gap-2">
                <Search className="h-4 w-4" />
                Find matches
              </Button>
            </form>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          {focus !== "activity" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Food log</h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => openFood("snacks")}
                >
                  <Plus className="h-4 w-4" />
                  Quick add
                </Button>
              </div>
              {day.meals.map((meal) => (
                <MealLogSection
                  key={meal.type}
                  meal={meal}
                  onAdd={openFood}
                  onRemove={(mealType, itemId) => removeFoodItem(date, mealType, itemId)}
                />
              ))}
            </div>
          )}

          <div className={focus === "activity" ? "lg:col-span-2" : ""}>
            <ActivityPanel
              activities={day.activities}
              onAdd={() => setActivityOpen(true)}
              onRemove={(activityId) => removeActivity(date, activityId)}
              onUpdate={(activity) => updateActivity(date, activity)}
            />
            {focus !== "activity" && (
              <div className="mt-3 rounded-lg border bg-muted/25 p-4 text-sm text-muted-foreground">
                Recipes and restaurant combos can be logged into this same food diary, so choosing
                food and tracking food stay in one loop.
                <Link
                  to="/search"
                  search={{ mode: "recipes", q: "", subs: true }}
                  className="ml-1 font-medium text-primary"
                >
                  Browse options
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <FoodLogModal
        open={foodOpen}
        onOpenChange={setFoodOpen}
        onAdd={(items) => addFoodItems(date, activeMeal, items)}
      />
      <ActivityLogger
        open={activityOpen}
        onOpenChange={setActivityOpen}
        onAdd={(activity) => addActivity(date, activity)}
        profile={{
          weight: settings.weight,
          height: settings.height,
          age: settings.age,
          sex: settings.sex,
          unitSystem: settings.unitSystem,
        }}
      />
    </div>
  );
}
