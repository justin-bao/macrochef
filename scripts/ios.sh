#!/usr/bin/env bash
# iOS build + run helper
# Usage: scripts/ios.sh <target> <env>
#   target : sim | device
#   env    : dev | prod
#
# Examples:
#   scripts/ios.sh sim prod     ← simulator, production API
#   scripts/ios.sh sim dev      ← simulator, localhost:3000
#   scripts/ios.sh device prod  ← physical iPhone, production API
#   scripts/ios.sh device dev   ← physical iPhone, localhost:3000

set -euo pipefail

TARGET=${1:-sim}
ENV=${2:-prod}

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$REPO_ROOT/ios"
PROJECT="$IOS_DIR/MacroChef.xcodeproj"
SCHEME="MacroChef"
BUNDLE_ID="MacroChef.MacroChef"
DERIVED_DATA="$REPO_ROOT/.ios-build"

# Pick xcconfig
if [[ "$ENV" == "dev" ]]; then
  XCCONFIG="$IOS_DIR/xcconfig/Dev.xcconfig"
  ENV_LABEL="DEV (localhost:3000)"
else
  XCCONFIG="$IOS_DIR/xcconfig/Prod.xcconfig"
  ENV_LABEL="PROD (macrochef-log.vercel.app)"
fi

# ── Simulator ──────────────────────────────────────────────────────────────────
if [[ "$TARGET" == "sim" ]]; then

  # Pick best available iPhone simulator
  SIM_NAME=$(xcrun simctl list devices available -j \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
iphones = []
for runtime, devices in data.get('devices', {}).items():
    if 'iOS' not in runtime: continue
    for d in devices:
        if d.get('isAvailable') and 'iPhone' in d.get('name',''):
            iphones.append((runtime, d['name'], d['udid']))
iphones.sort(reverse=True)
print(iphones[0][1] if iphones else '')
" 2>/dev/null || echo "")

  if [[ -z "$SIM_NAME" ]]; then
    echo "❌  No available iPhone simulator found. Open Xcode → Settings → Platforms to download one."
    exit 1
  fi

  DESTINATION="platform=iOS Simulator,name=${SIM_NAME}"
  echo "📱  Target  : Simulator — $SIM_NAME"
  echo "🌐  Env     : $ENV_LABEL"
  echo ""

  echo "▶  Building…"
  xcodebuild \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -xcconfig "$XCCONFIG" \
    -destination "$DESTINATION" \
    -derivedDataPath "$DERIVED_DATA" \
    -configuration Debug \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    build \
    | xcpretty 2>/dev/null || cat  # fall back to raw output if xcpretty not installed

  # Find the built .app
  APP_PATH=$(find "$DERIVED_DATA/Build/Products" -name "MacroChef.app" -maxdepth 4 | head -1)
  if [[ -z "$APP_PATH" ]]; then
    echo "❌  Could not find MacroChef.app in $DERIVED_DATA/Build/Products"
    exit 1
  fi

  echo ""
  echo "▶  Booting simulator…"
  SIM_UDID=$(xcrun simctl list devices available -j \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    if 'iOS' not in runtime: continue
    for d in devices:
        if d.get('name') == '${SIM_NAME}' and d.get('isAvailable'):
            print(d['udid'])
            exit()
" 2>/dev/null || echo "booted")

  xcrun simctl boot "$SIM_UDID" 2>/dev/null || true
  open -a Simulator

  echo "▶  Installing…"
  xcrun simctl install "$SIM_UDID" "$APP_PATH"

  echo "▶  Launching…"
  xcrun simctl launch --console-pty "$SIM_UDID" "$BUNDLE_ID" || \
  xcrun simctl launch "$SIM_UDID" "$BUNDLE_ID"

  echo ""
  echo "✅  Running on $SIM_NAME ($ENV_LABEL)"

# ── Physical device ────────────────────────────────────────────────────────────
elif [[ "$TARGET" == "device" ]]; then

  echo "📱  Target  : Physical iPhone"
  echo "🌐  Env     : $ENV_LABEL"
  echo ""

  # Find connected device UDID via devicectl (Xcode 15+)
  DEVICE_UDID=$(xcrun devicectl list devices 2>/dev/null \
    | grep -E "iPhone|iPad" | grep -v "Simulator" | awk 'NR==1{print $NF}' || echo "")

  if [[ -z "$DEVICE_UDID" ]]; then
    echo "❌  No iPhone found. Make sure it's plugged in, unlocked, and trusted on this Mac."
    exit 1
  fi

  DESTINATION="platform=iOS,id=${DEVICE_UDID}"

  echo "▶  Building + installing on device (this handles codesigning automatically)…"
  xcodebuild \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -xcconfig "$XCCONFIG" \
    -destination "$DESTINATION" \
    -derivedDataPath "$DERIVED_DATA" \
    -configuration Debug \
    build \
    | xcpretty 2>/dev/null || cat

  # Launch via devicectl
  APP_PATH=$(find "$DERIVED_DATA/Build/Products" -name "MacroChef.app" -maxdepth 4 | head -1)
  if [[ -n "$APP_PATH" ]]; then
    echo "▶  Installing on device…"
    xcrun devicectl device install app --device "$DEVICE_UDID" "$APP_PATH" 2>/dev/null || true
    echo "▶  Launching…"
    xcrun devicectl device process launch --device "$DEVICE_UDID" "$BUNDLE_ID" 2>/dev/null || true
  fi

  echo ""
  echo "✅  Done ($ENV_LABEL) — check your iPhone"

else
  echo "Usage: scripts/ios.sh [sim|device] [dev|prod]"
  exit 1
fi
