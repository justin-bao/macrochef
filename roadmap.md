# Saved per-meal goals
- [ ] Save optional breakfast, lunch, dinner, and snack targets on Profile.
- [ ] Add a meal picker to all search modes, preserving manual overrides and blank targets.
- [ ] Test goal rules and verify saving, reload, and search prefilling.

# Estimate accuracy
- [x] Break complex estimates into nested ingredients with separate portions, macro contributions, confidence, and sources; 18 tests pass. Verified real three-ingredient USDA lookup, logging/reload, phone layout, and live menu AI decomposition.
- [x] Add evidence-based confidence scores and source details to food logging and nearby meal estimates.
- [x] Test source validation and complex-dish uncertainty; 13 tests pass. Verify real USDA lookup, logging, and evidence persistence after reload.
- [ ] Verify live AI text/photo for dish-name or photo decomposition — the existing text/photo AI service key is not configured. Explicit ingredient lists use USDA and are verified.

# Restaurant map search
- [x] Add authenticated Google restaurant search and interactive map.
- [x] Retrieve restaurant website menus and estimate single-dish macros.
- [x] Rank three meals using only supplied per-meal targets; eight tests pass.
- [x] Verify signed-out desktop/mobile UI, actual AI output, and apply package security update.
- [ ] Verify signed-in discovery and Maps on authorized deployed origin — blocked by no auth users and sandbox Maps restriction.
- [ ] Verify live restaurant menu retrieval — provider timed out during the check.