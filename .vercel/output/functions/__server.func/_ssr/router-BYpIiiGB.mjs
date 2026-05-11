import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { c as createRouter, u as useRouter, a as createRootRoute, b as createFileRoute, l as lazyRouteComponent, H as HeadContent, S as Scripts, O as Outlet, L as Link, d as useLocation } from "../_libs/tanstack__react-router.mjs";
import { c as createClient } from "../_libs/supabase__supabase-js.mjs";
import { S as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { c as cva } from "../_libs/class-variance-authority.mjs";
import { c as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { T as Toaster$1 } from "../_libs/sonner.mjs";
import { S as Salad, a as Search, A as Activity, B as BookmarkCheck, T as Target, L as LogOut, b as LogIn } from "../_libs/lucide-react.mjs";
import { o as objectType, c as coerce, e as enumType, s as stringType } from "../_libs/zod.mjs";
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
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
const appCss = "/assets/styles-BPF_ulGY.css";
function createSupabaseClient() {
  const isBrowser = typeof window !== "undefined";
  const serverEnv = !isBrowser ? process.env : {};
  const SUPABASE_URL = "https://jnnmrfthjwtnpunqphrg.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = serverEnv.SUPABASE_PUBLISHABLE_KEY || serverEnv.SUPABASE_ANON_KEY;
  if (!SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env."
    );
  }
  if (SUPABASE_PUBLISHABLE_KEY.startsWith("sb_secret_")) {
    throw new Error(
      "VITE_SUPABASE_PUBLISHABLE_KEY is set to a secret key. Use the Supabase publishable key in browser env vars and rotate the exposed secret."
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : void 0,
      persistSession: true,
      autoRefreshToken: true
    }
  });
}
let _supabase;
const supabase = new Proxy({}, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  }
});
const AuthContext = reactExports.createContext({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {
  }
});
function AuthProvider({ children }) {
  const [session, setSession] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AuthContext.Provider,
    {
      value: {
        user: session?.user ?? null,
        session,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        }
      },
      children
    }
  );
}
const useAuth = () => reactExports.useContext(AuthContext);
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = reactExports.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref, ...props });
  }
);
Button.displayName = "Button";
function Header() {
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const isActive = (p) => loc.pathname === p;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "sticky top-0 z-40 border-b bg-background/85 backdrop-blur", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto flex h-16 max-w-6xl items-center justify-between px-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/", className: "flex items-center gap-2 font-semibold tracking-tight", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Salad, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg", children: "MacroChef" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "flex items-center gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: isActive("/") ? "secondary" : "ghost", size: "sm", children: "Dashboard" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/search", search: { mode: "recipes", q: "", subs: true }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: isActive("/search") ? "secondary" : "ghost", size: "sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "mr-1.5 h-4 w-4" }),
        " Food"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/activity", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: isActive("/activity") ? "secondary" : "ghost", size: "sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "mr-1.5 h-4 w-4" }),
        " Activity"
      ] }) }),
      user ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/saved", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: isActive("/saved") ? "secondary" : "ghost", size: "sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(BookmarkCheck, { className: "mr-1.5 h-4 w-4" }),
          " Saved"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/goals", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: isActive("/goals") ? "secondary" : "ghost", size: "sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Target, { className: "mr-1.5 h-4 w-4" }),
          " Goals"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: () => signOut(), children: /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "h-4 w-4" }) })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/auth", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, { className: "mr-1.5 h-4 w-4" }),
        " Sign in"
      ] }) })
    ] })
  ] }) });
}
const Toaster = ({ ...props }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Toaster$1,
    {
      className: "toaster group",
      toastOptions: {
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        }
      },
      ...props
    }
  );
};
function NotFoundComponent() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-[60vh] items-center justify-center px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-7xl font-bold text-foreground", children: "404" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-4 text-xl font-semibold", children: "Page not found" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "The page you're looking for doesn't exist." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/", className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90", children: "Go home" }) })
  ] }) });
}
const Route$7 = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MacroChef — Recipes tuned to your macros" },
      { name: "description", content: "Find recipes and tune ingredients to hit your calorie and macronutrient goals." }
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("head", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsxRuntimeExports.jsx(Scripts, {})
    ] })
  ] });
}
function RootComponent() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AuthProvider, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Header, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "border-t py-6 text-center text-xs text-muted-foreground", children: "Recipe data via Spoonacular · Substitutions powered by AI" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Toaster, {})
  ] });
}
const $$splitComponentImporter$6 = () => import("./search-B0QQyQnN.mjs");
const searchSchema$1 = objectType({
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
const Route$6 = createFileRoute("/search")({
  validateSearch: searchSchema$1.parse,
  head: () => ({
    meta: [{
      title: "Search recipes & restaurants — MacroChef"
    }, {
      name: "description",
      content: "Search recipes or fast food combos tuned to your macro targets."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import("./saved-BmMZ1If_.mjs");
const Route$5 = createFileRoute("/saved")({
  head: () => ({
    meta: [{
      title: "Saved recipes — MacroChef"
    }, {
      name: "description",
      content: "Your saved tuned recipes."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import("./goals-CLEF03rU.mjs");
const Route$4 = createFileRoute("/goals")({
  head: () => ({
    meta: [{
      title: "Macro goals — MacroChef"
    }, {
      name: "description",
      content: "Set your default daily calorie and macronutrient targets."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./auth-DQi0waVl.mjs");
const Route$3 = createFileRoute("/auth")({
  head: () => ({
    meta: [{
      title: "Sign in — MacroChef"
    }, {
      name: "description",
      content: "Sign in to save recipes and macro goals."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./activity-CVPbu5z-.mjs");
const Route$2 = createFileRoute("/activity")({
  head: () => ({
    meta: [{
      title: "Activity & workouts — MacroChef"
    }, {
      name: "description",
      content: "Track running, cardio, weightlifting, and gym activity alongside your food log."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./index-CCVFKxzF.mjs");
const Route$1 = createFileRoute("/")({
  head: () => ({
    meta: [{
      title: "MacroChef — Fuel, food, and training"
    }, {
      name: "description",
      content: "Track food and workouts, then use MacroChef to decide what to eat next based on the macros you have left."
    }, {
      property: "og:title",
      content: "MacroChef — Fuel, food, and training"
    }, {
      property: "og:description",
      content: "A unified macro tracker, meal decision engine, and activity log for running, cardio, and lifting."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./recipe._id-Db6hoEJ2.mjs");
const searchSchema = objectType({
  src: enumType(["spoonacular", "kaggle"]).catch("spoonacular"),
  kcal: coerce.number().optional().catch(void 0),
  p: coerce.number().optional().catch(void 0),
  c: coerce.number().optional().catch(void 0),
  f: coerce.number().optional().catch(void 0),
  subs: coerce.boolean().catch(true)
});
const Route = createFileRoute("/recipe/$id")({
  validateSearch: searchSchema.parse,
  head: ({
    params
  }) => ({
    meta: [{
      title: `Recipe ${params.id} — MacroChef`
    }, {
      name: "description",
      content: "Tune this recipe to your macronutrient targets."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const SearchRoute = Route$6.update({
  id: "/search",
  path: "/search",
  getParentRoute: () => Route$7
});
const SavedRoute = Route$5.update({
  id: "/saved",
  path: "/saved",
  getParentRoute: () => Route$7
});
const GoalsRoute = Route$4.update({
  id: "/goals",
  path: "/goals",
  getParentRoute: () => Route$7
});
const AuthRoute = Route$3.update({
  id: "/auth",
  path: "/auth",
  getParentRoute: () => Route$7
});
const ActivityRoute = Route$2.update({
  id: "/activity",
  path: "/activity",
  getParentRoute: () => Route$7
});
const IndexRoute = Route$1.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$7
});
const RecipeIdRoute = Route.update({
  id: "/recipe/$id",
  path: "/recipe/$id",
  getParentRoute: () => Route$7
});
const rootRouteChildren = {
  IndexRoute,
  ActivityRoute,
  AuthRoute,
  GoalsRoute,
  SavedRoute,
  SearchRoute,
  RecipeIdRoute
};
const routeTree = Route$7._addFileChildren(rootRouteChildren)._addFileTypes();
function DefaultErrorComponent({ error, reset }) {
  const router2 = useRouter();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        className: "h-8 w-8 text-destructive",
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 2,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "path",
          {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          }
        )
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold tracking-tight text-foreground", children: "Something went wrong" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "An unexpected error occurred. Please try again." }),
    false,
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex items-center justify-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            router2.invalidate();
            reset();
          },
          className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          children: "Try again"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          href: "/",
          className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
          children: "Go home"
        }
      )
    ] })
  ] }) });
}
const getRouter = () => {
  const router2 = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Button as B,
  Route$6 as R,
  Route as a,
  cn as c,
  router as r,
  supabase as s,
  useAuth as u
};
