import { createFileRoute } from "@tanstack/react-router";
import { addDays, format, subDays } from "date-fns";
import { useState } from "react";
import { MacroDashboard } from "@/components/tracking/MacroDashboard";
import { FuelSummary } from "@/components/tracking/FuelSummary";
import { useLocalTracking } from "@/hooks/useLocalTracking";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "MacroChef — Macro analytics" },
      {
        name: "description",
        content:
          "Visualize your daily macro distribution, eating patterns, and cumulative intake vs goals.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [date, setDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { settings, getDay } = useLocalTracking();

  const day = getDay(date);
  const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">MacroChef analytics</p>
          <h1 className="text-3xl font-bold tracking-tight">Macro insights</h1>
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

      <div className="space-y-5">
        <FuelSummary day={day} settings={settings} />
        <MacroDashboard day={day} settings={settings} />
      </div>
    </div>
  );
}
