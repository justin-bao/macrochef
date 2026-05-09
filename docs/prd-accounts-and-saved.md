# PRD — Accounts, Goals, and Saved Recipes

## Problem

Macro tuning is only useful if it compounds. A user who re-enters their targets every visit, or loses a tuned recipe they liked, will churn. The product needs a lightweight account layer so goals pre-fill and tuned recipes persist.

## Goal

Provide a minimal account system that:

1. Stores the user's default macro goals so every search pre-fills them.
2. Persists tuned recipes (with applied swaps and scaled amounts) for later use.
3. Stays out of the way for anonymous users — search and tune work without an account.

## User flows

**1. Sign in / sign up**
- Email + password, or Google OAuth.
- Email signups require confirmation (no auto-confirm).
- Anonymous browsing remains fully functional; auth is required only to save and to set defaults.

**2. Set default macro goals**
- `/goals` page lets a signed-in user set kcal / protein / carbs / fat defaults.
- Defaults pre-fill the home page macro inputs on subsequent visits.

**3. Save a tuned recipe**
- From the recipe detail page, signed-in users save the current state (chosen swaps, scaled amounts, target macros).
- Saved items list at `/saved`, each linking back to the recipe with the saved tune re-applied.

## Requirements

- Roles, if introduced later, MUST live in a separate table — never on profiles.
- All user data tables (`macro_goals`, `saved_recipes`) have RLS enabled with owner-only read/write policies.
- No anonymous sign-ins.
- Google OAuth is enabled by default alongside email/password.
- Saved recipes store enough state to fully reconstruct the tuned view without re-asking the AI.

## Non-goals

- Profile pages, avatars, social features.
- Sharing saved recipes with other users.
- Multi-device sync beyond what Supabase Auth provides natively.
- Roles / admin UI (out of scope until needed).

## Success signals

- Returning signed-in users see their macro defaults pre-filled on the home page.
- A saved tuned recipe re-opens with identical macros to when it was saved.
- No row of any user table is ever readable by another user (verified by RLS policy review).

## Technical notes

- Tables: `macro_goals` (one row per user), `saved_recipes` (one row per saved tune; `custom_ingredients`, `applied_swaps`, `target_macros` stored as JSONB).
- Auth client and middleware live in `src/integrations/supabase/`.
- Auth UI: `src/routes/auth.tsx`. Goals: `src/routes/goals.tsx`. Saved: `src/routes/saved.tsx`.
- No foreign keys to `auth.users`; user references use `user_id uuid` and rely on RLS via `auth.uid()`.
