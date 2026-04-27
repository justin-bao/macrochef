import type { Macros } from "@/lib/macros";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type MacrosOptional = {
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

type Props = {
  value: MacrosOptional;
  onChange: (m: MacrosOptional) => void;
  perServing?: boolean;
};

export function MacroInputs({ value, onChange }: Props) {
  const num =
    (k: keyof MacrosOptional) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      onChange({ ...value, [k]: v === "" ? null : Number(v) });
    };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Calories" unit="kcal" v={value.kcal} onChange={num("kcal")} />
      <Field label="Protein" unit="g" v={value.protein_g} onChange={num("protein_g")} />
      <Field label="Carbs" unit="g" v={value.carbs_g} onChange={num("carbs_g")} />
      <Field label="Fat" unit="g" v={value.fat_g} onChange={num("fat_g")} />
    </div>
  );
}

function Field({
  label,
  unit,
  v,
  onChange,
}: {
  label: string;
  unit: string;
  v: number | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">
        {label} ({unit})
      </Label>
      <Input
        type="number"
        min={0}
        value={v ?? ""}
        onChange={onChange}
        placeholder="any"
        className="mt-1"
      />
    </div>
  );
}
