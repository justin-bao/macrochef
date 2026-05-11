import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Label, I as Input } from "./label-CCG5UsHH.mjs";
function MacroInputs({ value, onChange }) {
  const num = (k) => (e) => {
    const v = e.target.value;
    onChange({ ...value, [k]: v === "" ? null : Number(v) });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Calories", unit: "kcal", v: value.kcal, onChange: num("kcal") }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Protein", unit: "g", v: value.protein_g, onChange: num("protein_g") }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Carbs", unit: "g", v: value.carbs_g, onChange: num("carbs_g") }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Fat", unit: "g", v: value.fat_g, onChange: num("fat_g") })
  ] });
}
function Field({
  label,
  unit,
  v,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { className: "text-xs text-muted-foreground", children: [
      label,
      " (",
      unit,
      ")"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Input,
      {
        type: "number",
        min: 0,
        value: v ?? "",
        onChange,
        placeholder: "any",
        className: "mt-1"
      }
    )
  ] });
}
export {
  MacroInputs as M
};
