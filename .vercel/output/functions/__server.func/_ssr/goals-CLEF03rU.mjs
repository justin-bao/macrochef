import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { e as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useAuth, s as supabase, B as Button } from "./router-BYpIiiGB.mjs";
import { C as Card } from "./card-BiXvzZzb.mjs";
import { M as MacroInputs } from "./MacroInputs-DYKngRYt.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
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
import "../_libs/lucide-react.mjs";
import "../_libs/zod.mjs";
import "./label-CCG5UsHH.mjs";
import "../_libs/radix-ui__react-label.mjs";
import "../_libs/radix-ui__react-primitive.mjs";
function GoalsPage() {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const [macros, setMacros] = reactExports.useState({
    kcal: 2e3,
    protein_g: 150,
    carbs_g: 200,
    fat_g: 65
  });
  const [busy, setBusy] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!loading && !user) navigate({
      to: "/auth"
    });
  }, [user, loading, navigate]);
  reactExports.useEffect(() => {
    if (!user) return;
    supabase.from("macro_goals").select("*").eq("user_id", user.id).maybeSingle().then(({
      data
    }) => {
      if (data) setMacros({
        kcal: data.kcal,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g
      });
    });
  }, [user]);
  const save = async () => {
    if (!user) return;
    setBusy(true);
    const {
      error
    } = await supabase.from("macro_goals").upsert({
      user_id: user.id,
      ...macros,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Goals saved.");
  };
  if (!user) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-2xl px-4 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold tracking-tight", children: "Daily macro goals" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-muted-foreground", children: "These will pre-fill on every recipe search." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "mt-6 p-6 space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(MacroInputs, { value: {
        kcal: macros.kcal,
        protein_g: macros.protein_g,
        carbs_g: macros.carbs_g,
        fat_g: macros.fat_g
      }, onChange: (m) => setMacros({
        kcal: m.kcal ?? 0,
        protein_g: m.protein_g ?? 0,
        carbs_g: m.carbs_g ?? 0,
        fat_g: m.fat_g ?? 0
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", children: "Cancel" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, disabled: busy, children: busy ? "Saving…" : "Save goals" })
      ] })
    ] })
  ] });
}
export {
  GoalsPage as component
};
