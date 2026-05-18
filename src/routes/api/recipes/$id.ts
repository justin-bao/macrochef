import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getRecipe } from "@/lib/recipes.functions";

export const APIRoute = createAPIFileRoute("/api/recipes/$id")({
  GET: async ({ params, request }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id) || id <= 0) {
      return Response.json({ recipe: null, error: "Invalid recipe id" }, { status: 400 });
    }

    const url = new URL(request.url);
    const rawSource = url.searchParams.get("source") ?? "spoonacular";
    const source = rawSource === "kaggle" ? "kaggle" : "spoonacular";

    try {
      const result = await getRecipe({ data: { id, source } });
      return Response.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load recipe";
      return Response.json({ recipe: null, error: message }, { status: 500 });
    }
  },
});
