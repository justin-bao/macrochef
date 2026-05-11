import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { e as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { B as Button, c as cn } from "./router-BYpIiiGB.mjs";
import { R as Root$1, P as Portal, C as Content, a as Close, T as Title, O as Overlay, D as Description } from "../_libs/radix-ui__react-dialog.mjs";
import { I as Input, L as Label } from "./label-CCG5UsHH.mjs";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent, S as Select, d as SelectTrigger, e as SelectValue, f as SelectContent, g as SelectItem } from "./select-BpQIcSi_.mjs";
import { C as Card } from "./card-BiXvzZzb.mjs";
import { u as useLocalTracking, g as getDayTotals, a as getBurnedCalories, s as sumFood, M as MEAL_LABELS } from "./useLocalTracking-COnPfdkQ.mjs";
import { R as Root, C as CollapsibleTrigger$1, a as CollapsibleContent$1 } from "../_libs/radix-ui__react-collapsible.mjs";
import { M as MacroInputs } from "./MacroInputs-DYKngRYt.mjs";
import { f as format, s as subDays, a as addDays } from "../_libs/date-fns.mjs";
import { f as ChevronLeft, g as CalendarDays, h as ChevronRight, i as ChefHat, a as Search, T as Target, P as Plus, C as ChevronDown, X, F as Flame, R as Route, D as Dumbbell, j as Sparkles, k as PenLine } from "../_libs/lucide-react.mjs";
const MET_VALUES = {
  run: { low: 7, moderate: 9.8, high: 11.5, vigorous: 14.5 },
  walk: { low: 2.5, moderate: 3.5, high: 4.5, vigorous: 5 },
  bike: { low: 4, moderate: 6.8, high: 10, vigorous: 14 },
  stairmaster: { low: 4, moderate: 6, high: 9, vigorous: 12 },
  strength: { low: 3, moderate: 4.5, high: 6, vigorous: 8 },
  gym: { low: 2.8, moderate: 4.8, high: 6.5, vigorous: 8.5 },
  other: { low: 3, moderate: 5, high: 7, vigorous: 10 }
};
function calculateCaloriesBurned(activityKind, intensity, durationMinutes, weight, unitSystem = "imperial") {
  const weightKg = unitSystem === "imperial" ? weight * 0.453592 : weight;
  const durationHours = durationMinutes / 60;
  const met = MET_VALUES[activityKind]?.[intensity] ?? MET_VALUES.other[intensity];
  return Math.round(met * weightKg * durationHours);
}
function calculateDistanceCalories(activityKind, distance, durationMinutes, weight, unitSystem = "imperial") {
  if (durationMinutes <= 0 || distance <= 0) {
    return calculateCaloriesBurned(activityKind, "moderate", durationMinutes, weight, unitSystem);
  }
  const weightKg = unitSystem === "imperial" ? weight * 0.453592 : weight;
  const distanceKm = unitSystem === "imperial" ? distance * 1.60934 : distance;
  const speedKmh = distanceKm / (durationMinutes / 60);
  let met = activityKind === "bike" ? 6.8 : 3.5;
  if (activityKind === "run") {
    if (speedKmh < 8) met = 6;
    else if (speedKmh < 9.7) met = 8.3;
    else if (speedKmh < 11.3) met = 9.8;
    else if (speedKmh < 12.9) met = 11;
    else if (speedKmh < 14.5) met = 11.8;
    else if (speedKmh < 16.1) met = 12.8;
    else met = 14.5;
  } else if (activityKind === "bike") {
    if (speedKmh < 16) met = 4;
    else if (speedKmh < 19) met = 6.8;
    else if (speedKmh < 22) met = 8;
    else if (speedKmh < 26) met = 10;
    else met = 12;
  } else if (activityKind === "walk") {
    if (speedKmh < 4) met = 2.5;
    else if (speedKmh < 5.6) met = 3.5;
    else if (speedKmh < 6.5) met = 4.5;
    else met = 5;
  }
  return Math.round(met * weightKg * (durationMinutes / 60));
}
const Dialog = Root$1;
const DialogPortal = Portal;
const DialogOverlay = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Overlay,
  {
    ref,
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props
  }
));
DialogOverlay.displayName = Overlay.displayName;
const DialogContent = reactExports.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal, { children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx(DialogOverlay, {}),
  /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Content,
    {
      ref,
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
DialogContent.displayName = Content.displayName;
const DialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className), ...props });
DialogHeader.displayName = "DialogHeader";
const DialogTitle = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Title,
  {
    ref,
    className: cn("text-lg font-semibold leading-none tracking-tight", className),
    ...props
  }
));
DialogTitle.displayName = Title.displayName;
const DialogDescription = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
DialogDescription.displayName = Description.displayName;
const ACTIVITY_LABELS = {
  run: "Run",
  walk: "Walk",
  bike: "Bike",
  stairmaster: "Stairmaster",
  strength: "Strength training",
  gym: "Gym session",
  other: "Other activity"
};
function ActivityLogger({
  open,
  onOpenChange,
  onAdd,
  weight,
  unitSystem
}) {
  const [kind, setKind] = reactExports.useState("run");
  const [name, setName] = reactExports.useState("");
  const [duration, setDuration] = reactExports.useState("");
  const [distance, setDistance] = reactExports.useState("");
  const [intensity, setIntensity] = reactExports.useState("moderate");
  const [sets, setSets] = reactExports.useState("");
  const [reps, setReps] = reactExports.useState("");
  const [load, setLoad] = reactExports.useState("");
  const isDistanceActivity = kind === "run" || kind === "walk" || kind === "bike";
  const isLiftingActivity = kind === "strength" || kind === "gym";
  const distanceUnit = unitSystem === "imperial" ? "mi" : "km";
  const loadUnit = unitSystem === "imperial" ? "lb" : "kg";
  const reset = () => {
    setName("");
    setDuration("");
    setDistance("");
    setIntensity("moderate");
    setSets("");
    setReps("");
    setLoad("");
  };
  const submit = () => {
    const durationMin = Number(duration);
    if (!durationMin) return;
    const distanceValue = Number(distance);
    const burned = isDistanceActivity && distanceValue > 0 ? calculateDistanceCalories(kind, distanceValue, durationMin, weight, unitSystem) : calculateCaloriesBurned(kind, intensity, durationMin, weight, unitSystem);
    onAdd({
      id: crypto.randomUUID(),
      kind,
      name: name.trim() || ACTIVITY_LABELS[kind],
      durationMin,
      distance: distanceValue || void 0,
      distanceUnit: isDistanceActivity ? distanceUnit : void 0,
      intensity,
      caloriesBurned: burned,
      sets: Number(sets) || void 0,
      reps: Number(reps) || void 0,
      load: Number(load) || void 0,
      loadUnit: isLiftingActivity ? loadUnit : void 0,
      loggedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    reset();
    onOpenChange(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      open,
      onOpenChange: (nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-lg", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Log activity" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Type" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: kind, onValueChange: (value) => setKind(value), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: Object.entries(ACTIVITY_LABELS).map(([value, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value, children: label }, value)) })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Name" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  value: name,
                  onChange: (event) => setName(event.target.value),
                  placeholder: ACTIVITY_LABELS[kind]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Duration (min)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: "number",
                  value: duration,
                  onChange: (event) => setDuration(event.target.value),
                  placeholder: "45"
                }
              )
            ] }),
            isDistanceActivity ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { children: [
                "Distance (",
                distanceUnit,
                ")"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: "number",
                  step: "0.1",
                  value: distance,
                  onChange: (event) => setDistance(event.target.value),
                  placeholder: "3.0"
                }
              )
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Intensity" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Select,
                {
                  value: intensity,
                  onValueChange: (value) => setIntensity(value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "low", children: "Low" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "moderate", children: "Moderate" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "high", children: "High" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "vigorous", children: "Vigorous" })
                    ] })
                  ]
                }
              )
            ] })
          ] }),
          isDistanceActivity && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Intensity" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Select,
              {
                value: intensity,
                onValueChange: (value) => setIntensity(value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "low", children: "Low" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "moderate", children: "Moderate" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "high", children: "High" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "vigorous", children: "Vigorous" })
                  ] })
                ]
              }
            )
          ] }),
          isLiftingActivity && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Sets" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: "number",
                  value: sets,
                  onChange: (event) => setSets(event.target.value),
                  placeholder: "4"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Reps" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: "number",
                  value: reps,
                  onChange: (event) => setReps(event.target.value),
                  placeholder: "8"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { children: [
                "Load (",
                loadUnit,
                ")"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: "number",
                  value: load,
                  onChange: (event) => setLoad(event.target.value),
                  placeholder: "135"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { className: "w-full", disabled: !duration, onClick: submit, children: "Log activity" })
        ] })
      ] })
    }
  );
}
const LABELS = {
  run: "Run",
  walk: "Walk",
  bike: "Bike",
  stairmaster: "Stairmaster",
  strength: "Strength",
  gym: "Gym",
  other: "Activity"
};
function ActivityPanel({
  activities,
  onAdd,
  onRemove
}) {
  const burned = activities.reduce((sum, activity) => sum + activity.caloriesBurned, 0);
  const liftingCount = activities.filter(
    (activity) => activity.kind === "strength" || activity.kind === "gym"
  ).length;
  const cardioCount = activities.length - liftingCount;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium uppercase tracking-wide text-muted-foreground", children: "Activity" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-1 text-xl font-semibold", children: "Cardio and lifting" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Flame, { className: "h-3.5 w-3.5 text-destructive" }),
            burned,
            " kcal"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { className: "h-3.5 w-3.5" }),
            cardioCount,
            " cardio"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Dumbbell, { className: "h-3.5 w-3.5" }),
            liftingCount,
            " gym"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "gap-1", onClick: onAdd, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        "Add"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4", children: activities.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-md bg-muted/35 px-3 py-5 text-center text-sm text-muted-foreground", children: "No workouts logged." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y", children: activities.map((activity) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group flex items-center justify-between gap-3 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: activity.name || LABELS[activity.kind] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground", children: LABELS[activity.kind] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            activity.durationMin,
            " min"
          ] }),
          activity.distance != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            activity.distance,
            " ",
            activity.distanceUnit
          ] }),
          activity.sets != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            activity.sets,
            "x",
            activity.reps ?? "-",
            activity.load ? ` @ ${activity.load}${activity.loadUnit}` : ""
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: activity.intensity })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-semibold text-destructive", children: [
          "-",
          activity.caloriesBurned
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon",
            className: "h-7 w-7 opacity-70 transition hover:opacity-100",
            onClick: () => onRemove(activity.id),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" })
          }
        )
      ] })
    ] }, activity.id)) }) })
  ] });
}
const Textarea = reactExports.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        className: cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Textarea.displayName = "Textarea";
const ESTIMATES = [
  { keys: ["chicken", "turkey", "tuna"], kcal: 180, protein_g: 32, carbs_g: 0, fat_g: 4 },
  { keys: ["beef", "steak"], kcal: 250, protein_g: 28, carbs_g: 0, fat_g: 15 },
  { keys: ["salmon"], kcal: 230, protein_g: 25, carbs_g: 0, fat_g: 14 },
  { keys: ["egg"], kcal: 70, protein_g: 6, carbs_g: 0, fat_g: 5 },
  { keys: ["rice"], kcal: 205, protein_g: 4, carbs_g: 45, fat_g: 0 },
  { keys: ["oat", "oatmeal"], kcal: 150, protein_g: 5, carbs_g: 27, fat_g: 3 },
  { keys: ["potato"], kcal: 160, protein_g: 4, carbs_g: 37, fat_g: 0 },
  { keys: ["pasta"], kcal: 220, protein_g: 8, carbs_g: 43, fat_g: 1 },
  { keys: ["banana"], kcal: 105, protein_g: 1, carbs_g: 27, fat_g: 0 },
  { keys: ["avocado"], kcal: 240, protein_g: 3, carbs_g: 13, fat_g: 22 },
  { keys: ["olive oil", "oil"], kcal: 120, protein_g: 0, carbs_g: 0, fat_g: 14 },
  {
    keys: ["broccoli", "vegetable", "greens", "salad"],
    kcal: 55,
    protein_g: 4,
    carbs_g: 10,
    fat_g: 1
  },
  { keys: ["yogurt", "skyr"], kcal: 130, protein_g: 20, carbs_g: 8, fat_g: 0 },
  { keys: ["protein shake", "whey"], kcal: 130, protein_g: 25, carbs_g: 3, fat_g: 2 }
];
function emptyItem() {
  return {
    id: crypto.randomUUID(),
    name: "",
    quantity: 1,
    unit: "serving",
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    source: "manual",
    confidence: "high",
    loggedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function parseFoodDescription(description) {
  return description.split(/\n|,| and /i).map((raw) => raw.trim()).filter(Boolean).map((raw) => {
    const quantityMatch = raw.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
    const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
    const unit = quantityMatch?.[2] ?? "serving";
    const name = quantityMatch?.[3] ?? raw;
    const normalized = name.toLowerCase();
    const match = ESTIMATES.find(
      (estimate2) => estimate2.keys.some((key) => normalized.includes(key))
    );
    const multiplier = unit.toLowerCase().startsWith("oz") ? quantity / 4 : quantity;
    const estimate = match ?? { kcal: 180, protein_g: 10, carbs_g: 18, fat_g: 6 };
    return {
      id: crypto.randomUUID(),
      name,
      quantity,
      unit,
      kcal: Math.round(estimate.kcal * multiplier),
      protein_g: Math.round(estimate.protein_g * multiplier * 10) / 10,
      carbs_g: Math.round(estimate.carbs_g * multiplier * 10) / 10,
      fat_g: Math.round(estimate.fat_g * multiplier * 10) / 10,
      source: "ai",
      confidence: match ? "medium" : "low",
      note: match ? "MacroChef quick estimate. Review before saving." : "Fallback estimate. Edit macros before saving.",
      loggedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  });
}
function FoodLogModal({
  open,
  onOpenChange,
  onAdd
}) {
  const [manual, setManual] = reactExports.useState(emptyItem);
  const [description, setDescription] = reactExports.useState("");
  const [parsed, setParsed] = reactExports.useState([]);
  const canAddManual = manual.name.trim().length > 0 && manual.kcal > 0;
  const totalParsed = reactExports.useMemo(() => parsed.reduce((sum, item) => sum + item.kcal, 0), [parsed]);
  const updateParsed = (id, field, value) => {
    setParsed(
      (items) => items.map(
        (item) => item.id === id ? {
          ...item,
          [field]: field === "name" || field === "unit" || field === "note" ? value : Number(value) || 0
        } : item
      )
    );
  };
  const closeAndReset = (nextOpen) => {
    if (!nextOpen) {
      setManual(emptyItem());
      setDescription("");
      setParsed([]);
    }
    onOpenChange(nextOpen);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: closeAndReset, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-h-[88vh] overflow-y-auto sm:max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Log food" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "quick", className: "mt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "grid w-full grid-cols-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "quick", className: "gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4" }),
          "Quick parse"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "manual", className: "gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { className: "h-4 w-4" }),
          "Manual"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "quick", className: "mt-4 space-y-4", children: parsed.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Textarea,
          {
            value: description,
            onChange: (event) => setDescription(event.target.value),
            placeholder: "8 oz chicken breast, 1 cup rice, broccoli",
            className: "min-h-28 resize-none"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            className: "w-full",
            disabled: !description.trim(),
            onClick: () => setParsed(parseFoodDescription(description)),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "mr-2 h-4 w-4" }),
              "Estimate items"
            ]
          }
        )
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: parsed.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-[1fr_88px_100px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                value: item.name,
                onChange: (event) => updateParsed(item.id, "name", event.target.value)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                type: "number",
                value: item.quantity,
                onChange: (event) => updateParsed(item.id, "quantity", event.target.value)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                value: item.unit,
                onChange: (event) => updateParsed(item.id, "unit", event.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 grid grid-cols-4 gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              MacroInput,
              {
                label: "Cal",
                value: item.kcal,
                onChange: (value) => updateParsed(item.id, "kcal", value)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              MacroInput,
              {
                label: "Protein",
                value: item.protein_g,
                onChange: (value) => updateParsed(item.id, "protein_g", value)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              MacroInput,
              {
                label: "Carbs",
                value: item.carbs_g,
                onChange: (value) => updateParsed(item.id, "carbs_g", value)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              MacroInput,
              {
                label: "Fat",
                value: item.fat_g,
                onChange: (value) => updateParsed(item.id, "fat_g", value)
              }
            )
          ] }),
          item.note && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: item.note })
        ] }, item.id)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", className: "flex-1", onClick: () => setParsed([]), children: "Back" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              className: "flex-1",
              onClick: () => {
                onAdd(parsed);
                closeAndReset(false);
              },
              children: [
                "Add ",
                parsed.length,
                " item",
                parsed.length === 1 ? "" : "s",
                " · ",
                totalParsed,
                " kcal"
              ]
            }
          )
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "manual", className: "mt-4 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Food name" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                value: manual.name,
                onChange: (event) => setManual((item) => ({ ...item, name: event.target.value })),
                placeholder: "Greek yogurt bowl"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Quantity" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: "number",
                  value: manual.quantity,
                  onChange: (event) => setManual((item) => ({ ...item, quantity: Number(event.target.value) || 0 }))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Unit" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  value: manual.unit,
                  onChange: (event) => setManual((item) => ({ ...item, unit: event.target.value })),
                  placeholder: "serving"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-4 gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ManualMacro,
              {
                label: "Calories",
                value: manual.kcal,
                onChange: (kcal) => setManual((item) => ({ ...item, kcal }))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ManualMacro,
              {
                label: "Protein",
                value: manual.protein_g,
                onChange: (protein_g) => setManual((item) => ({ ...item, protein_g }))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ManualMacro,
              {
                label: "Carbs",
                value: manual.carbs_g,
                onChange: (carbs_g) => setManual((item) => ({ ...item, carbs_g }))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ManualMacro,
              {
                label: "Fat",
                value: manual.fat_g,
                onChange: (fat_g) => setManual((item) => ({ ...item, fat_g }))
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            className: "w-full",
            disabled: !canAddManual,
            onClick: () => {
              onAdd([
                {
                  ...manual,
                  id: crypto.randomUUID(),
                  loggedAt: (/* @__PURE__ */ new Date()).toISOString(),
                  source: "manual"
                }
              ]);
              closeAndReset(false);
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 h-4 w-4" }),
              "Add food"
            ]
          }
        )
      ] })
    ] })
  ] }) });
}
function MacroInput({
  label,
  value,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-[10px] text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Input,
      {
        type: "number",
        className: "h-8 text-xs",
        value,
        onChange: (event) => onChange(event.target.value)
      }
    )
  ] });
}
function ManualMacro({
  label,
  value,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Input,
      {
        type: "number",
        value: value || "",
        onChange: (event) => onChange(Number(event.target.value) || 0)
      }
    )
  ] });
}
function MacroMeter({
  label,
  value,
  target,
  className
}) {
  const pct = target > 0 ? Math.min(value / target * 100, 100) : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline justify-between gap-2 text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums text-muted-foreground", children: [
        Math.round(value),
        " / ",
        target,
        "g"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-2 rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `h-2 rounded-full ${className}`, style: { width: `${pct}%` } }) })
  ] });
}
function FuelSummary({ day, settings }) {
  const totals = getDayTotals(day);
  const burned = getBurnedCalories(day);
  const net = totals.kcal - burned;
  const remaining = settings.dailyCalorieTarget - net;
  const caloriePct = settings.dailyCalorieTarget > 0 ? Math.min(Math.max(net, 0) / settings.dailyCalorieTarget * 100, 100) : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-5 md:grid-cols-[220px_1fr]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium uppercase tracking-wide text-muted-foreground", children: "Daily fuel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex items-end gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-4xl font-bold tabular-nums", children: Math.round(net) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "pb-1 text-sm text-muted-foreground", children: "net kcal" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          Math.round(totals.kcal),
          " eaten"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          burned,
          " burned"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            className: remaining < 0 ? "font-semibold text-destructive" : "font-semibold text-primary",
            children: [
              Math.abs(Math.round(remaining)),
              " ",
              remaining < 0 ? "over" : "left"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 h-2 rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "h-2 rounded-full bg-[var(--kcal)]",
          style: { width: `${caloriePct}%` }
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[11px] text-muted-foreground", children: [
        "Target ",
        settings.dailyCalorieTarget,
        " kcal after activity"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid content-center gap-3 sm:grid-cols-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MacroMeter,
        {
          label: "Protein",
          value: totals.protein_g,
          target: settings.dailyProteinTarget,
          className: "bg-[var(--protein)]"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MacroMeter,
        {
          label: "Carbs",
          value: totals.carbs_g,
          target: settings.dailyCarbsTarget,
          className: "bg-[var(--carbs)]"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MacroMeter,
        {
          label: "Fat",
          value: totals.fat_g,
          target: settings.dailyFatTarget,
          className: "bg-[var(--fat)]"
        }
      )
    ] })
  ] }) });
}
const Collapsible = Root;
const CollapsibleTrigger = CollapsibleTrigger$1;
const CollapsibleContent = CollapsibleContent$1;
function MealLogSection({
  meal,
  onAdd,
  onRemove
}) {
  const [open, setOpen] = reactExports.useState(true);
  const totals = sumFood(meal.items);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Collapsible, { open, onOpenChange: setOpen, className: "rounded-lg border bg-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CollapsibleTrigger, { className: "flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ChevronDown,
          {
            className: `h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "" : "-rotate-90"}`
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: MEAL_LABELS[meal.type] }),
        meal.items.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "truncate text-xs text-muted-foreground", children: [
          Math.round(totals.kcal),
          " kcal · ",
          Math.round(totals.protein_g),
          "P"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          type: "button",
          variant: "ghost",
          size: "sm",
          className: "h-8 shrink-0 gap-1 text-primary",
          onClick: (event) => {
            event.stopPropagation();
            onAdd(meal.type);
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
            "Add"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CollapsibleContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pb-3", children: meal.items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-md bg-muted/35 px-3 py-4 text-center text-sm text-muted-foreground", children: "Nothing logged yet." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y", children: meal.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group flex items-start justify-between gap-3 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-baseline gap-x-2 gap-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: item.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
            item.quantity,
            " ",
            item.unit
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap gap-2 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
            Math.round(item.kcal),
            " kcal"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MacroPill, { label: `${Math.round(item.protein_g)}P`, color: "protein" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MacroPill, { label: `${Math.round(item.carbs_g)}C`, color: "carbs" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MacroPill, { label: `${Math.round(item.fat_g)}F`, color: "fat" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground", children: item.source })
        ] }),
        item.note && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: item.note })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          variant: "ghost",
          size: "icon",
          className: "h-7 w-7 shrink-0 opacity-70 transition hover:opacity-100",
          onClick: () => onRemove(meal.type, item.id),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" })
        }
      )
    ] }, item.id)) }) }) })
  ] });
}
function MacroPill({ label, color }) {
  const cls = {
    protein: "bg-[var(--protein)]/10 text-[var(--protein)]",
    carbs: "bg-[var(--carbs)]/15 text-[oklch(0.45_0.13_75)]",
    fat: "bg-[var(--fat)]/10 text-[var(--fat)]"
  }[color];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `rounded-full px-2 py-0.5 font-medium ${cls}`, children: label });
}
function UnifiedDashboard({ focus = "all" }) {
  const navigate = useNavigate();
  const [date, setDate] = reactExports.useState(/* @__PURE__ */ new Date());
  const [foodOpen, setFoodOpen] = reactExports.useState(false);
  const [activityOpen, setActivityOpen] = reactExports.useState(false);
  const [activeMeal, setActiveMeal] = reactExports.useState("breakfast");
  const [query, setQuery] = reactExports.useState("");
  const { settings, getDay, addFoodItems, removeFoodItem, addActivity, removeActivity } = useLocalTracking();
  const day = getDay(date);
  const totals = getDayTotals(day);
  const burned = getBurnedCalories(day);
  const isToday = format(date, "yyyy-MM-dd") === format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
  const remaining = reactExports.useMemo(
    () => ({
      kcal: Math.max(0, Math.round(settings.dailyCalorieTarget - (totals.kcal - burned))),
      protein_g: Math.max(0, Math.round(settings.dailyProteinTarget - totals.protein_g)),
      carbs_g: Math.max(0, Math.round(settings.dailyCarbsTarget - totals.carbs_g)),
      fat_g: Math.max(0, Math.round(settings.dailyFatTarget - totals.fat_g))
    }),
    [burned, settings, totals]
  );
  const [target, setTarget] = reactExports.useState(remaining);
  reactExports.useEffect(() => {
    setTarget(
      (prev) => prev.kcal === remaining.kcal && prev.protein_g === remaining.protein_g && prev.carbs_g === remaining.carbs_g && prev.fat_g === remaining.fat_g ? prev : remaining
    );
  }, [remaining]);
  const openFood = (mealType) => {
    setActiveMeal(mealType);
    setFoodOpen(true);
  };
  const findFood = (event) => {
    event.preventDefault();
    navigate({
      to: "/search",
      search: {
        mode: "recipes",
        q: query.trim(),
        kcal: target.kcal ?? remaining.kcal ?? void 0,
        p: target.protein_g ?? remaining.protein_g ?? void 0,
        c: target.carbs_g ?? remaining.carbs_g ?? void 0,
        f: target.fat_g ?? remaining.fat_g ?? void 0,
        subs: true
      }
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-6xl px-4 py-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6 flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-primary", children: "MacroChef unified" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold tracking-tight", children: focus === "activity" ? "Training log" : "Fuel, food, and training" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 rounded-lg border bg-card p-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => setDate((d) => subDays(d)), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", className: "gap-2 px-3", onClick: () => setDate(/* @__PURE__ */ new Date()), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarDays, { className: "h-4 w-4" }),
          isToday ? "Today" : format(date, "EEE, MMM d")
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: () => setDate((d) => addDays(d, 1)), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-4 w-4" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FuelSummary, { day, settings }),
      focus !== "activity" && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "form",
        {
          onSubmit: findFood,
          className: "grid gap-4 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center gap-2 text-sm font-semibold", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChefHat, { className: "h-4 w-4 text-primary" }),
                "Decide what to eat next"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    value: query,
                    onChange: (event) => setQuery(event.target.value),
                    placeholder: "dinner, high protein, thai...",
                    className: "pl-9"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center gap-2 text-sm font-semibold", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { className: "h-4 w-4 text-primary" }),
                "Remaining macro target"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MacroInputs, { value: target, onChange: setTarget })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "submit", className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "h-4 w-4" }),
              "Find matches"
            ] })
          ]
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-5 lg:grid-cols-[1.15fr_0.85fr]", children: [
        focus !== "activity" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold", children: "Food log" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                size: "sm",
                variant: "outline",
                className: "gap-1",
                onClick: () => openFood("snacks"),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
                  "Quick add"
                ]
              }
            )
          ] }),
          day.meals.map((meal) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            MealLogSection,
            {
              meal,
              onAdd: openFood,
              onRemove: (mealType, itemId) => removeFoodItem(date, mealType, itemId)
            },
            meal.type
          ))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: focus === "activity" ? "lg:col-span-2" : "", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ActivityPanel,
            {
              activities: day.activities,
              onAdd: () => setActivityOpen(true),
              onRemove: (activityId) => removeActivity(date, activityId)
            }
          ),
          focus !== "activity" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-lg border bg-muted/25 p-4 text-sm text-muted-foreground", children: [
            "Recipes and restaurant combos can be logged into this same food diary, so choosing food and tracking food stay in one loop.",
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Link,
              {
                to: "/search",
                search: { mode: "recipes", q: "", subs: true },
                className: "ml-1 font-medium text-primary",
                children: "Browse options"
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      FoodLogModal,
      {
        open: foodOpen,
        onOpenChange: setFoodOpen,
        onAdd: (items) => addFoodItems(date, activeMeal, items)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ActivityLogger,
      {
        open: activityOpen,
        onOpenChange: setActivityOpen,
        onAdd: (activity) => addActivity(date, activity),
        weight: settings.weight,
        unitSystem: settings.unitSystem
      }
    )
  ] });
}
export {
  UnifiedDashboard as U
};
