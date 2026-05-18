import Foundation

enum Config {
    // MARK: - Fill these in before building

    static let supabaseURL = URL(string: "https://jnnmrfthjwtnpunqphrg.supabase.co")!
    static let supabaseAnonKey = "sb_publishable_a0nj5E_dLcWXnExC1KCJSQ_y-n_yyE6"

    /// Base URL of your Vercel deployment (no trailing slash)
    static let apiBaseURL = URL(string: "https://macrochef-log.vercel.app/")!

    // MARK: - OAuth

    /// Supabase auth callback URL — used for Google OAuth redirect
    static let oauthRedirectURL = URL(string: "https://jnnmrfthjwtnpunqphrg.supabase.co/auth/v1/callback")!
}
