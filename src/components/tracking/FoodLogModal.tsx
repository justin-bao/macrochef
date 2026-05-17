import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FoodLogItem } from "@/lib/tracking";
import {
  decomposeTextToIngredients,
  estimateFoodFromImage,
  estimateFoodNutrition,
} from "@/lib/food-nutrition.functions";
import { Camera, FileScan, PenLine, Plus, Sparkles } from "lucide-react";

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
      return {
        id: crypto.randomUUID(),
        name,
        quantity,
        unit,
        kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        source: "usda" as const,
        confidence: "medium" as const,
        note: "Looking up USDA nutrition...",
        loggedAt: new Date().toISOString(),
      };
    });
}

function readImageDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
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
  const [quickStatus, setQuickStatus] = useState<string | null>(null);
  const [estimatingManual, setEstimatingManual] = useState(false);
  const [estimatingImage, setEstimatingImage] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const canAddManual = manual.name.trim().length > 0 && manual.kcal > 0;
  const totalParsed = useMemo(() => parsed.reduce((sum, item) => sum + item.kcal, 0), [parsed]);

  const applyUsdaEstimate = async (item: FoodLogItem): Promise<FoodLogItem> => {
    try {
      const result = await estimateFoodNutrition({
        data: { name: item.name, quantity: item.quantity, unit: item.unit },
      });
      if (!result.estimate) {
        return {
          ...item,
          source: "manual",
          confidence: "low",
          note: result.error ?? "No USDA match found. Enter macros manually.",
        };
      }
      const estimate = result.estimate;
      return {
        ...item,
        name: item.name || estimate.name,
        kcal: estimate.kcal,
        protein_g: estimate.protein_g,
        carbs_g: estimate.carbs_g,
        fat_g: estimate.fat_g,
        source: "usda",
        confidence: estimate.confidence,
        note: `${estimate.sourceLabel} matched "${estimate.matchedName}". ${estimate.servingBasis}. These macros are ready to use, and you can adjust them if needed.`,
      };
    } catch (error) {
      return {
        ...item,
        source: "manual",
        confidence: "low",
        note: error instanceof Error ? error.message : "USDA lookup failed. Enter macros manually.",
      };
    }
  };

  const estimateQuickItems = async () => {
    if (!description.trim()) return;
    setEstimateError(null);
    setQuickStatus("Identifying ingredients…");

    let baseItems: Array<{ name: string; quantity: number; unit: string }>;
    try {
      const { items: aiItems } = await decomposeTextToIngredients({ data: { description } });
      baseItems = aiItems.length ? aiItems : parseFoodDescription(description);
    } catch {
      baseItems = parseFoodDescription(description);
    }

    if (!baseItems.length) {
      setQuickStatus(null);
      return;
    }

    const stub: FoodLogItem[] = baseItems.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      source: "usda" as const,
      confidence: "medium" as const,
      note: "Looking up USDA nutrition…",
      loggedAt: new Date().toISOString(),
    }));

    setParsed(stub);
    setQuickStatus("Looking up USDA matches…");
    const nextItems = await Promise.all(stub.map(applyUsdaEstimate));
    setParsed(nextItems);
    setQuickStatus(null);
    if (nextItems.some((item) => item.kcal <= 0)) {
      setEstimateError("Some items need manual macros because USDA did not return a close match.");
    }
  };

  const estimateManualItem = async () => {
    if (!manual.name.trim()) return;
    setEstimateError(null);
    setEstimatingManual(true);
    const estimated = await applyUsdaEstimate(manual);
    setManual(estimated);
    setEstimatingManual(false);
    if (estimated.kcal <= 0) {
      setEstimateError("USDA did not return a close match. Enter the macros manually.");
    }
  };

  const estimateImageItems = async (
    file: File | undefined,
    mode: "meal_photo" | "nutrition_label",
  ) => {
    if (!file) return;
    setEstimateError(null);
    setEstimatingImage(true);
    setParsed([]);

    try {
      const imageDataUrl = await readImageDataUrl(file);
      const result = await estimateFoodFromImage({ data: { imageDataUrl, mode } });
      if (!result.items.length) {
        setEstimateError(result.error ?? "No food estimate found.");
        return;
      }

      setParsed(
        result.items.map((item) => ({
          id: crypto.randomUUID(),
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          kcal: item.kcal,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          source: "ai",
          confidence: item.confidence,
          note:
            item.note ??
            (mode === "nutrition_label"
              ? "Read from nutrition facts label. Review serving size before logging."
              : "Estimated from photo. Review portions before logging."),
          loggedAt: new Date().toISOString(),
        })),
      );
    } catch (error) {
      setEstimateError(error instanceof Error ? error.message : "Image estimate failed.");
    } finally {
      setEstimatingImage(false);
    }
  };

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
      setEstimateError(null);
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="quick" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Text
            </TabsTrigger>
            <TabsTrigger value="photo" className="gap-2">
              <Camera className="h-4 w-4" />
              Photo
            </TabsTrigger>
            <TabsTrigger value="label" className="gap-2">
              <FileScan className="h-4 w-4" />
              Label
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
                  disabled={!description.trim() || quickStatus !== null}
                  onClick={estimateQuickItems}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {quickStatus ?? "Estimate macros"}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  USDA filled in the closest match it found. The macros are ready to use as-is, and
                  you can adjust any field before adding.
                </p>
                {estimateError && <p className="text-sm text-destructive">{estimateError}</p>}
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
                    disabled={quickStatus !== null}
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

          <TabsContent value="photo" className="mt-4 space-y-4">
            {parsed.length === 0 ? (
              <>
                <div className="rounded-lg border border-dashed p-4">
                  <Label>Meal photo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className="mt-2"
                    disabled={estimatingImage}
                    onChange={(event) => estimateImageItems(event.target.files?.[0], "meal_photo")}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Upload a meal photo and MacroChef will draft editable macro estimates.
                  </p>
                </div>
                {estimatingImage && (
                  <p className="text-sm text-muted-foreground">Estimating macros from photo...</p>
                )}
                {estimateError && <p className="text-sm text-destructive">{estimateError}</p>}
              </>
            ) : (
              <ParsedReview
                items={parsed}
                total={totalParsed}
                estimateError={estimateError}
                updateParsed={updateParsed}
                onBack={() => setParsed([])}
                onAdd={() => {
                  onAdd(parsed);
                  closeAndReset(false);
                }}
                disabled={estimatingImage}
              />
            )}
          </TabsContent>

          <TabsContent value="label" className="mt-4 space-y-4">
            {parsed.length === 0 ? (
              <>
                <div className="rounded-lg border border-dashed p-4">
                  <Label>Nutrition facts label</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className="mt-2"
                    disabled={estimatingImage}
                    onChange={(event) =>
                      estimateImageItems(event.target.files?.[0], "nutrition_label")
                    }
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Upload a label photo to extract serving size and per-serving macros.
                  </p>
                </div>
                {estimatingImage && (
                  <p className="text-sm text-muted-foreground">Reading nutrition label...</p>
                )}
                {estimateError && <p className="text-sm text-destructive">{estimateError}</p>}
              </>
            ) : (
              <ParsedReview
                items={parsed}
                total={totalParsed}
                estimateError={estimateError}
                updateParsed={updateParsed}
                onBack={() => setParsed([])}
                onAdd={() => {
                  onAdd(parsed);
                  closeAndReset(false);
                }}
                disabled={estimatingImage}
              />
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
              <Button
                type="button"
                variant="secondary"
                disabled={!manual.name.trim() || estimatingManual}
                onClick={estimateManualItem}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {estimatingManual ? "Looking up USDA match..." : "Fill macros from USDA"}
              </Button>
              {(manual.note || estimateError) && (
                <p
                  className={
                    estimateError ? "text-sm text-destructive" : "text-sm text-muted-foreground"
                  }
                >
                  {estimateError ?? manual.note}
                </p>
              )}
              {manual.kcal > 0 && (
                <p className="text-sm text-muted-foreground">
                  These macros are ready to use as-is, and you can adjust any field before adding.
                </p>
              )}
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

function ParsedReview({
  items,
  total,
  estimateError,
  updateParsed,
  onBack,
  onAdd,
  disabled,
}: {
  items: FoodLogItem[];
  total: number;
  estimateError: string | null;
  updateParsed: (id: string, field: keyof FoodLogItem, value: string) => void;
  onBack: () => void;
  onAdd: () => void;
  disabled: boolean;
}) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Review the drafted macros before adding them to your diary.
      </p>
      {estimateError && <p className="text-sm text-destructive">{estimateError}</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_88px_100px]">
              <Input
                value={item.name}
                onChange={(event) => updateParsed(item.id, "name", event.target.value)}
              />
              <Input
                type="number"
                value={item.quantity}
                onChange={(event) => updateParsed(item.id, "quantity", event.target.value)}
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
            {item.note && <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" disabled={disabled} onClick={onAdd}>
          Add {items.length} item{items.length === 1 ? "" : "s"} · {total} kcal
        </Button>
      </div>
    </>
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
