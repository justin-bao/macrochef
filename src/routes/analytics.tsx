import { createFileRoute } from "@tanstack/react-router";
import { addDays, format, subDays } from "date-fns";
import { useState } from "react";
import { MacroDashboard } from "@/components/tracking/MacroDashboard";
import { FuelSummary } from "@/components/tracking/FuelSummary";
import { TrendsPanel } from "@/components/tracking/TrendsPanel";
import { useLocalTracking } from "@/hooks/useLocalTracking";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, ChevronLeft, ChevronRight, BarChart2, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "MacroChef — Analytics" },
      {
        name: "description",
        content:
          "Visualize your daily macro distribution, eating patterns, calorie trends, and progress over time.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [date, setDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { settings, getDay, diary } = useLocalTracking();

  const day = getDay(date);
  const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">MacroChef analytics</p>
        <h1 className="text-3xl font-bold tracking-tight">Macro insights</h1>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="daily" className="gap-2">
            <BarChart2 className="h-4 w-4" />
            Daily detail
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends over time
          </TabsTrigger>
        </TabsList>

        {/* ── Daily detail tab ─────────────────────────────────────────── */}
        <TabsContent value="daily" className="space-y-5">
          {/* Date picker */}
          <div className="flex items-center justify-end">
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
                    onSelect={(d) => {
                      if (!d) return;
                      setDate(d);
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

          <FuelSummary day={day} settings={settings} />
          <MacroDashboard day={day} settings={settings} />
        </TabsContent>

        {/* ── Trends over time tab ─────────────────────────────────────── */}
        <TabsContent value="trends">
          <TrendsPanel diary={diary} settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
