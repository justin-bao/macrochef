import { createFileRoute } from "@tanstack/react-router";
import { UnifiedDashboard } from "@/components/tracking/UnifiedDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MacroChef — Fuel, food, and training" },
      {
        name: "description",
        content:
          "Track food and workouts, then use MacroChef to decide what to eat next based on the macros you have left.",
      },
      { property: "og:title", content: "MacroChef — Fuel, food, and training" },
      {
        property: "og:description",
        content:
          "A unified macro tracker, meal decision engine, and activity log for running, cardio, and lifting.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return <UnifiedDashboard />;
}
