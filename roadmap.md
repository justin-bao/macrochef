# Estimate accuracy
- [ ] Break complex estimates into ingredients with individual nutrition evidence; verify totals and saved breakdowns.
- [x] Add evidence-based confidence scores and source details to food logging and nearby meal estimates.
- [x] Test source validation and complex-dish uncertainty; 13 tests pass. Verify real USDA lookup, logging, and evidence persistence after reload.
- [ ] Verify live AI text/photo and nearby restaurant evidence — restaurant checks require a signed-in account; AI provider output has not been exercised in this turn.

# Restaurant map search
- [x] Add authenticated Google restaurant search and interactive map.
- [x] Retrieve restaurant website menus and estimate single-dish macros.
- [x] Rank three meals using only supplied per-meal targets; eight tests pass.
- [x] Verify signed-out desktop/mobile UI, actual AI output, and apply package security update.
- [ ] Verify signed-in discovery and Maps on authorized deployed origin — blocked by no auth users and sandbox Maps restriction.
- [ ] Verify live restaurant menu retrieval — provider timed out during the check.