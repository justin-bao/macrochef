import { defineEventHandler, readBody, createError } from "h3";
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

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message });
  }

  try {
    const result = await searchRecipes({ data: parsed.data });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recipe search failed";
    throw createError({ statusCode: 500, message });
  }
});
