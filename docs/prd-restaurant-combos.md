# PRD — Restaurant Macro Combos

## Problem

People who track macros eat out too. Restaurant nutrition pages list items individually, but assembling an order that hits a target — say 700 kcal and 50g protein at a specific chain — is a spreadsheet exercise most users won't do at the counter.

## Goal

Let the user pick a chain, set macro targets, and get back combinations of menu items that fit those targets.

## User flows

**1. Browse by chain + macros**
- User selects a chain from a curated list and enters macro targets.
- Returns ranked combinations of 1–N menu items whose summed macros best fit the target.
- Each combo shows the items, the summed macros, and the delta vs target.

## Requirements

- Curated, finite chain list — only chains where Spoonacular's menu coverage is reasonably complete.
- Combos are ranked by macro fit (same distance metric as recipe search where applicable).
- Show clearly when no combo fits the target within an acceptable tolerance.
- Combo size capped (e.g. ≤3 items) to keep results legible and search space tractable.

## Non-goals

- Live menu / pricing integration.
- Location-aware availability (some menu items are regional).
- Ordering, delivery, or cart hand-off.
- Calorie-only goal mode (we always optimize against the full macro set the user provided).

## Success signals

- For common targets (e.g. 600 kcal / 40g protein) at a covered chain, the top combo's summed macros land within 10% of target on every axis the user specified.
- Users can tell at a glance which item is doing the macro work in each combo.

## Technical notes

- Server functions live in `src/lib/restaurants.functions.ts`.
- Menu data is sourced via Spoonacular menu/item endpoints.
- Combo generation is bounded by chain × max-items to keep server time predictable; ranking reuses the macro-distance helpers from `src/lib/macros.ts`.
