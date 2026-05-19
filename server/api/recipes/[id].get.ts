import { defineEventHandler, getRouterParam, getQuery, createError } from "h3";
import { getRecipe } from "@/lib/recipes.functions";

export default defineEventHandler(async (event) => {
  const rawId = getRouterParam(event, "id");
  const id = parseInt(rawId ?? "", 10);
  if (isNaN(id) || id <= 0) {
    throw createError({ statusCode: 400, message: "Invalid recipe id" });
  }

  const { source: rawSource = "spoonacular" } = getQuery(event) as { source?: string };
  const source = rawSource === "kaggle" ? "kaggle" : "spoonacular";

  try {
    const result = await getRecipe({ data: { id, source } });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load recipe";
    throw createError({ statusCode: 500, message });
  }
});
