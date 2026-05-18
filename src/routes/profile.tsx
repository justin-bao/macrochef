import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AtSign,
  LinkIcon,
  RefreshCw,
  Ruler,
  Save,
  Target,
  Unlink,
  UserRound,
  Weight,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MacroInputs } from "@/components/MacroInputs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  disconnectActivityProvider,
  fetchConnectedActivities,
  getActivityConnections,
} from "@/lib/activity-integrations.functions";
import { normalizeImportedActivity } from "@/lib/activity-imports";
import { useAuth } from "@/lib/auth";
import type { Macros } from "@/lib/macros";
import type { ProfileGoal, Sex } from "@/lib/tracking";
import { useLocalTracking } from "@/hooks/useLocalTracking";

type ActivityConnection = {
  provider: "strava";
  connected: boolean;
  providerUsername?: string;
  connectedAt?: string;
};

const STRAVA_LAST_SYNC_KEY = "macrochef-strava-last-sync-at";
const STRAVA_PENDING_SYNC_KEY = "macrochef-strava-sync-pending";
const STRAVA_AUTO_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

const PROFILE_GOALS: Record<ProfileGoal, string> = {
  lose_body_fat: "Lose body fat",
  build_muscle: "Build muscle",
  maintain_weight: "Maintain weight",
  fuel_runs: "Fuel runs",
  general_nutrition: "Improve general nutrition",
};

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — MacroChef" },
      {
        name: "description",
        content: "Set your MacroChef goals and body profile.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const { addActivities } = useLocalTracking();
  const navigate = useNavigate();
  const [macros, setMacros] = useState<Macros>({
    kcal: 2000,
    protein_g: 150,
    carbs_g: 200,
    fat_g: 65,
  });
  const [profile, setProfile] = useState({
    weight: 180,
    height: 70,
    age: 35,
    sex: "unspecified" as Sex,
    goal: "maintain_weight" as ProfileGoal,
    unitSystem: "imperial" as "imperial" | "metric",
  });
  const [busy, setBusy] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [connections, setConnections] = useState<ActivityConnection[]>([
    { provider: "strava", connected: false },
  ]);
  const [connectionsBusy, setConnectionsBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const autoSyncAttempted = useRef(false);
  const heightFeet = Math.floor(profile.height / 12);
  const heightInches = profile.height % 12;
  const strava = connections.find((connection) => connection.provider === "strava");

  const updateImperialHeight = (part: "feet" | "inches", value: number) => {
    setProfile((prev) => {
      const nextFeet = part === "feet" ? value : Math.floor(prev.height / 12);
      const nextInches = part === "inches" ? value : prev.height % 12;

      return {
        ...prev,
        height: Math.max(1, nextFeet * 12 + nextInches),
      };
    });
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setProfileLoaded(false);

    Promise.all([
      supabase.from("macro_goals").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ])
      .then(([goals, savedProfile]) => {
        if (goals.data) {
          setMacros({
            kcal: goals.data.kcal,
            protein_g: goals.data.protein_g,
            carbs_g: goals.data.carbs_g,
            fat_g: goals.data.fat_g,
          });
        }

        if (savedProfile.data) {
          setProfile({
            weight: Number(savedProfile.data.weight),
            height: Number(savedProfile.data.height),
            age: savedProfile.data.age,
            sex: savedProfile.data.sex,
            goal: savedProfile.data.goal,
            unitSystem: savedProfile.data.unit_system,
          });
        }
      })
      .finally(() => setProfileLoaded(true));
  }, [user]);

  const loadConnections = async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return;

    const result = await getActivityConnections({ data: { accessToken } });
    setConnections(result.connections);
  };

  useEffect(() => {
    if (!user) return;
    loadConnections().catch((error) => toast.error(error.message));
  }, [user]);

  const save = async () => {
    if (!user) return;

    setBusy(true);
    const now = new Date().toISOString();
    const [{ error: goalsError }, { error: profileError }] = await Promise.all([
      supabase.from("macro_goals").upsert({
        user_id: user.id,
        ...macros,
        updated_at: now,
      }),
      supabase.from("user_profiles").upsert({
        user_id: user.id,
        weight: profile.weight,
        height: profile.height,
        age: profile.age,
        sex: profile.sex,
        goal: profile.goal,
        unit_system: profile.unitSystem,
        updated_at: now,
      }),
    ]);

    setBusy(false);
    if (goalsError || profileError) toast.error(goalsError?.message ?? profileError?.message);
    else toast.success("Profile saved.");
  };

  const connectStrava = () => {
    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
    if (!clientId) {
      toast.error("Set VITE_STRAVA_CLIENT_ID to enable Strava connections.");
      return;
    }

    const redirectUri = `${window.location.origin}/integrations/strava/callback`;
    const state = crypto.randomUUID();
    window.localStorage.setItem("macrochef-strava-oauth-state", state);
    window.location.href =
      `https://www.strava.com/oauth/authorize?` +
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        approval_prompt: "auto",
        scope: "activity:read_all",
        state,
      }).toString();
  };

  const disconnectStrava = async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return;

    setConnectionsBusy(true);
    try {
      await disconnectActivityProvider({ data: { accessToken, provider: "strava" } });
      await loadConnections();
      toast.success("Strava disconnected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect Strava.");
    } finally {
      setConnectionsBusy(false);
    }
  };

  const syncStravaActivities = useCallback(
    async (options?: { silent?: boolean }) => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;

      setSyncBusy(true);
      try {
        const result = await fetchConnectedActivities({ data: { accessToken, days: 30 } });
        const activityProfile = {
          weight: profile.weight,
          height: profile.height,
          age: profile.age,
          sex: profile.sex,
          unitSystem: profile.unitSystem,
        };
        const byDate = new Map<string, ReturnType<typeof normalizeImportedActivity>[]>();

        for (const imported of result.activities) {
          const normalized = normalizeImportedActivity(imported, activityProfile);
          const dateKey = normalized.loggedAt.slice(0, 10);
          const bucket = byDate.get(dateKey) ?? [];
          bucket.push(normalized);
          byDate.set(dateKey, bucket);
        }

        for (const [dateKey, activities] of byDate) {
          addActivities(new Date(`${dateKey}T12:00:00`), activities);
        }

        window.localStorage.setItem(STRAVA_LAST_SYNC_KEY, String(Date.now()));
        window.localStorage.removeItem(STRAVA_PENDING_SYNC_KEY);
        if (!options?.silent || result.activities.length > 0) {
          toast.success(`Synced ${result.activities.length} Strava activities.`);
        }
      } catch (error) {
        if (!options?.silent) {
          toast.error(error instanceof Error ? error.message : "Could not sync Strava activities.");
        }
      } finally {
        setSyncBusy(false);
      }
    },
    [addActivities, profile.age, profile.height, profile.sex, profile.unitSystem, profile.weight],
  );

  useEffect(() => {
    if (!strava?.connected || !profileLoaded || autoSyncAttempted.current) return;

    const pendingSync = window.localStorage.getItem(STRAVA_PENDING_SYNC_KEY) === "1";
    const lastSyncAt = Number(window.localStorage.getItem(STRAVA_LAST_SYNC_KEY) ?? 0);
    const shouldSync = pendingSync || Date.now() - lastSyncAt > STRAVA_AUTO_SYNC_INTERVAL_MS;
    if (!shouldSync) return;

    autoSyncAttempted.current = true;
    syncStravaActivities({ silent: !pendingSync });
  }, [profileLoaded, strava?.connected, syncStravaActivities]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <div>
          <p className="text-sm font-medium text-primary">Account</p>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold">Account</h2>
                <div className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                  <AtSign className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Activity Profile</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="space-y-2">
                <Label>Goal</Label>
                <Select
                  value={profile.goal}
                  onValueChange={(value) =>
                    setProfile((prev) => ({ ...prev, goal: value as ProfileGoal }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROFILE_GOALS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Units</Label>
                <Select
                  value={profile.unitSystem}
                  onValueChange={(value) =>
                    setProfile((prev) => ({
                      ...prev,
                      unitSystem: value as "imperial" | "metric",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imperial">Imperial</SelectItem>
                    <SelectItem value="metric">Metric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sex</Label>
                <Select
                  value={profile.sex}
                  onValueChange={(value) => setProfile((prev) => ({ ...prev, sex: value as Sex }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">Unspecified</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Weight className="h-3.5 w-3.5" />
                  Weight ({profile.unitSystem === "imperial" ? "lb" : "kg"})
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={profile.weight}
                  onChange={(event) =>
                    setProfile((prev) => ({ ...prev, weight: Number(event.target.value) }))
                  }
                />
              </div>
              {profile.unitSystem === "imperial" ? (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Ruler className="h-3.5 w-3.5" />
                    Height
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        value={heightFeet}
                        onChange={(event) =>
                          updateImperialHeight("feet", Number(event.target.value))
                        }
                        className="pr-10"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        ft
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="11"
                        value={heightInches}
                        onChange={(event) =>
                          updateImperialHeight("inches", Number(event.target.value))
                        }
                        className="pr-10"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        in
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Ruler className="h-3.5 w-3.5" />
                    Height (cm)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={profile.height}
                    onChange={(event) =>
                      setProfile((prev) => ({ ...prev, height: Number(event.target.value) }))
                    }
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  type="number"
                  min="1"
                  value={profile.age}
                  onChange={(event) =>
                    setProfile((prev) => ({ ...prev, age: Number(event.target.value) }))
                  }
                />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Activity Connections</h2>
            </div>
            <div className="space-y-3">
              <div className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">Strava</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {strava?.connected
                        ? `Connected${strava.providerUsername ? ` as ${strava.providerUsername}` : ""}`
                        : "Connect once to automatically import recent runs."}
                    </div>
                  </div>
                  {strava?.connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={disconnectStrava}
                      disabled={connectionsBusy}
                    >
                      <Unlink className="mr-1.5 h-4 w-4" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button size="sm" onClick={connectStrava}>
                      <LinkIcon className="mr-1.5 h-4 w-4" />
                      Connect
                    </Button>
                  )}
                </div>
                {strava?.connected && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => syncStravaActivities()}
                    disabled={syncBusy}
                  >
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    {syncBusy ? "Importing..." : "Import last 30 days now"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Macro Goals</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Calories is a <span className="font-medium">net intake target</span>: set to{" "}
            <span className="font-mono">0</span> to break even with your burn,{" "}
            <span className="font-mono">−500</span> for a 500 kcal/day deficit, or{" "}
            <span className="font-mono">+500</span> for a surplus. Protein, carbs, and fat are
            gross intake targets (grams to eat each day).
          </p>
          <MacroInputs
            value={{
              kcal: macros.kcal,
              protein_g: macros.protein_g,
              carbs_g: macros.carbs_g,
              fat_g: macros.fat_g,
            }}
            onChange={(m) =>
              setMacros({
                kcal: m.kcal ?? 0,
                protein_g: m.protein_g ?? 0,
                carbs_g: m.carbs_g ?? 0,
                fat_g: m.fat_g ?? 0,
              })
            }
          />
          <div className="mt-5 flex justify-end gap-2">
            <Link to="/">
              <Button variant="ghost">Cancel</Button>
            </Link>
            <Button onClick={save} disabled={busy} className="gap-2">
              <Save className="h-4 w-4" />
              {busy ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
