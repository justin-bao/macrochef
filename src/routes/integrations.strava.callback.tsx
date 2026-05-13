import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { connectStrava } from "@/lib/activity-integrations.functions";

export const Route = createFileRoute("/integrations/strava/callback")({
  head: () => ({
    meta: [{ title: "Connecting Strava — MacroChef" }],
  }),
  component: StravaCallbackPage,
});

function StravaCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing Strava connection...");

  useEffect(() => {
    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const expectedState = window.localStorage.getItem("macrochef-strava-oauth-state");
      window.localStorage.removeItem("macrochef-strava-oauth-state");

      if (!code || !state || state !== expectedState) {
        throw new Error("Strava authorization could not be verified.");
      }

      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Sign in before connecting Strava.");

      await connectStrava({
        data: {
          accessToken,
          code,
          redirectUri: `${window.location.origin}/integrations/strava/callback`,
        },
      });
      window.localStorage.setItem("macrochef-strava-sync-pending", "1");
      setMessage("Strava connected. Returning to your profile...");
      toast.success("Strava connected.");
      setTimeout(() => navigate({ to: "/profile" }), 600);
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
