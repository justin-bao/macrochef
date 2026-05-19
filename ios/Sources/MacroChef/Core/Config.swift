import Foundation

enum Config {
    // MARK: - Supabase (these are publishable — safe to commit)

    static let supabaseURL = URL(string: "https://jnnmrfthjwtnpunqphrg.supabase.co")!
    static let supabaseAnonKey = "sb_publishable_a0nj5E_dLcWXnExC1KCJSQ_y-n_yyE6"

    /// API base URL — injected at build time via xcconfig (Dev.xcconfig / Prod.xcconfig).
    /// Falls back to production if not set (e.g. when building directly from Xcode without -xcconfig).
    static let apiBaseURL: URL = {
        if let urlString = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
           !urlString.isEmpty,
           let url = URL(string: urlString) {
            return url
        }
        return URL(string: "https://macrochef-log.vercel.app/")!
    }()

    // MARK: - OAuth

    /// Custom URL scheme registered in Info.plist — ASWebAuthenticationSession callback
    static let oauthRedirectURL = URL(string: "macrochef://auth-callback")!
}
