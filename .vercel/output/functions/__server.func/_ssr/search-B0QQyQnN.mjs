import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { s as searchRecipes, S as Skeleton, c as createSsrRpc } from "./skeleton-D5ozslkw.mjs";
import { c as createServerFn } from "./index.mjs";
import { C as Card } from "./card-BiXvzZzb.mjs";
import { I as Input, L as Label } from "./label-CCG5UsHH.mjs";
import { R as Route$6, B as Button, c as cn } from "./router-BYpIiiGB.mjs";
import { R as Root, T as Thumb } from "../_libs/radix-ui__react-switch.mjs";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent, S as Select, d as SelectTrigger, e as SelectValue, f as SelectContent, g as SelectItem } from "./select-BpQIcSi_.mjs";
import { M as MacroInputs } from "./MacroInputs-DYKngRYt.mjs";
import { u as useLocalTracking } from "./useLocalTracking-COnPfdkQ.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import "../_libs/seroval.mjs";
import { U as UtensilsCrossed, c as Store, a as Search, C as ChevronDown, d as CircleCheck } from "../_libs/lucide-react.mjs";
import { o as objectType, n as numberType, s as stringType, c as coerce, e as enumType } from "../_libs/zod.mjs";
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
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "../_libs/radix-ui__react-label.mjs";
import "../_libs/radix-ui__react-primitive.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/radix-ui__primitive.mjs";
import "../_libs/radix-ui__react-context.mjs";
import "../_libs/@radix-ui/react-use-controllable-state+[...].mjs";
import "../_libs/@radix-ui/react-use-layout-effect+[...].mjs";
import "../_libs/radix-ui__react-use-previous.mjs";
import "../_libs/radix-ui__react-use-size.mjs";
import "../_libs/radix-ui__react-tabs.mjs";
import "../_libs/radix-ui__react-roving-focus.mjs";
import "../_libs/radix-ui__react-collection.mjs";
import "../_libs/radix-ui__react-id.mjs";
import "../_libs/@radix-ui/react-use-callback-ref+[...].mjs";
import "../_libs/radix-ui__react-direction.mjs";
import "../_libs/radix-ui__react-presence.mjs";
import "../_libs/radix-ui__react-select.mjs";
import "../_libs/radix-ui__number.mjs";
import "../_libs/@radix-ui/react-dismissable-layer+[...].mjs";
import "../_libs/@radix-ui/react-use-escape-keydown+[...].mjs";
import "../_libs/radix-ui__react-focus-guards.mjs";
import "../_libs/radix-ui__react-focus-scope.mjs";
import "../_libs/radix-ui__react-popper.mjs";
import "../_libs/floating-ui__react-dom.mjs";
import "../_libs/floating-ui__dom.mjs";
import "../_libs/floating-ui__core.mjs";
import "../_libs/floating-ui__utils.mjs";
import "../_libs/radix-ui__react-arrow.mjs";
import "../_libs/radix-ui__react-portal.mjs";
import "../_libs/@radix-ui/react-visually-hidden+[...].mjs";
import "../_libs/aria-hidden.mjs";
import "../_libs/react-remove-scroll.mjs";
import "../_libs/react-remove-scroll-bar.mjs";
import "../_libs/react-style-singleton.mjs";
import "../_libs/get-nonce.mjs";
import "../_libs/use-sidecar.mjs";
import "../_libs/use-callback-ref.mjs";
import "../_libs/date-fns.mjs";
const SUPPORTED_CHAINS = ["McDonald's", "Chipotle", "Taco Bell", "Subway", "Chick-fil-A", "Wendy's", "Burger King", "Starbucks", "Panera Bread", "Domino's Pizza", "Pizza Hut", "KFC", "Five Guys", "Shake Shack", "Sweetgreen"];
const searchRestaurantCombos = createServerFn({
  method: "POST"
}).inputValidator(objectType({
  chain: stringType().min(1).max(60),
  query: stringType().trim().max(120).optional().default(""),
  kcal: numberType().positive().nullable().optional(),
  protein_g: numberType().positive().nullable().optional(),
  carbs_g: numberType().positive().nullable().optional(),
  fat_g: numberType().positive().nullable().optional(),
  // Max number of items per combo (1 = single item, 4 = up to a meal of 4).
  maxItems: numberType().int().min(1).max(4).default(3),
  // How many top combos to return.
  number: numberType().int().min(1).max(20).default(8)
}).parse).handler(createSsrRpc("f635dc7bf7e2c59bf393e64905411452d1277acee013567b2b7aace652895de3"));
const Switch = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Root,
  {
    className: cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    ),
    ...props,
    ref,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Thumb,
      {
        className: cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )
      }
    )
  }
));
Switch.displayName = Root.displayName;
objectType({
  mode: enumType(["recipes", "restaurants"]).optional().catch(void 0).default("recipes"),
  q: stringType().catch(""),
  kcal: coerce.number().optional().catch(void 0),
  p: coerce.number().optional().catch(void 0),
  c: coerce.number().optional().catch(void 0),
  f: coerce.number().optional().catch(void 0),
  subs: coerce.boolean().catch(true),
  chain: stringType().optional().catch(void 0),
  maxItems: coerce.number().optional().catch(void 0)
});
function SearchPage() {
  const search = Route$6.useSearch();
  const navigate = Route$6.useNavigate();
  const mode = search.mode;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-6xl px-4 py-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: mode, onValueChange: (v) => navigate({
    search: (prev) => ({
      ...prev,
      mode: v
    })
  }), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "mb-4 grid w-full grid-cols-2 sm:w-auto sm:inline-grid", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "recipes", className: "gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(UtensilsCrossed, { className: "h-4 w-4" }),
        "Recipes"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "restaurants", className: "gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Store, { className: "h-4 w-4" }),
        "Restaurants"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "recipes", className: "mt-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RecipesTab, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "restaurants", className: "mt-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RestaurantsTab, {}) })
  ] }) });
}
function RecipesTab() {
  const search = Route$6.useSearch();
  const navigate = Route$6.useNavigate();
  const [q, setQ] = reactExports.useState(search.q);
  const [macros, setMacros] = reactExports.useState({
    kcal: search.kcal ?? null,
    protein_g: search.p ?? null,
    carbs_g: search.c ?? null,
    fat_g: search.f ?? null
  });
  const [allowSubs, setAllowSubs] = reactExports.useState(search.subs);
  const [results, setResults] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const hasMacros = search.kcal != null || search.p != null || search.c != null || search.f != null;
  const hasCriteria = !!search.q || hasMacros;
  reactExports.useEffect(() => {
    if (search.mode !== "recipes") return;
    if (!hasCriteria) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchRecipes({
      data: {
        query: search.q,
        number: 12,
        kcal: search.kcal ?? null,
        protein_g: search.p ?? null,
        carbs_g: search.c ?? null,
        fat_g: search.f ?? null,
        allowSubs: search.subs
      }
    }).then((r) => {
      if (cancelled) return;
      setResults(r.results);
      setError(r.error);
    }).catch((e) => !cancelled && setError(e.message)).finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [search.mode, search.q, search.kcal, search.p, search.c, search.f, search.subs, hasCriteria]);
  const submit = (e) => {
    e.preventDefault();
    navigate({
      search: (prev) => ({
        ...prev,
        mode: "recipes",
        q: q.trim(),
        kcal: macros.kcal ?? void 0,
        p: macros.protein_g ?? void 0,
        c: macros.carbs_g ?? void 0,
        f: macros.fat_g ?? void 0,
        subs: allowSubs
      })
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: submit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Dish, cuisine, or leave blank…", className: "pl-9 h-10" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", disabled: !q.trim() && !(macros.kcal != null || macros.protein_g != null || macros.carbs_g != null || macros.fat_g != null), children: "Search" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-xs text-muted-foreground", children: "Leave any macro blank to ignore it." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(MacroInputs, { value: macros, onChange: setMacros })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "allow-subs", className: "text-sm font-medium", children: "Allow substitutions" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: allowSubs ? "Show recipes that can be tuned with swaps to fit your macros." : "Only show recipes that already fit — no swaps needed." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { id: "allow-subs", checked: allowSubs, onCheckedChange: setAllowSubs })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8", children: [
      loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: Array.from({
        length: 6
      }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-72 w-full" }, i)) }),
      !loading && error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive", children: error }),
      !loading && !error && results.length === 0 && hasCriteria && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-center text-muted-foreground", children: [
        "No recipes found. ",
        !allowSubs && "Try enabling substitutions or relaxing some macros."
      ] }),
      !loading && !error && !hasCriteria && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-muted-foreground", children: "Enter a dish, cuisine, or set some macro targets to start." }),
      !loading && results.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-5 sm:grid-cols-2 lg:grid-cols-3", children: results.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(ResultCard, { result: r, target: macros, allowSubs }, r.id)) })
    ] })
  ] });
}
function RestaurantsTab() {
  const search = Route$6.useSearch();
  const navigate = Route$6.useNavigate();
  const [chain, setChain] = reactExports.useState(search.chain ?? SUPPORTED_CHAINS[0]);
  const [q, setQ] = reactExports.useState(search.q);
  const [macros, setMacros] = reactExports.useState({
    kcal: search.kcal ?? null,
    protein_g: search.p ?? null,
    carbs_g: search.c ?? null,
    fat_g: search.f ?? null
  });
  const [maxItems, setMaxItems] = reactExports.useState(search.maxItems ?? 3);
  const [combos, setCombos] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const activeChain = search.chain;
  const hasMacros = search.kcal != null || search.p != null || search.c != null || search.f != null;
  reactExports.useEffect(() => {
    if (search.mode !== "restaurants") return;
    if (!activeChain) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchRestaurantCombos({
      data: {
        chain: activeChain,
        query: search.q,
        kcal: search.kcal ?? null,
        protein_g: search.p ?? null,
        carbs_g: search.c ?? null,
        fat_g: search.f ?? null,
        maxItems: search.maxItems ?? 3,
        number: 8
      }
    }).then((r) => {
      if (cancelled) return;
      setCombos(r.combos);
      setError(r.error);
    }).catch((e) => !cancelled && setError(e.message)).finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [search.mode, activeChain, search.q, search.kcal, search.p, search.c, search.f, search.maxItems]);
  const submit = (e) => {
    e.preventDefault();
    navigate({
      search: (prev) => ({
        ...prev,
        mode: "restaurants",
        q: q.trim(),
        chain,
        maxItems,
        kcal: macros.kcal ?? void 0,
        p: macros.protein_g ?? void 0,
        c: macros.carbs_g ?? void 0,
        f: macros.fat_g ?? void 0
      })
    });
  };
  const target = macros;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: submit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-[minmax(0,200px)_1fr_auto]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: chain, onValueChange: setChain, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Pick a restaurant" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: SUPPORTED_CHAINS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: c, children: c }, c)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Optional: 'chicken', 'salad'…", className: "pl-9 h-10" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", children: "Build combos" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-xs text-muted-foreground", children: "Set the macros you want the combo to total. Leave blank to ignore." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(MacroInputs, { value: macros, onChange: setMacros })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm font-medium", children: "Max items per combo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: "Higher = more combinations, slower but more flexible." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: String(maxItems), onValueChange: (v) => setMaxItems(Number(v)), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-24", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: [1, 2, 3, 4].map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: String(n), children: n }, n)) })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8", children: [
      loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: Array.from({
        length: 4
      }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-48 w-full" }, i)) }),
      !loading && error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive", children: error }),
      !loading && !error && !activeChain && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-muted-foreground", children: "Pick a restaurant and hit “Build combos”." }),
      !loading && !error && activeChain && combos.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-center text-muted-foreground", children: [
        "No menu items found for ",
        activeChain,
        ". Try another chain or clearing the search term."
      ] }),
      !loading && combos.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-5 sm:grid-cols-2", children: combos.map((combo, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(ComboCard, { combo, target, hasTarget: hasMacros }, i)) })
    ] })
  ] });
}
function ComboCard({
  combo,
  target,
  hasTarget
}) {
  const {
    addFoodItems
  } = useLocalTracking();
  const fitLabel = hasTarget ? fitFromScore(combo.score) : null;
  const logCombo = () => {
    addFoodItems(/* @__PURE__ */ new Date(), "lunch", [{
      id: crypto.randomUUID(),
      name: combo.items.map((item) => item.title).join(" + "),
      quantity: 1,
      unit: combo.items[0]?.restaurantChain ? `${combo.items[0].restaurantChain} combo` : "combo",
      kcal: Math.round(combo.totals.kcal),
      protein_g: Math.round(combo.totals.protein_g * 10) / 10,
      carbs_g: Math.round(combo.totals.carbs_g * 10) / 10,
      fat_g: Math.round(combo.totals.fat_g * 10) / 10,
      source: "restaurant",
      confidence: "high",
      note: "Logged from MacroChef restaurant combo.",
      loggedAt: (/* @__PURE__ */ new Date()).toISOString()
    }]);
    toast.success("Logged combo to lunch.");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-4 transition hover:-translate-y-0.5 hover:shadow-md", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-medium text-muted-foreground", children: combo.items[0]?.restaurantChain }),
      fitLabel && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${fitLabel.cls}`, children: fitLabel.label })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-2", children: combo.items.map((it) => /* @__PURE__ */ jsxRuntimeExports.jsx(ComboItem, { item: it }, it.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap gap-2 border-t pt-3 text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { label: `${combo.totals.kcal} kcal`, c: "kcal" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { label: `${Math.round(combo.totals.protein_g)}P`, c: "protein" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { label: `${Math.round(combo.totals.carbs_g)}C`, c: "carbs" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { label: `${Math.round(combo.totals.fat_g)}F`, c: "fat" }),
      hasTarget && /* @__PURE__ */ jsxRuntimeExports.jsx(DeltaSummary, { totals: combo.totals, target })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "secondary", className: "mt-3 w-full gap-2", onClick: logCombo, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4" }),
      "Log combo to today"
    ] })
  ] });
}
function ComboItem({
  item
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm", children: [
    item.image && /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: item.image, alt: item.title, className: "h-8 w-8 shrink-0 rounded object-cover", loading: "lazy" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-medium", children: item.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground", children: [
        item.kcal,
        " kcal · ",
        Math.round(item.protein_g),
        "P · ",
        Math.round(item.carbs_g),
        "C ·",
        " ",
        Math.round(item.fat_g),
        "F"
      ] })
    ] })
  ] });
}
function DeltaSummary({
  totals,
  target
}) {
  const parts = [];
  if (target.kcal != null) parts.push(`${signed(totals.kcal - target.kcal)} kcal`);
  if (target.protein_g != null) parts.push(`${signed(totals.protein_g - target.protein_g)}P`);
  if (target.carbs_g != null) parts.push(`${signed(totals.carbs_g - target.carbs_g)}C`);
  if (target.fat_g != null) parts.push(`${signed(totals.fat_g - target.fat_g)}F`);
  if (parts.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground", children: [
    "vs goal: ",
    parts.join(", ")
  ] });
}
function signed(v) {
  const r = Math.round(v * 10) / 10;
  return r > 0 ? `+${r}` : `${r}`;
}
function fitFromScore(score) {
  if (score < 0.1) return {
    label: "Great fit",
    cls: "bg-[var(--protein)]/15 text-[var(--protein)]"
  };
  if (score < 0.25) return {
    label: "Close fit",
    cls: "bg-amber-500/15 text-amber-700"
  };
  return {
    label: "Off goal",
    cls: "bg-muted text-muted-foreground"
  };
}
function ResultCard({
  result: r,
  target,
  allowSubs
}) {
  const [showSwaps, setShowSwaps] = reactExports.useState(false);
  const baseKcal = r.adjustedKcal ?? r.kcal;
  const factor = target.kcal != null && baseKcal != null && baseKcal > 0 ? target.kcal / baseKcal : 1;
  const normalized = {
    kcal: baseKcal != null ? baseKcal * factor : void 0,
    protein_g: (r.adjustedProtein_g ?? r.protein_g) != null ? (r.adjustedProtein_g ?? r.protein_g) * factor : void 0,
    carbs_g: (r.adjustedCarbs_g ?? r.carbs_g) != null ? (r.adjustedCarbs_g ?? r.carbs_g) * factor : void 0,
    fat_g: (r.adjustedFat_g ?? r.fat_g) != null ? (r.adjustedFat_g ?? r.fat_g) * factor : void 0
  };
  const showingNormalized = factor !== 1;
  const hasSwaps = (r.swaps?.length ?? 0) > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "overflow-hidden p-0 h-full transition hover:-translate-y-0.5 hover:shadow-md", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/recipe/$id", params: {
      id: String(r.id)
    }, search: {
      src: r.source ?? "spoonacular",
      kcal: target.kcal ?? void 0,
      p: target.protein_g ?? void 0,
      c: target.carbs_g ?? void 0,
      f: target.fat_g ?? void 0,
      subs: allowSubs
    }, className: "block", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "aspect-[4/3] bg-muted overflow-hidden", children: r.image && /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: r.image, alt: r.title, className: "h-full w-full object-cover", loading: "lazy" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold line-clamp-2", children: r.title }),
          r.fitKind && /* @__PURE__ */ jsxRuntimeExports.jsx(FitBadge, { kind: r.fitKind, swapCount: r.swapCount ?? 0 })
        ] }),
        normalized.kcal != null && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { label: `${Math.round(normalized.kcal)} kcal`, c: "kcal" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { label: `${Math.round(normalized.protein_g ?? 0)}P`, c: "protein" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { label: `${Math.round(normalized.carbs_g ?? 0)}C`, c: "carbs" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { label: `${Math.round(normalized.fat_g ?? 0)}F`, c: "fat" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
          showingNormalized ? `Scaled to ${target.kcal} kcal${hasSwaps ? " · with estimated swaps" : ""}` : hasSwaps ? "Per serving · with estimated swaps" : "Per serving",
          r.source === "kaggle" && " · from community archive"
        ] })
      ] })
    ] }),
    hasSwaps && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => setShowSwaps((v) => !v), className: "flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50", "aria-expanded": showSwaps, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: showSwaps ? "Hide swaps" : `View ${r.swaps.length} swap${r.swaps.length > 1 ? "s" : ""}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: `h-3.5 w-3.5 transition-transform ${showSwaps ? "rotate-180" : ""}` })
      ] }),
      showSwaps && /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-2 px-4 pb-3 pt-1 text-xs", children: [
        r.swaps.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "rounded-md bg-muted/40 p-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-medium text-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "capitalize", children: s.from }),
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "→" }),
            " ",
            s.to
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DeltaPill, { v: s.delta.kcal, unit: "kcal" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DeltaPill, { v: s.delta.protein_g, unit: "P" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DeltaPill, { v: s.delta.carbs_g, unit: "C" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DeltaPill, { v: s.delta.fat_g, unit: "F" })
          ] })
        ] }, i)),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "pt-1 text-[10px] italic text-muted-foreground", children: "Estimates per serving — verified on the recipe page." })
      ] })
    ] })
  ] });
}
function DeltaPill({
  v,
  unit
}) {
  if (v == null) return null;
  if (v === 0) return null;
  const positive = v > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `rounded-full px-1.5 py-0.5 tabular-nums text-[10px] ${positive ? "bg-[var(--carbs)]/15 text-[oklch(0.45_0.13_75)]" : "bg-primary/10 text-primary"}`, children: [
    positive ? "+" : "",
    Math.round(v * 10) / 10,
    unit
  ] });
}
function Badge({
  label,
  c
}) {
  const cls = {
    kcal: "bg-[var(--kcal)]/10 text-[var(--kcal)]",
    protein: "bg-[var(--protein)]/10 text-[var(--protein)]",
    carbs: "bg-[var(--carbs)]/15 text-[oklch(0.45_0.13_75)]",
    fat: "bg-[var(--fat)]/10 text-[var(--fat)]"
  }[c];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `rounded-full px-2 py-0.5 font-medium ${cls}`, children: label });
}
function FitBadge({
  kind,
  swapCount
}) {
  const map = {
    fits: {
      label: "Fits",
      cls: "bg-[var(--protein)]/15 text-[var(--protein)]"
    },
    swaps: {
      label: swapCount > 0 ? `Fits w/ ${swapCount} swap${swapCount > 1 ? "s" : ""}` : "Fits w/ swaps",
      cls: "bg-amber-500/15 text-amber-700"
    },
    close: {
      label: "Close",
      cls: "bg-muted text-muted-foreground"
    }
  }[kind];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${map.cls}`, children: map.label });
}
export {
  SearchPage as component
};
