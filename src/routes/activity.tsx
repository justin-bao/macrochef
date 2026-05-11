import { createFileRoute } from "@tanstack/react-router";
import { UnifiedDashboard } from "@/components/tracking/UnifiedDashboard";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity & workouts — MacroChef" },
      {
        name: "description",
        content: "Track running, cardio, weightlifting, and gym activity alongside your food log.",
      },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  return <UnifiedDashboard focus="activity" />;
}
