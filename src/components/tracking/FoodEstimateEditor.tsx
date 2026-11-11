import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NutritionEvidence } from "@/components/NutritionEvidence";
import { MEAL_LABELS, type FoodLogItem, type MealType } from "@/lib/tracking";
import { manualFoodEvidence, replaceLoggedIngredients, resizeLoggedFood, scalePortion } from "@/lib/food-log-editing";
import { type MealIngredient } from "@/lib/meal-ingredients";
import { Plus, Trash2 } from "lucide-react";

const macros = [["kcal", "Calories"], ["protein_g", "Protein (g)"], ["carbs_g", "Carbs (g)"], ["fat_g", "Fat (g)"]] as const;
export function FoodEstimateEditor({ item, meal, onClose, onSave }: { item: FoodLogItem; meal: MealType; onClose: () => void; onSave: (item: FoodLogItem, meal: MealType) => void }) {
  const [draft, setDraft] = useState(item);
  const [destination, setDestination] = useState(meal);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const valid = draft.name.trim() && Number(quantity) > 0 && Number.isFinite(Number(quantity)) && (draft.ingredients ?? []).every(i => i.name.trim() && i.quantity > 0 && i.unit.trim()) && macros.every(([key]) => Number.isFinite(draft[key]) && draft[key] >= 0);
  const editIngredient = (index: number, update: (i: MealIngredient) => MealIngredient) => setDraft(prev => replaceLoggedIngredients(prev, (prev.ingredients ?? []).map((i, n) => n === index ? update(i) : i)));
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-2xl" aria-describedby={undefined}>
      <DialogHeader><DialogTitle>Edit logged food</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label htmlFor="edit-food-name">Food name</Label><Input id="edit-food-name" value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="edit-food-quantity">Serving quantity</Label><Input id="edit-food-quantity" type="number" value={quantity} onChange={e => { setQuantity(e.target.value); setDraft(p => resizeLoggedFood(p, Number(e.target.value))); }} /></div>
          <div><Label htmlFor="edit-food-unit">Serving unit</Label><Input id="edit-food-unit" value={draft.unit} onChange={e => setDraft(p => ({ ...p, unit: e.target.value }))} /></div>
        </div>
        <div><Label>Meal</Label><Select value={destination} onValueChange={v => { const found = (Object.keys(MEAL_LABELS) as MealType[]).find(m => m === v); if (found) setDestination(found); }}><SelectTrigger aria-label="Move to meal"><SelectValue /></SelectTrigger><SelectContent>{(Object.entries(MEAL_LABELS) as [MealType, string][]).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{macros.map(([key, label]) => <div key={key}><Label htmlFor={`food-${key}`}>{label}</Label><Input id={`food-${key}`} type="number" value={draft[key]} onChange={e => setDraft(p => ({ ...p, [key]: Number(e.target.value), ingredients: undefined, evidence: manualFoodEvidence(), confidence: "low" }))} /></div>)}</div>
        <section aria-label="Overall food evidence"><h3 className="font-semibold">Overall food confidence & sources</h3><NutritionEvidence evidence={draft.evidence} /></section>
        <h3 className="border-t pt-4 font-semibold">Ingredients</h3>
        {draft.ingredients?.map((ingredient, index) => <div key={index} className="space-y-2 border-b pb-4" data-testid="ingredient-editor">
          <div className="flex gap-2"><Input aria-label={`Ingredient ${index + 1} name`} value={ingredient.name} onChange={e => editIngredient(index, i => ({ ...i, name: e.target.value, evidence: manualFoodEvidence(), confidence: "low" }))} /><Button size="icon" variant="ghost" aria-label={`Remove ingredient ${index + 1}`} title="Remove ingredient" onClick={() => setDraft(p => replaceLoggedIngredients(p, (p.ingredients ?? []).filter((_, n) => n !== index)))}><Trash2 className="h-4 w-4" /></Button></div>
          <div className="grid grid-cols-2 gap-2"><div><Label>Quantity</Label><Input aria-label={`Ingredient ${index + 1} quantity`} type="number" value={ingredient.quantity} onChange={e => editIngredient(index, i => ({ ...scalePortion(i, Number(e.target.value)), portionConfirmed: true }))} /></div><div><Label>Unit</Label><Input aria-label={`Ingredient ${index + 1} unit`} value={ingredient.unit} onChange={e => editIngredient(index, i => ({ ...i, unit: e.target.value, evidence: manualFoodEvidence(), confidence: "low" }))} /></div></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{macros.map(([key, label]) => <div key={key}><Label>{label}</Label><Input aria-label={`Ingredient ${index + 1} ${label}`} type="number" value={ingredient[key]} onChange={e => editIngredient(index, i => ({ ...i, [key]: Math.max(0, Number(e.target.value)), evidence: manualFoodEvidence(), confidence: "low" }))} /></div>)}</div>
          <NutritionEvidence evidence={ingredient.evidence} />
        </div>)}
        <Button size="sm" variant="outline" onClick={() => setDraft(p => replaceLoggedIngredients(p, [...(p.ingredients ?? []), { name: "", quantity: 1, unit: "g", kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, confidence: "low", evidence: manualFoodEvidence(), portionConfirmed: true, portionAssumption: "Manually entered ingredient." }]))}><Plus className="mr-1 h-4 w-4" />Add ingredient</Button>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!valid} onClick={() => onSave(draft, destination)}>Save changes</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}