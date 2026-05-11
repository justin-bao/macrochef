import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { e as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useAuth, s as supabase, B as Button } from "./router-BYpIiiGB.mjs";
import { C as Card } from "./card-BiXvzZzb.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { e as Trash2 } from "../_libs/lucide-react.mjs";
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
import "../_libs/zod.mjs";
function SavedPage() {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = reactExports.useState([]);
  reactExports.useEffect(() => {
    if (!loading && !user) navigate({
      to: "/auth"
    });
  }, [user, loading, navigate]);
  reactExports.useEffect(() => {
    if (!user) return;
    supabase.from("saved_recipes").select("id, spoonacular_id, title, image, computed_macros").order("created_at", {
      ascending: false
    }).then(({
      data
    }) => setItems(data ?? []));
  }, [user]);
  const remove = async (id) => {
    const {
      error
    } = await supabase.from("saved_recipes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setItems((p) => p.filter((i) => i.id !== id));
  };
  if (!user) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-5xl px-4 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-bold tracking-tight", children: "Saved recipes" }),
    items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-8 text-muted-foreground", children: "No saved recipes yet. Tune one and hit save." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3", children: items.map((r) => {
      const ps = r.computed_macros?.perServing;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "overflow-hidden p-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/recipe/$id", params: {
          id: String(r.spoonacular_id)
        }, search: {
          subs: true
        }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "aspect-[4/3] overflow-hidden bg-muted", children: r.image && /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: r.image, alt: r.title, className: "h-full w-full object-cover" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold line-clamp-2", children: r.title }),
          ps && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-xs text-muted-foreground", children: [
            Math.round(ps.kcal),
            " kcal · ",
            Math.round(ps.protein_g),
            "P · ",
            Math.round(ps.carbs_g),
            "C · ",
            Math.round(ps.fat_g),
            "F per serving"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", size: "sm", onClick: () => remove(r.id), className: "mt-2 text-muted-foreground hover:text-destructive", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "mr-1.5 h-3.5 w-3.5" }),
            " Remove"
          ] })
        ] })
      ] }, r.id);
    }) })
  ] });
}
export {
  SavedPage as component
};
