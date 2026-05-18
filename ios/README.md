# MacroChef iOS

Native SwiftUI app for MacroChef — food logging, recipe search, activity tracking, and macro analytics. Connects to the Vercel backend and uses Supabase for auth and data.

## Requirements

- Xcode 15.2+
- iOS 17+ simulator or device
- MacroChef Vercel deployment (web app backend)

## Setup

### 1. Fill in Config.swift

Open `Sources/MacroChef/Core/Config.swift` and replace the placeholder values:

```swift
static let supabaseURL = URL(string: "https://YOUR_PROJECT.supabase.co")!
static let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"
static let apiBaseURL = URL(string: "https://YOUR_PROJECT.vercel.app")!
```

Find these values in:
- **Supabase URL + anon key**: Supabase dashboard → Project Settings → API
- **Vercel URL**: Vercel dashboard → your MacroChef deployment URL

### 2. Open in Xcode

**Option A — Swift Package (recommended for development):**
```bash
cd ios
open Package.swift
```
Xcode opens the package. Select the `MacroChef` scheme, choose an iOS 17 simulator, and press Run.

**Option B — New Xcode Project (recommended for App Store distribution):**
1. Xcode → File → New → Project → iOS → App
2. Name: `MacroChef`, Bundle ID: `com.yourname.macrochef`, SwiftUI interface
3. Add Supabase Swift SDK: File → Add Package Dependencies → `https://github.com/supabase/supabase-swift.git` (from: 2.0.0), add `Supabase`, `Auth`, `PostgREST` products
4. Delete the default `ContentView.swift` and `[AppName]App.swift`
5. Drag all files from `ios/Sources/MacroChef/` into the Xcode project, checking "Copy items if needed"

### 3. Google Sign-In (optional)

To enable Google OAuth on iOS:
1. In Supabase dashboard → Auth → Providers → Google, note your redirect URL (e.g. `https://YOUR_PROJECT.supabase.co/auth/v1/callback`)
2. In Google Cloud Console, add your iOS bundle ID as an authorized redirect origin
3. In `Config.swift`, set `googleAuthRedirectURL` to your Supabase callback URL

The app uses Supabase's built-in OAuth flow via `ASWebAuthenticationSession` — no Google SDK needed.

### 4. Sign in with Apple (App Store requirement)

If you submit to the App Store, Apple requires Sign in with Apple when you support other social logins (e.g. Google). To add it:
1. In Xcode, add the "Sign in with Apple" capability to your app target
2. Uncomment the Apple sign-in button in `AuthView.swift`
3. Add the Supabase Apple provider in your dashboard

## Architecture

```
Sources/MacroChef/
├── MacroChefApp.swift          # @main app entry point
├── ContentView.swift           # Root tab bar
├── Core/
│   ├── Config.swift            # API URLs and keys (fill in before building)
│   ├── Models.swift            # All data models (mirrors TypeScript types)
│   ├── AuthManager.swift       # Supabase auth state (@Observable)
│   ├── APIClient.swift         # HTTP client for Vercel REST endpoints
│   └── TrackingStore.swift     # Food/activity diary state + persistence
└── Features/
    ├── Auth/AuthView.swift
    ├── Diary/
    │   ├── DiaryView.swift
    │   ├── AddFoodView.swift
    │   └── MacroProgressView.swift
    ├── Recipes/
    │   ├── RecipesView.swift
    │   └── RecipeDetailView.swift
    ├── Activity/
    │   ├── ActivityView.swift
    │   └── AddActivityView.swift
    ├── Analytics/AnalyticsView.swift
    └── Profile/ProfileView.swift
```

## Backend API Routes

The iOS app calls these REST endpoints on your Vercel deployment:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/food/search?q=chicken` | Search USDA + Open Food Facts |
| `POST` | `/api/food/estimate` | USDA macro lookup for a specific quantity |
| `POST` | `/api/recipes/search` | Spoonacular + Kaggle recipe search |
| `GET` | `/api/recipes/:id?source=spoonacular` | Recipe detail with ingredients |

User data (diary, goals, saved recipes) is read/written directly to Supabase via the Swift SDK — no additional backend routes needed.

## Data Persistence

- **Local**: `UserDefaults` for diary and settings (works offline)
- **Cloud**: Supabase tables `macro_goals`, `user_profiles`, `saved_recipes` (synced when authenticated)
- RLS ensures users only access their own data
