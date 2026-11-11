import { ExternalLink, ShieldCheck, Shield, CircleHelp, TriangleAlert, ShieldAlert } from "lucide-react";
import { confidenceLevel, type NutritionEvidence as Evidence } from "@/lib/nutrition-evidence";

const levels = {
  "very-high": { label: "Very high", icon: ShieldCheck, color: "text-confidence-very-high" },
  high: { label: "High", icon: Shield, color: "text-confidence-high" },
  moderate: { label: "Moderate", icon: CircleHelp, color: "text-confidence-moderate" },
  low: { label: "Low", icon: TriangleAlert, color: "text-confidence-low" },
  "very-low": { label: "Very low", icon: ShieldAlert, color: "text-confidence-very-low" },
};

export function NutritionEvidence({ evidence }: { evidence?: Evidence }) {
  if (!evidence) return <p className="mt-2 text-xs text-muted-foreground">Confidence unavailable · Nutrition sources not recorded.</p>;
  const level = levels[confidenceLevel(evidence.score)];
  const Icon = level.icon;
  return <div className="mt-3 space-y-2 border-t pt-3 text-xs">
    <div className={`flex flex-wrap items-center gap-2 ${level.color}`}><span className="h-2 w-2 shrink-0 rounded-full bg-current" aria-hidden="true" /><Icon className="h-4 w-4 shrink-0" /><span className="font-medium">{level.label} confidence</span></div>
    <details><summary className="cursor-pointer font-medium">Nutrition sources & uncertainty</summary>
      <div className="mt-2 space-y-2 text-muted-foreground"><p>{evidence.reason}</p>
        <ul className="space-y-2">{evidence.sources.map((source) => <li key={source.id}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-start gap-1 text-primary underline"><span className="break-words">{source.label}</span><ExternalLink className="mt-0.5 h-3 w-3 shrink-0" /></a> : source.label}{source.kind === "menu" && <span className="block">Menu description only · not published nutrition</span>}</li>)}</ul>
        {evidence.uncertainties.length > 0 && <ul className="list-disc space-y-1 pl-4">{evidence.uncertainties.map((u) => <li key={u}>{u}</li>)}</ul>}
      </div>
    </details>
  </div>;
}