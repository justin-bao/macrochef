import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/goals")({
  component: GoalsRedirect,
});

function GoalsRedirect() {
  return <Navigate to="/profile" replace />;
}
