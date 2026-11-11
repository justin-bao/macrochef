import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/integrations/strava/callback")({
  head: () => ({
    meta: [{ title: "Connecting Strava — MacroChef" },
      { name: "description", content: "Complete your Strava connection to MacroChef." },
      { property: "og:title", content: "Connecting Strava — MacroChef" },
      { property: "og:description", content: "Connect Strava activity to your MacroChef food log." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }],
  }),
  component: StravaCallbackPage,
});

function StravaCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing Strava connection...");

  useEffect(() => {
    const finish = async () => {
      window.history.replaceState(null, "", window.location.pathname);
      setMessage("This connection link has expired. Connect Strava again from Profile.");
    };

    finish().catch((error) => {
      const text = error instanceof Error ? error.message : "Could not connect Strava.";
      setMessage(text);
      toast.error(text);
    });
  }, [navigate]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-10">
      <Card className="w-full p-6 text-center">
        <h1 className="text-xl font-semibold">Strava</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </Card>
    </div>
  );
}
