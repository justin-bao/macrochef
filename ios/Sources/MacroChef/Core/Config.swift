import Foundation

enum Config {
    // MARK: - Fill these in before building

    static let supabaseURL = URL(string: "https://YOUR_PROJECT.supabase.co")!
    static let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"

    /// Base URL of your Vercel deployment (no trailing slash)
    static let apiBaseURL = URL(string: "https://YOUR_PROJECT.vercel.app")!

    // MARK: - OAuth

    /// Supabase auth callback URL — used for Google OAuth redirect
    static let oauthRedirectURL = URL(string: "macrochef://auth/callback")!
}
