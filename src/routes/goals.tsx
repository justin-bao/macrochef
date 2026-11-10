import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/goals")({
  head: () => ({ meta: [
    { title: "Nutrition goals — MacroChef" },
    { name: "description", content: "Manage your personal calorie and macronutrient targets." },
    { property: "og:title", content: "Nutrition goals — MacroChef" },
    { property: "og:description", content: "Manage your personal calorie and macronutrient targets." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: GoalsRedirect,
});

function GoalsRedirect() {
  return <Navigate to="/profile" replace />;
}
