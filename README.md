# MacroChef

MacroChef is a TanStack Start app for finding recipes and restaurant meals that match calorie and macronutrient targets. It uses Spoonacular for recipe and ingredient nutrition data, FatSecret for live restaurant menu nutrition, USDA FoodData Central for food log estimates, Supabase for auth and saved user data, and an optional OpenAI-compatible backend for recipe substitution suggestions.

## Features

- Search recipes by dish, cuisine, or macro targets
- Rank recipes by fit against calories, protein, carbs, and fat
- Optionally include substitution-aware recipe matches
- View recipe details with ingredients, instructions, nutrition, and source links
- Scale recipe ingredients to a calorie target
- Generate AI-assisted ingredient swaps and apply them to recompute macros
- Build fast-food and restaurant item combinations against macro targets
- Sign in with email/password or Google
- Save tuned recipes and default macro goals per user

## Tech Stack

- React 19
- TanStack Router and TanStack Start
- Vite
- Tailwind CSS 4
- shadcn/ui and Radix UI primitives
- Supabase Auth and Postgres
- Spoonacular API
- FatSecret Platform API
- USDA FoodData Central API
- Optional OpenAI-compatible AI provider
- Cloudflare Workers deployment config via Wrangler

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

If `.env.example` does not exist yet, create `.env` with the variables below:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SPOONACULAR_API_KEY=...
FATSECRET_CLIENT_ID=...
FATSECRET_CLIENT_SECRET=...
FOODDATA_CENTRAL_API_KEY=...
AI_API_KEY=...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
```

The `VITE_` Supabase values are used in the browser. The unprefixed Supabase values are used during SSR/server execution. In many local setups they can point to the same Supabase project.

Start the dev server:

```bash
npm run dev
```

Then open the local URL printed by Vite.

## Available Scripts

```bash
npm run dev        # Start the Vite development server
npm run build      # Build for production
npm run build:dev  # Build in development mode
npm run preview    # Preview the production build
npm run lint       # Run ESLint
npm run format     # Format the repo with Prettier
```

## Supabase Setup

The database schema lives in:

```text
supabase/migrations/20260427215358_221b0d43-ab78-4f1d-8b70-b2ab8acd9eff.sql
```

It creates:

- `macro_goals`: one default macro target row per user
- `user_profiles`: height, weight, age, sex, and unit defaults used for activity burn estimates
- `activity_connections`: user-owned Strava connection metadata and server-side tokens
- `saved_recipes`: saved tuned recipes, applied swaps, scaled ingredients, and computed macros

User-owned tables have row-level security enabled so users can only access their own data.

For Google sign-in, configure Google OAuth in Supabase and make sure the redirect URL matches the app origin you run or deploy.

## External Services

### Spoonacular

`SPOONACULAR_API_KEY` is required for:

- Recipe search
- Recipe detail and nutrition lookup
- Ingredient nutrition lookup for swap verification

### FatSecret

`FATSECRET_CLIENT_ID` and `FATSECRET_CLIENT_SECRET` are required for restaurant/menu item search.
FatSecret OAuth 2 token requests must come from an outbound IP allowed on the app/key in the FatSecret developer portal. For local development, add your current public IP as a `/32` allow-list entry if token requests return `invalid_client`.

### USDA FoodData Central

`FOODDATA_CENTRAL_API_KEY` is used for food log nutrition estimates. If omitted, the server falls back to USDA's `DEMO_KEY`, which is useful for smoke tests but has much lower limits.

### Strava

Set `VITE_STRAVA_CLIENT_ID`, `STRAVA_CLIENT_ID`, and `STRAVA_CLIENT_SECRET` to enable the Profile page Strava connection. Configure the Strava app callback URL as:

```text
http://localhost:3001/integrations/strava/callback
```

Use the matching deployed origin in production.

### Optional AI Provider

`AI_API_KEY` is required for AI substitution suggestions on recipe detail pages. Search-time substitutions can still use local heuristics, but the "Suggest substitutions" action calls an OpenAI-compatible chat completions endpoint. Set `AI_BASE_URL` and `AI_MODEL` to use a different provider or your own backend.

### Supabase

Supabase is required for:

- Email/password auth
- Google OAuth sign-in
- Saved recipes
- Default macro goals

## Project Structure

```text
src/routes/                  File-based TanStack routes
src/routes/index.tsx         Home page and initial macro search form
src/routes/search.tsx        Recipe and restaurant search views
src/routes/recipe.$id.tsx    Recipe detail, scaling, swaps, and saving
src/routes/auth.tsx          Sign-in and sign-up UI
src/routes/profile.tsx       User profile and macro goals
src/routes/goals.tsx         Backward-compatible redirect to profile
src/routes/saved.tsx         Saved tuned recipes
src/lib/recipes.functions.ts Server functions for Spoonacular recipes and AI swaps
src/lib/restaurants.functions.ts Server functions for restaurant menu combos
src/lib/macros.ts            Macro math, scaling, and swap application
src/lib/swap-heuristics.ts   Search-time substitution heuristics
src/integrations/supabase/   Supabase clients, generated types, and middleware
src/components/              App components and shadcn/ui primitives
supabase/migrations/         Database migrations
```

## Deployment

The project includes a Wrangler config for Cloudflare Workers:

```text
wrangler.jsonc
```

The app entry is configured as `@tanstack/react-start/server-entry`, with `nodejs_compat` enabled. Set the same production environment variables in your deployment target before deploying.

## Notes

- Nutrition data comes from third-party APIs and should be treated as approximate.
- AI substitution suggestions are repriced against Spoonacular ingredient data when possible, but not every swap can be verified.
- Restaurant support is intentionally limited to a curated list of chains with stronger FatSecret menu coverage.
