# Logging pathway tests
- [x] Save AI_API_KEY through the encrypted secret form; use a request-time server-only helper, authenticated status/estimate calls, HTTPS configuration validation, secret-free setup responses and logs, and visible setup/error/validated states. All 69 tests pass.
- [ ] Verify live AI meal logging — refreshed the signed-in preview again and the authenticated setup check still returns missing_key. Encrypted key is saved, but secret propagation to the preview runtime remains blocked; no AI request or persistence claim was made.
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
- [ ] Verify live AI text/photo for dish-name or photo decomposition — key is securely saved but not yet visible to the preview runtime. Explicit ingredient lists use USDA and are verified.

# Restaurant map search
- [x] Add authenticated Google restaurant search and interactive map.
- [x] Retrieve restaurant website menus and estimate single-dish macros.
- [x] Rank three meals using only supplied per-meal targets; eight tests pass.
- [x] Verify signed-out desktop/mobile UI, actual AI output, and apply package security update.
- [ ] Verify signed-in discovery and Maps on authorized deployed origin — blocked by no auth users and sandbox Maps restriction.
- [ ] Verify live restaurant menu retrieval — provider timed out during the check.