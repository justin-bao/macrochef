import { c as createServerFn, T as TSS_SERVER_FUNCTION, g as getServerFnById } from "./index.mjs";
import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { c as cn } from "./router-BYpIiiGB.mjs";
import { o as objectType, e as enumType, n as numberType, b as booleanType, s as stringType, a as arrayType } from "../_libs/zod.mjs";
var createSsrRpc = (functionId) => {
  const url = "/_serverFn/" + functionId;
  const serverFnMeta = { id: functionId };
  const fn = async (...args) => {
    return (await getServerFnById(functionId))(...args);
  };
  return Object.assign(fn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const searchRecipes = createServerFn({
  method: "POST"
}).inputValidator(objectType({
  query: stringType().trim().max(120).optional().default(""),
  diet: stringType().optional(),
  cuisine: stringType().optional(),
  maxReadyTime: numberType().int().positive().max(360).optional(),
  number: numberType().int().min(1).max(24).default(12),
  // Per-serving macro targets — any may be omitted (null/undefined = ignore).
  kcal: numberType().positive().nullable().optional(),
  protein_g: numberType().positive().nullable().optional(),
  carbs_g: numberType().positive().nullable().optional(),
  fat_g: numberType().positive().nullable().optional(),
  // When true, recipes only need to be in the ballpark (they can be tuned via swaps/scaling).
  // When false, recipes must already fit within a tight window (±15%).
  allowSubs: booleanType().default(true)
}).parse).handler(createSsrRpc("f0df7c6b91b1822e23adc964756d450bf82859ef741634cb9943e5362666af8d"));
const getRecipe = createServerFn({
  method: "POST"
}).inputValidator(objectType({
  id: numberType().int().positive(),
  source: enumType(["spoonacular", "kaggle"]).default("spoonacular")
}).parse).handler(createSsrRpc("9f394f51468093d245e6074870259b6978a63991de20049b16afcba538132c41"));
const suggestSwaps = createServerFn({
  method: "POST"
}).inputValidator(objectType({
  title: stringType().min(1).max(200),
  ingredients: arrayType(objectType({
    name: stringType(),
    amount: numberType(),
    unit: stringType()
  })).min(1).max(40),
  current: objectType({
    kcal: numberType(),
    protein_g: numberType(),
    carbs_g: numberType(),
    fat_g: numberType()
  }),
  target: objectType({
    kcal: numberType().nullable().optional(),
    protein_g: numberType().nullable().optional(),
    carbs_g: numberType().nullable().optional(),
    fat_g: numberType().nullable().optional()
  }),
  servings: numberType().positive()
}).parse).handler(createSsrRpc("d759022b5d95e7bf38101f3cfee55a82392c640a288def3367f16897089490d3"));
function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("animate-pulse rounded-md bg-primary/10", className), ...props });
}
export {
  Skeleton as S,
  suggestSwaps as a,
  createSsrRpc as c,
  getRecipe as g,
  searchRecipes as s
};
