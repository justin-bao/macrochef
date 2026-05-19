import Foundation
import Supabase
import AuthenticationServices

typealias SupabaseUser = Auth.User

@MainActor
@Observable
final class AuthManager {
    let supabase: SupabaseClient

    var user: SupabaseUser?
    var isLoading: Bool = true
    var error: String?

    // Held alive while OAuth is in flight
    private var webAuthSession: ASWebAuthenticationSession?

    init() {
        supabase = SupabaseClient(
            supabaseURL: Config.supabaseURL,
            supabaseKey: Config.supabaseAnonKey
        )
    }

    func start() async {
        do {
            let session = try await supabase.auth.session
            user = session.user
        } catch {
            user = nil
        }
        isLoading = false

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
        let scheme = "macrochef"
        let redirectURL = URL(string: "\(scheme)://auth-callback")!

        try await supabase.auth.signInWithOAuth(
            provider: .google,
            redirectTo: redirectURL
        ) { [self] url in
            try await withCheckedThrowingContinuation { continuation in
                Task { @MainActor in
                    let session = ASWebAuthenticationSession(
                        url: url,
                        callbackURLScheme: scheme
                    ) { callbackURL, error in
                        self.webAuthSession = nil
                        if let error {
                            continuation.resume(throwing: error)
                        } else if let callbackURL {
                            continuation.resume(returning: callbackURL)
                        } else {
                            continuation.resume(throwing: URLError(.cancelled))
                        }
                    }
                    session.presentationContextProvider = PresentationAnchorHelper.shared
                    session.prefersEphemeralWebBrowserSession = false
                    self.webAuthSession = session
                    session.start()
                }
            }
        }
    }

    var isAuthenticated: Bool { user != nil }
}

// MARK: - OAuth presentation helper

private final class PresentationAnchorHelper: NSObject, ASWebAuthenticationPresentationContextProviding, @unchecked Sendable {
    static let shared = PresentationAnchorHelper()

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .compactMap { $0.windows.first }
            .first ?? ASPresentationAnchor()
    }
}
