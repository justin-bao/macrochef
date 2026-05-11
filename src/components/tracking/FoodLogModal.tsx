import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FoodLogItem } from "@/lib/tracking";
import { PenLine, Plus, Sparkles } from "lucide-react";

const ESTIMATES: Array<{
  keys: string[];
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}> = [
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
    fat_g: 1,
  },
  { keys: ["yogurt", "skyr"], kcal: 130, protein_g: 20, carbs_g: 8, fat_g: 0 },
  { keys: ["protein shake", "whey"], kcal: 130, protein_g: 25, carbs_g: 3, fat_g: 2 },
];

function emptyItem(): FoodLogItem {
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
    loggedAt: new Date().toISOString(),
  };
}

function parseFoodDescription(description: string): FoodLogItem[] {
  return description
    .split(/\n|,| and /i)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const quantityMatch = raw.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
      const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
      const unit = quantityMatch?.[2] ?? "serving";
      const name = quantityMatch?.[3] ?? raw;
      const normalized = name.toLowerCase();
      const match = ESTIMATES.find((estimate) =>
        estimate.keys.some((key) => normalized.includes(key)),
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
        source: "ai" as const,
        confidence: match ? ("medium" as const) : ("low" as const),
        note: match
          ? "MacroChef quick estimate. Review before saving."
          : "Fallback estimate. Edit macros before saving.",
        loggedAt: new Date().toISOString(),
      };
    });
}

export function FoodLogModal({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (items: FoodLogItem[]) => void;
}) {
  const [manual, setManual] = useState<FoodLogItem>(emptyItem);
  const [description, setDescription] = useState("");
  const [parsed, setParsed] = useState<FoodLogItem[]>([]);

  const canAddManual = manual.name.trim().length > 0 && manual.kcal > 0;
  const totalParsed = useMemo(() => parsed.reduce((sum, item) => sum + item.kcal, 0), [parsed]);

  const updateParsed = (id: string, field: keyof FoodLogItem, value: string) => {
    setParsed((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "name" || field === "unit" || field === "note"
                  ? value
                  : Number(value) || 0,
            }
          : item,
      ),
    );
  };

  const closeAndReset = (nextOpen: boolean) => {
    if (!nextOpen) {
      setManual(emptyItem());
      setDescription("");
      setParsed([]);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={closeAndReset}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log food</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="quick" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Quick parse
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <PenLine className="h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="mt-4 space-y-4">
            {parsed.length === 0 ? (
              <>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="8 oz chicken breast, 1 cup rice, broccoli"
                  className="min-h-28 resize-none"
                />
                <Button
                  className="w-full"
                  disabled={!description.trim()}
                  onClick={() => setParsed(parseFoodDescription(description))}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Estimate items
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  {parsed.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3">
                      <div className="grid gap-2 sm:grid-cols-[1fr_88px_100px]">
                        <Input
                          value={item.name}
                          onChange={(event) => updateParsed(item.id, "name", event.target.value)}
                        />
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(event) =>
                            updateParsed(item.id, "quantity", event.target.value)
                          }
                        />
                        <Input
                          value={item.unit}
                          onChange={(event) => updateParsed(item.id, "unit", event.target.value)}
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        <MacroInput
                          label="Cal"
                          value={item.kcal}
                          onChange={(value) => updateParsed(item.id, "kcal", value)}
                        />
                        <MacroInput
                          label="Protein"
                          value={item.protein_g}
                          onChange={(value) => updateParsed(item.id, "protein_g", value)}
                        />
                        <MacroInput
                          label="Carbs"
                          value={item.carbs_g}
                          onChange={(value) => updateParsed(item.id, "carbs_g", value)}
                        />
                        <MacroInput
                          label="Fat"
                          value={item.fat_g}
                          onChange={(value) => updateParsed(item.id, "fat_g", value)}
                        />
                      </div>
                      {item.note && (
                        <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setParsed([])}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      onAdd(parsed);
                      closeAndReset(false);
                    }}
                  >
                    Add {parsed.length} item{parsed.length === 1 ? "" : "s"} · {totalParsed} kcal
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4 space-y-4">
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Food name</Label>
                <Input
                  value={manual.name}
                  onChange={(event) => setManual((item) => ({ ...item, name: event.target.value }))}
                  placeholder="Greek yogurt bowl"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={manual.quantity}
                    onChange={(event) =>
                      setManual((item) => ({ ...item, quantity: Number(event.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input
                    value={manual.unit}
                    onChange={(event) =>
                      setManual((item) => ({ ...item, unit: event.target.value }))
                    }
                    placeholder="serving"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <ManualMacro
                  label="Calories"
                  value={manual.kcal}
                  onChange={(kcal) => setManual((item) => ({ ...item, kcal }))}
                />
                <ManualMacro
                  label="Protein"
                  value={manual.protein_g}
                  onChange={(protein_g) => setManual((item) => ({ ...item, protein_g }))}
                />
                <ManualMacro
                  label="Carbs"
                  value={manual.carbs_g}
                  onChange={(carbs_g) => setManual((item) => ({ ...item, carbs_g }))}
                />
                <ManualMacro
                  label="Fat"
                  value={manual.fat_g}
                  onChange={(fat_g) => setManual((item) => ({ ...item, fat_g }))}
                />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!canAddManual}
              onClick={() => {
                onAdd([
                  {
                    ...manual,
                    id: crypto.randomUUID(),
                    loggedAt: new Date().toISOString(),
                    source: "manual",
                  },
                ]);
                closeAndReset(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add food
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground">{label}</label>
      <Input
        type="number"
        className="h-8 text-xs"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ManualMacro({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value || ""}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </div>
  );
}
