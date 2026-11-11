# Sign-in repair
- [ ] Restore public sign-in configuration in deployed browser assets and test missing/private-key safeguards.
- [ ] Replace legacy Google sign-in with managed login and verify available sign-in flows.

# Saved per-meal goals
- [x] Save optional breakfast, lunch, dinner, and snack targets on Profile.
- [x] Add a meal picker to all search modes, preserving manual overrides and blank targets.
- [x] Test goal rules: 13 tests pass; verify desktop search pickers and phone layout with no overflow.
- [ ] Verify signed-in save/reload and saved-goal prefilling — no auth users exist, so a preview session cannot be minted; requires signing up/signing in.

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