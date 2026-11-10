import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dishSchema, mealTargetsSchema, rankMeals } from "./meal-matching";
import { connectorRequest, retrieveMenu, estimateMenu } from "./local-restaurants.server";
import type { Json } from "@/integrations/supabase/types";

export type LocalRestaurant = { id: string; name: string; address: string; lat: number; lng: number; mapsUrl: string };
type GooglePlace = { id?: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude: number; longitude: number }; googleMapsUri?: string; websiteUri?: string };
const placeId = z.string().regex(/^[A-Za-z0-9_-]+$/).min(5).max(250);

export const findLocalRestaurants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ query: z.string().trim().min(2).max(200) }).parse)
  .handler(async ({ data }) => {
    try {
      const result = await connectorRequest("google_maps", "/places/v1/places:searchText", { method: "POST", headers: { "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri" }, body: JSON.stringify({ textQuery: data.query, includedType: "restaurant", pageSize: 12 }) });
      const restaurants: LocalRestaurant[] = (result.places ?? []).flatMap((p: GooglePlace) => p.id && p.location ? [{ id: p.id, name: p.displayName?.text ?? "Restaurant", address: p.formattedAddress ?? "", lat: p.location.latitude, lng: p.location.longitude, mapsUrl: p.googleMapsUri ?? "" }] : []);
      return { restaurants, error: null };
    } catch (e) { return { restaurants: [] as LocalRestaurant[], error: e instanceof Error ? e.message : "Restaurant search failed." }; }
  });

export const getLocalRestaurantMeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ placeId, targets: mealTargetsSchema }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    try {
      // A terminal provider denial pauses all estimation entry points durably.
      const blocked = await supabase.from("restaurant_menu_estimates").select("error_message").eq("user_id", userId).eq("status", "denied").limit(1).maybeSingle();
      if (blocked.error) throw new Error("Could not check nutrition estimation availability.");
      if (blocked.data) throw new Error(blocked.data.error_message ?? "Nutrition estimation access is denied. Restore service access before trying again.");
      const cached = await supabase.from("restaurant_menu_estimates").select("dishes,source_urls,updated_at").eq("user_id", userId).eq("place_id", data.placeId).maybeSingle();
      if (cached.error) throw new Error("Could not read the saved menu estimates.");
      const parsed = z.array(dishSchema).safeParse(cached.data?.dishes);
      if (cached.data && parsed.success && parsed.data.every((dish) => dish.evidence && dish.ingredients) && Date.now() - Date.parse(cached.data.updated_at) < 86400000) {
        return { dishes: parsed.data, best: rankMeals(parsed.data, data.targets), sourceUrls: z.array(z.string()).parse(cached.data.source_urls), estimatedAt: cached.data.updated_at, error: null };
      }
      const details = await connectorRequest("google_maps", `/places/v1/places/${encodeURIComponent(data.placeId)}`, { method: "GET", headers: { "X-Goog-FieldMask": "id,websiteUri" } }) as GooglePlace;
      if (!details.websiteUri) throw new Error("Google does not list a website for this restaurant, so its menu cannot be retrieved.");
      const menu = await retrieveMenu(details.websiteUri);
      const dishes = await estimateMenu(menu.text, getRequest(), menu.documents);
      if (!dishes.length) throw new Error("No individual meals could be identified on this website. No dishes or nutrition facts have been invented.");
      const estimatedAt = new Date().toISOString();
      const saved = await supabase.from("restaurant_menu_estimates").upsert({ user_id: userId, place_id: data.placeId, dishes: dishes as unknown as Json, source_urls: menu.sourceUrls, status: "ready", error_message: null, updated_at: estimatedAt });
      if (saved.error) throw new Error("The menu estimates could not be saved. Please try again later.");
      return { dishes, best: rankMeals(dishes, data.targets), sourceUrls: menu.sourceUrls, estimatedAt, error: null };
    } catch (e) {
      const error = e instanceof Error ? e.message : "Menu estimation failed.";
      const status = typeof e === "object" && e !== null && "statusCode" in e ? Number(e.statusCode) : null;
      if (status === 403 || /permission_error|provider.*denied|access.*denied/i.test(error)) {
        await supabase.from("restaurant_menu_estimates").upsert({ user_id: userId, place_id: data.placeId, dishes: [], source_urls: [], status: "denied", error_message: error, updated_at: new Date().toISOString() });
      }
      return { dishes: [], best: [], sourceUrls: [] as string[], estimatedAt: null, error };
    }
  });