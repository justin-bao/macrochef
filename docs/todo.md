# TODO

## Infer macros from a photo

Tentative plan:

- Add a meal photo upload action to the food logging flow.
- Send the image to a vision-capable model with a structured output schema for food items, estimated portions, calories, protein, carbs, fat, and confidence.
- Show a review screen before logging anything, with editable item names, portions, and macros.
- Store low-confidence estimates with a visible confidence label so users know when the result is approximate.
- Add a follow-up path for the model to ask one clarifying question when the photo is ambiguous.

## Log food from OCR on a nutrition facts label

Tentative plan:

- Add a nutrition-label scan action near manual food entry.
- Use OCR or a vision model to extract serving size, servings per container, calories, protein, carbs, fat, and key optional fields like fiber and sugar.
- Normalize units and support per-serving versus full-package logging.
- Present a confirmation form with the parsed nutrition facts and quantity before adding to the diary.
- Save frequently scanned packaged foods locally or in a user-owned table for faster repeat logging.

## Add goals in My Profile

Tentative plan:

- Add a goal selector to Profile with options such as lose body fat, build muscle, maintain weight, fuel runs, and improve general nutrition.
- Store the selected goal on the user profile, separate from macro targets.
- Use the goal to suggest default macro and calorie targets, while still allowing manual edits.
- Adjust dashboard copy and remaining-calorie guidance based on the selected goal.
- Later, use goal history to track whether recommendations are changing over time.

## Adjust calories burned from activities

Tentative plan:

- Keep automatic estimates based on profile, workout type, distance, duration, and imported provider data.
- Add a manual override field on logged activities for cases where the user trusts a device or wants to correct the estimate.
- Store the original estimate, override value, estimate method, and source so the app can explain where the number came from.
- For imported Strava activities, prefer provider calories when available and fall back to MacroChef estimates.
- Add a small adjustment UI in the activity detail row or edit dialog without cluttering quick logging.
