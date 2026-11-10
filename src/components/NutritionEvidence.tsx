import { ExternalLink, ShieldCheck } from "lucide-react";
import { confidenceLabel, type NutritionEvidence as Evidence } from "@/lib/nutrition-evidence";

export function NutritionEvidence({ evidence }: { evidence?: Evidence }) {
  if (!evidence) return <p className="mt-2 text-xs text-muted-foreground">Confidence not scored · Nutrition sources not recorded for this estimate.</p>;
  return <div className="mt-3 space-y-2 border-t pt-3 text-xs">
    <div className="flex flex-wrap items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" /><span className="font-medium capitalize">{confidenceLabel(evidence.score)} confidence · {evidence.score}/100</span></div>
    <p className="text-muted-foreground">Evidence score, not a probability of accuracy.</p>
    <details><summary className="cursor-pointer font-medium">Nutrition sources & uncertainty</summary>
      <div className="mt-2 space-y-2 text-muted-foreground"><p>{evidence.reason}</p>
        <ul className="space-y-2">{evidence.sources.map((source) => <li key={source.id}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-start gap-1 text-primary underline"><span className="break-words">{source.label}</span><ExternalLink className="mt-0.5 h-3 w-3 shrink-0" /></a> : source.label}{source.kind === "menu" && <span className="block">Menu description only · not published nutrition</span>}</li>)}</ul>
        {evidence.uncertainties.length > 0 && <ul className="list-disc space-y-1 pl-4">{evidence.uncertainties.map((u) => <li key={u}>{u}</li>)}</ul>}
      </div>
    </details>
  </div>;
}