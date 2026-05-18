import { createAPIFileRoute } from "@tanstack/react-start/api";
import { z } from "zod";
import { searchRecipes } from "@/lib/recipes.functions";

const InputSchema = z.object({
  query: z.string().trim().max(120).optional().default(""),
  diet: z.string().optional(),
  cuisine: z.string().optional(),
  maxReadyTime: z.number().int().positive().max(360).optional(),
  number: z.number().int().min(1).max(24).optional().default(12),
  kcal: z.number().positive().nullable().optional(),
  protein_g: z.number().positive().nullable().optional(),
  carbs_g: z.number().positive().nullable().optional(),
  fat_g: z.number().positive().nullable().optional(),
  allowSubs: z.boolean().optional().default(true),
});

export const APIRoute = createAPIFileRoute("/api/recipes/search")({
  POST: async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ results: [], error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ results: [], error: parsed.error.message }, { status: 400 });
    }

    try {
      const result = await searchRecipes({ data: parsed.data });
      return Response.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Recipe search failed";
      return Response.json({ results: [], error: message }, { status: 500 });
    }
  },
});
