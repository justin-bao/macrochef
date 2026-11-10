import { createFileRoute } from "@tanstack/react-router";
import { UnifiedDashboard } from "@/components/tracking/UnifiedDashboard";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity & workouts — MacroChef" },
      { property: "og:title", content: "Activity & workouts — MacroChef" },
      { property: "og:description", content: "Track workouts alongside your nutrition goals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
