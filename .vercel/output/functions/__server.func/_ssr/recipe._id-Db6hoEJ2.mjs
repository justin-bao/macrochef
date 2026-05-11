import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { g as getRecipe, S as Skeleton, a as suggestSwaps } from "./skeleton-D5ozslkw.mjs";
import { C as Card } from "./card-BiXvzZzb.mjs";
import { a as Route, u as useAuth, B as Button, c as cn, s as supabase } from "./router-BYpIiiGB.mjs";
import { M as MacroInputs } from "./MacroInputs-DYKngRYt.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as useLocalTracking } from "./useLocalTracking-COnPfdkQ.mjs";
import "./index.mjs";
import "../_libs/seroval.mjs";
import { n as Clock, E as ExternalLink, o as RotateCcw, p as Calculator, j as Sparkles, d as CircleCheck, q as BookmarkPlus } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/zod.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "./label-CCG5UsHH.mjs";
import "../_libs/radix-ui__react-label.mjs";
import "../_libs/radix-ui__react-primitive.mjs";
import "../_libs/date-fns.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
const colorClass = {
  kcal: "bg-[var(--kcal)]",
  protein: "bg-[var(--protein)]",
  carbs: "bg-[var(--carbs)]",
  fat: "bg-[var(--fat)]"
};
function MacroBar({ label, value, target, unit = "g", color, compact }) {
  const pct = target ? Math.min(100, Math.max(0, value / target * 100)) : 0;
  const diff = target ? value - target : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("space-y-1", compact && "space-y-0.5"), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline justify-between text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-foreground", children: Math.round(value) }),
        target ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          " / ",
          target,
          unit
        ] }) : unit
      ] })
    ] }),
    target ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-2 overflow-hidden rounded-full bg-secondary", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("h-full rounded-full transition-all", colorClass[color]), style: { width: `${pct}%` } }) }),
      !compact && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: diff === 0 ? "on target" : `${diff > 0 ? "+" : ""}${Math.round(diff)}${unit} vs target` })
    ] }) : null
  ] });
}
function scaleIngredients(ingredients, factor) {
  return ingredients.map((i) => ({
    ...i,
    amount: Math.round(i.amount * factor * 100) / 100,
    kcal: i.kcal != null ? Math.round(i.kcal * factor) : void 0,
    protein_g: i.protein_g != null ? Math.round(i.protein_g * factor * 10) / 10 : void 0,
    carbs_g: i.carbs_g != null ? Math.round(i.carbs_g * factor * 10) / 10 : void 0,
    fat_g: i.fat_g != null ? Math.round(i.fat_g * factor * 10) / 10 : void 0
  }));
}
function sumMacros(ingredients) {
  return ingredients.reduce(
    (acc, i) => ({
      kcal: acc.kcal + (i.kcal ?? 0),
      protein_g: acc.protein_g + (i.protein_g ?? 0),
      carbs_g: acc.carbs_g + (i.carbs_g ?? 0),
      fat_g: acc.fat_g + (i.fat_g ?? 0)
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}
function applySwaps(ingredients, swaps) {
  const active = swaps.filter((s) => s.applied);
  return ingredients.map((i) => {
    const swap = active.find(
      (s) => i.name.toLowerCase().includes(s.from.toLowerCase()) || s.from.toLowerCase().includes(i.name.toLowerCase())
    );
    if (!swap) return i;
    return {
      ...i,
      name: swap.to,
      kcal: i.kcal != null && swap.delta.kcal != null ? Math.max(0, i.kcal + swap.delta.kcal) : i.kcal,
      protein_g: i.protein_g != null && swap.delta.protein_g != null ? Math.max(0, i.protein_g + swap.delta.protein_g) : i.protein_g,
      carbs_g: i.carbs_g != null && swap.delta.carbs_g != null ? Math.max(0, i.carbs_g + swap.delta.carbs_g) : i.carbs_g,
      fat_g: i.fat_g != null && swap.delta.fat_g != null ? Math.max(0, i.fat_g + swap.delta.fat_g) : i.fat_g
    };
  });
}
function RecipePage() {
  const {
    id
  } = Route.useParams();
  const search = Route.useSearch();
  const {
    user
  } = useAuth();
  const {
    addFoodItems
  } = useLocalTracking();
  const target = {
    kcal: search.kcal ?? null,
    protein_g: search.p ?? null,
    carbs_g: search.c ?? null,
    fat_g: search.f ?? null
  };
  const allowSubs = search.subs;
  const [editingTarget, setEditingTarget] = reactExports.useState(target);
  const [recipe, setRecipe] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [swaps, setSwaps] = reactExports.useState([]);
  const [loadingSwaps, setLoadingSwaps] = reactExports.useState(false);
  const [scaleFactor, setScaleFactor] = reactExports.useState(1);
  const [scaleMode, setScaleMode] = reactExports.useState("perServing");
  reactExports.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRecipe({
      data: {
        id: Number(id),
        source: search.src
      }
    }).then((r) => {
      if (cancelled) return;
      setRecipe(r.recipe);
      setError(r.error);
      if (r.recipe && target.kcal != null) {
        const perServingKcal = r.recipe.macros.kcal / Math.max(1, r.recipe.servings);
        if (perServingKcal > 0) {
          setScaleFactor(target.kcal / perServingKcal);
        }
      }
    }).catch((e) => !cancelled && setError(e.message)).finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);
  const workingIngredients = reactExports.useMemo(() => {
    if (!recipe) return [];
    return applySwaps(scaleIngredients(recipe.ingredients, scaleFactor), swaps);
  }, [recipe, scaleFactor, swaps]);
  const totalMacros = reactExports.useMemo(() => sumMacros(workingIngredients), [workingIngredients]);
  const perServing = reactExports.useMemo(() => {
    const s = recipe?.servings || 1;
    return {
      kcal: totalMacros.kcal / s,
      protein_g: totalMacros.protein_g / s,
      carbs_g: totalMacros.carbs_g / s,
      fat_g: totalMacros.fat_g / s
    };
  }, [totalMacros, recipe]);
  const generateSwaps = async () => {
    if (!recipe) return;
    setLoadingSwaps(true);
    const res = await suggestSwaps({
      data: {
        title: recipe.title,
        ingredients: recipe.ingredients.map((i) => ({
          name: i.name,
          amount: i.amount,
          unit: i.unit
        })),
        current: totalMacros,
        target: editingTarget,
        servings: recipe.servings
      }
    });
    setLoadingSwaps(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setSwaps(res.swaps.map((s) => ({
      ...s,
      applied: false
    })));
    if (res.swaps.length === 0) toast.info("No useful swaps found.");
  };
  const scaleToTarget = () => {
    if (!recipe || perServing.kcal === 0) return;
    if (editingTarget.kcal == null) {
      toast.error("Set a calorie target first.");
      return;
    }
    const factor = editingTarget.kcal / (recipe.macros.kcal / recipe.servings);
    setScaleFactor(factor);
    toast.success(`Ingredients scaled to ${editingTarget.kcal} kcal/serving`);
  };
  const reset = () => {
    setSwaps((prev) => prev.map((s) => ({
      ...s,
      applied: false
    })));
    setScaleFactor(1);
  };
  const save = async () => {
    if (!user || !recipe) return;
    const {
      error: e
    } = await supabase.from("saved_recipes").insert({
      user_id: user.id,
      spoonacular_id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      servings: recipe.servings,
      target_macros: editingTarget,
      applied_swaps: swaps.filter((s) => s.applied),
      scaled_ingredients: workingIngredients,
      computed_macros: {
        total: totalMacros,
        perServing
      }
    });
    if (e) toast.error(e.message);
    else toast.success("Recipe saved.");
  };
  const logServing = () => {
    if (!recipe) return;
    addFoodItems(/* @__PURE__ */ new Date(), "dinner", [{
      id: crypto.randomUUID(),
      name: recipe.title,
      quantity: 1,
      unit: "serving",
      kcal: Math.round(perServing.kcal),
      protein_g: Math.round(perServing.protein_g * 10) / 10,
      carbs_g: Math.round(perServing.carbs_g * 10) / 10,
      fat_g: Math.round(perServing.fat_g * 10) / 10,
      source: "recipe",
      confidence: "high",
      note: scaleFactor !== 1 || swaps.some((s) => s.applied) ? "Logged from tuned MacroChef recipe." : "Logged from MacroChef recipe.",
      loggedAt: (/* @__PURE__ */ new Date()).toISOString()
    }]);
    toast.success("Logged 1 serving to dinner.");
  };
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-5xl p-6 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-64 w-full" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-32 w-full" })
  ] });
  if (error || !recipe) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-5xl p-6 text-destructive", children: error || "Recipe not found" });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-6xl px-4 py-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-8 lg:grid-cols-[1.5fr_1fr]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-hidden rounded-2xl", children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: recipe.image, alt: recipe.title, className: "aspect-[16/9] w-full object-cover" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold tracking-tight", children: recipe.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-4 w-4" }),
            " ",
            recipe.readyInMinutes,
            " min"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "·" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            recipe.servings,
            " servings"
          ] }),
          recipe.sourceUrl && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "·" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: recipe.sourceUrl, target: "_blank", rel: "noreferrer", className: "inline-flex items-center gap-1 hover:text-foreground", children: [
              "Source ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "h-3 w-3" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold", children: "Ingredients" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1 rounded-md bg-secondary p-0.5 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setScaleMode("perServing"), className: `rounded px-2 py-1 ${scaleMode === "perServing" ? "bg-background shadow-sm" : "text-muted-foreground"}`, children: "Per serving" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setScaleMode("total"), className: `rounded px-2 py-1 ${scaleMode === "total" ? "bg-background shadow-sm" : "text-muted-foreground"}`, children: "Total" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y", children: workingIngredients.map((i, idx) => {
          const orig = recipe.ingredients[idx];
          const factor = scaleMode === "perServing" ? 1 / recipe.servings : 1;
          const amt = i.amount * factor;
          const changed = i.name !== orig.name || scaleFactor !== 1;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-baseline justify-between gap-3 py-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums font-medium", children: [
                amt < 1 ? amt.toFixed(2) : amt.toFixed(1),
                " ",
                i.unit
              ] }),
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: changed ? "text-primary font-medium" : "", children: i.name }),
              changed && i.name !== orig.name && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-xs text-muted-foreground line-through", children: orig.name })
            ] }),
            i.kcal != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 text-xs tabular-nums text-muted-foreground", children: [
              Math.round((i.kcal ?? 0) * factor),
              " kcal"
            ] })
          ] }, idx);
        }) })
      ] }),
      recipe.instructions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mb-3 font-semibold", children: "Instructions" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "space-y-3 text-sm", children: recipe.instructions.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary", children: i + 1 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: s })
        ] }, i)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5 lg:sticky lg:top-20 lg:self-start", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "Your target (per serving)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MacroInputs, { value: editingTarget, onChange: setEditingTarget }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "Per serving · current" }),
          (scaleFactor !== 1 || swaps.some((s) => s.applied)) && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", onClick: reset, className: "h-7 px-2 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "mr-1 h-3 w-3" }),
            " Reset"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MacroBar, { label: "Calories", value: perServing.kcal, target: editingTarget.kcal ?? void 0, unit: "kcal", color: "kcal" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MacroBar, { label: "Protein", value: perServing.protein_g, target: editingTarget.protein_g ?? void 0, color: "protein" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MacroBar, { label: "Carbs", value: perServing.carbs_g, target: editingTarget.carbs_g ?? void 0, color: "carbs" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MacroBar, { label: "Fat", value: perServing.fat_g, target: editingTarget.fat_g ?? void 0, color: "fat" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold", children: "Tune to target" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Two ways to hit your numbers." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: scaleToTarget, variant: "secondary", className: "w-full justify-start", disabled: editingTarget.kcal == null, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Calculator, { className: "mr-2 h-4 w-4" }),
            editingTarget.kcal != null ? `Scale ingredients to ${editingTarget.kcal} kcal` : "Set a calorie target to scale"
          ] }),
          allowSubs && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: generateSwaps, disabled: loadingSwaps, className: "w-full justify-start", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "mr-2 h-4 w-4" }),
            loadingSwaps ? "Finding swaps…" : "Suggest substitutions"
          ] })
        ] }),
        swaps.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 space-y-2", children: swaps.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setSwaps((prev) => prev.map((x, j) => j === i ? {
          ...x,
          applied: !x.applied
        } : x)), className: `w-full rounded-lg border p-3 text-left text-sm transition ${s.applied ? "border-primary bg-primary/5" : "hover:bg-muted"}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-medium", children: [
                s.from,
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "→" }),
                " ",
                s.to
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: s.reason })
            ] }),
            s.applied && /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4 shrink-0 text-primary" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap gap-1.5 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DeltaPill, { v: s.delta.kcal, unit: "kcal" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DeltaPill, { v: s.delta.protein_g, unit: "P" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DeltaPill, { v: s.delta.carbs_g, unit: "C" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DeltaPill, { v: s.delta.fat_g, unit: "F" }),
            s.verified && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent", children: "DB-verified" })
          ] })
        ] }, i)) })
      ] }),
      user ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: logServing, className: "w-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "mr-2 h-4 w-4" }),
          " Log 1 serving to today"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: save, variant: "outline", className: "w-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(BookmarkPlus, { className: "mr-2 h-4 w-4" }),
          " Save tuned recipe"
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: logServing, className: "w-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "mr-2 h-4 w-4" }),
          " Log 1 serving to today"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/auth", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "w-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(BookmarkPlus, { className: "mr-2 h-4 w-4" }),
          " Sign in to save"
        ] }) })
      ] })
    ] })
  ] }) });
}
function DeltaPill({
  v,
  unit
}) {
  if (v == null) return null;
  const positive = v > 0;
  const zero = v === 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `rounded-full px-1.5 py-0.5 tabular-nums ${zero ? "bg-muted text-muted-foreground" : positive ? "bg-[var(--carbs)]/15 text-[oklch(0.45_0.13_75)]" : "bg-primary/10 text-primary"}`, children: [
    positive ? "+" : "",
    Math.round(v * 10) / 10,
    unit
  ] });
}
export {
  RecipePage as component
};
