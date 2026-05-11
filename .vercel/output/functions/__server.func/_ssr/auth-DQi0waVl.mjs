import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { e as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useAuth, B as Button, s as supabase } from "./router-BYpIiiGB.mjs";
import { C as Card } from "./card-BiXvzZzb.mjs";
import { L as Label, I as Input } from "./label-CCG5UsHH.mjs";
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
import "../_libs/radix-ui__react-label.mjs";
import "../_libs/radix-ui__react-primitive.mjs";
function AuthPage() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = reactExports.useState("signin");
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [confirmPassword, setConfirmPassword] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (user) navigate({
      to: "/"
    });
  }, [user, navigate]);
  const submit = async (e) => {
    e.preventDefault();
    if (mode === "signup" && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    const {
      error
    } = mode === "signin" ? await supabase.auth.signInWithPassword({
      email,
      password
    }) : await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else if (mode === "signup") toast.success("Account created. Check your email to confirm your account.");
  };
  const google = async () => {
    const {
      error
    } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) toast.error(error.message);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-md px-4 py-16", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-7", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold tracking-tight", children: mode === "signin" ? "Welcome back" : "Create your account" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Save recipes tuned to your macros." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", className: "mt-6 w-full", onClick: google, children: "Continue with Google" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "my-5 flex items-center gap-3 text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-px flex-1 bg-border" }),
      " or ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-px flex-1 bg-border" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: submit, className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Email" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "mt-1" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Password" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "password", required: true, minLength: 6, value: password, onChange: (e) => setPassword(e.target.value), className: "mt-1" })
      ] }),
      mode === "signup" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Confirm Password" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "password", required: true, minLength: 6, value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), className: "mt-1" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", className: "w-full", disabled: loading, children: loading ? "…" : mode === "signin" ? "Sign in" : "Sign up" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-5 text-center text-sm text-muted-foreground", children: [
      mode === "signin" ? "No account?" : "Already have one?",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
        setMode(mode === "signin" ? "signup" : "signin");
        setConfirmPassword("");
      }, className: "font-medium text-primary hover:underline", children: mode === "signin" ? "Sign up" : "Sign in" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-6 text-center text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/", className: "text-muted-foreground hover:text-foreground", children: "← back to home" }) })
  ] }) });
}
export {
  AuthPage as component
};
