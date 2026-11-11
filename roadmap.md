# USDA lookup and evidence presentation
- [x] Diagnose manual USDA failure as live HTTP 429 from shared DEMO_KEY access; preserve actual lookup errors in the form rather than overwriting them as no match, handle connection failures, and avoid provider-body logging.
- [x] Move Add ingredient below constituents and overall food evidence above Ingredients; replace displayed numeric scores with five colored/icon confidence levels. Desktop and phone verified; 90 tests pass.
- [ ] Restore live USDA lookup success — requires shared demo quota recovery or a personal USDA key; no USDA key is configured.

# Food search and logged estimates
- [x] Add AI / database-only hybrid selection for single foods with explicit USDA/Open Food Facts record picking and gram portions; mocked handler verifies both sources without AI calls.
- [x] Add logged-food editing for proportional servings, constituent names/amounts/macros, ingredient addition/removal, and atomic moves between meals. Live signed-in AI ingredient edits/removal and moving to Lunch survive reload; desktop and phone checked.
- [ ] Verify live hybrid result selection — live search returned no complete records in preview; public packaged-food endpoint returned HTTP 503. Empty/error state verified; provider availability blocks result-selection verification.
- [x] Seven new regression tests; 79 tests pass and automatic build passes.

# Logging pathway tests
- [x] Save AI_API_KEY through the encrypted secret form; use a request-time server-only helper, authenticated status/estimate calls, HTTPS configuration validation, secret-free setup responses and logs, and visible setup/error/validated states. All 69 tests pass.
- [x] Diagnose preview key access: Wrangler loaded only .env, excluding the supervisor's securely supplied environment. Add preview-only, allowlisted secret-name declarations (no values or browser defines); 34 focused tests and automatic build pass. Verify signed-in live AI rice bowl logging: 390 kcal, three ingredients and evidence retained unchanged and visible after reload in browser-local diary storage.
- [x] Add 29 handler regression tests covering AI text/photo/label estimates, USDA/Open Food Facts follow-ups, ingredient totals, evidence, invalid output, HTTP failures, and diary serialization; all 67 project tests pass.
- [x] Exercise signed-in text logging through real USDA fallback (312 kcal, two nested ingredients, evidence retained after reload) and manual logging (220 kcal, 20g protein, 25g carbs, 5g fat retained and visible after reload).
- [ ] Resolve existing Dashboard hydration mismatch — signed-in logging works, but reload emits a server/client mismatch in locally stored diary/settings. Kept outside this tests-only change.

# Numeric entry
- [x] Replace numeric steppers with plain entry; five regression tests pass, desktop/phone typing and replacement preserve signed decimals and pasted precision, and automatic build passes.

# Sign-in repair
- [x] Add public defaults and resolve final client/SSR settings for isolated preview builds; ten regression tests pass, actual app config resolves without local settings, and sign-in reaches the account service without runtime errors.
- [x] Defer validation until managed preview injection; seven regression tests and actual Vite config resolution pass, and automatic build reports build OK.
- [x] Restore explicit public sign-in configuration; four missing/private-key safeguards pass, automatic build passes, and browser login reaches the account service without runtime errors.
- [x] Replace legacy Google sign-in with managed login; confirm Google and email providers are enabled and return addresses are allowed.
- [ ] Verify successful account sign-in and Google consent — no auth users exist to mint a test session; requires the user's signup and Google consent.

# Saved per-meal goals
- [x] Save optional breakfast, lunch, dinner, and snack targets on Profile.
- [x] Add a meal picker to all search modes, preserving manual overrides and blank targets.
- [x] Test goal rules: 13 tests pass; verify desktop search pickers and phone layout with no overflow.
- [ ] Verify signed-in save/reload and saved-goal prefilling — no auth users exist, so a preview session cannot be minted; requires signing up/signing in.

# Estimate accuracy
- [x] Break complex estimates into nested ingredients with separate portions, macro contributions, confidence, and sources; 18 tests pass. Verified real three-ingredient USDA lookup, logging/reload, phone layout, and live menu AI decomposition.
- [x] Add evidence-based confidence scores and source details to food logging and nearby meal estimates.
- [x] Test source validation and complex-dish uncertainty; 13 tests pass. Verify real USDA lookup, logging, and evidence persistence after reload.
- [x] Verify live AI text decomposition — signed-in real AI rice bowl estimate produces three ingredients, evidence and 390 kcal; logged item persists after reload.
- [ ] Verify live AI photo decomposition — not exercised in the text logging check.

# Restaurant map search
- [x] Add authenticated Google restaurant search and interactive map.
- [x] Retrieve restaurant website menus and estimate single-dish macros.
- [x] Rank three meals using only supplied per-meal targets; eight tests pass.
- [x] Verify signed-out desktop/mobile UI, actual AI output, and apply package security update.
- [ ] Verify signed-in discovery and Maps on authorized deployed origin — blocked by no auth users and sandbox Maps restriction.
- [ ] Verify live restaurant menu retrieval — provider timed out during the check.