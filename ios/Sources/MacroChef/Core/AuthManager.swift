import Foundation
import Supabase
import Auth

@MainActor
@Observable
final class AuthManager {
    let supabase: SupabaseClient

    var user: User?
    var isLoading: Bool = true
    var error: String?

    init() {
        supabase = SupabaseClient(
            supabaseURL: Config.supabaseURL,
            supabaseKey: Config.supabaseAnonKey
        )
    }

    func start() async {
        // Restore session from keychain
        do {
            let session = try await supabase.auth.session
            user = session.user
        } catch {
            user = nil
        }
        isLoading = false

        // Listen for auth state changes
        for await (event, session) in await supabase.auth.authStateChanges {
            switch event {
            case .signedIn, .tokenRefreshed, .userUpdated:
                user = session?.user
            case .signedOut:
                user = nil
            default:
                break
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        let session = try await supabase.auth.signIn(email: email, password: password)
        user = session.user
    }

    func signUp(email: String, password: String) async throws {
        let response = try await supabase.auth.signUp(email: email, password: password)
        user = response.user
    }

    func signOut() async throws {
        try await supabase.auth.signOut()
        user = nil
    }

    func signInWithGoogle() async throws {
        try await supabase.auth.signInWithOAuth(
            provider: .google,
            redirectTo: Config.oauthRedirectURL
        )
    }

    var isAuthenticated: Bool { user != nil }
}
