import SwiftUI

struct AuthView: View {
    @Environment(AuthManager.self) private var auth
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // ── Brand header ───────────────────────────────────────────
                    ZStack {
                        Color.brand
                            .ignoresSafeArea(edges: .top)

                        VStack(spacing: 14) {
                            BrandIconView(size: 88)
                                .shadow(color: .black.opacity(0.18), radius: 12, y: 4)

                            Text("MacroChef")
                                .font(.largeTitle.bold())
                                .foregroundStyle(.white)

                            Text("Recipes tuned to your macros")
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.85))
                        }
                        .padding(.top, 56)
                        .padding(.bottom, 40)
                    }

                    // ── Form card ──────────────────────────────────────────────
                    VStack(spacing: 20) {
                        // Toggle chip
                        HStack(spacing: 0) {
                            modeChip(title: "Sign in", active: !isSignUp) {
                                withAnimation(.easeInOut(duration: 0.2)) { isSignUp = false }
                                errorMessage = nil
                            }
                            modeChip(title: "Create account", active: isSignUp) {
                                withAnimation(.easeInOut(duration: 0.2)) { isSignUp = true }
                                errorMessage = nil
                            }
                        }
                        .background(Color(.systemGroupedBackground),
                                    in: RoundedRectangle(cornerRadius: 12))
                        .padding(.top, 24)

                        // Fields
                        VStack(spacing: 12) {
                            TextField("Email", text: $email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground),
                                            in: RoundedRectangle(cornerRadius: 12))

                            SecureField("Password", text: $password)
                                .textContentType(isSignUp ? .newPassword : .password)
                                .padding()
                                .background(Color(.secondarySystemGroupedBackground),
                                            in: RoundedRectangle(cornerRadius: 12))
                        }

                        if let error = errorMessage {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                        }

                        // Primary button
                        Button {
                            Task { await submit() }
                        } label: {
                            Group {
                                if isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text(isSignUp ? "Create account" : "Sign in")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.brand)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .disabled(isLoading || email.isEmpty || password.isEmpty)

                        // Divider
                        HStack {
                            Rectangle().frame(height: 1).foregroundStyle(.quaternary)
                            Text("or").font(.caption).foregroundStyle(.secondary)
                            Rectangle().frame(height: 1).foregroundStyle(.quaternary)
                        }

                        // Google button
                        Button {
                            Task { await signInWithGoogle() }
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "globe")
                                    .foregroundStyle(Color.brand)
                                Text("Continue with Google")
                                    .fontWeight(.medium)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.secondarySystemGroupedBackground),
                                        in: RoundedRectangle(cornerRadius: 12))
                        }
                        .foregroundStyle(.primary)
                        .disabled(isLoading)

                        // Footer
                        Text("By continuing you agree to our Terms of Service and Privacy Policy.")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.bottom, 32)
                    }
                    .padding(.horizontal, 24)
                }
            }
            .scrollBounceBehavior(.basedOnSize)
            .background(Color(.systemGroupedBackground))
        }
    }

    // MARK: - Helpers

    @ViewBuilder
    private func modeChip(title: String, active: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.medium))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(
                    active
                        ? Color.brand
                        : Color.clear,
                    in: RoundedRectangle(cornerRadius: 10)
                )
                .foregroundStyle(active ? .white : .secondary)
        }
        .padding(4)
    }

    // MARK: - Actions

    private func submit() async {
        isLoading = true
        errorMessage = nil
        do {
            if isSignUp {
                try await auth.signUp(email: email, password: password)
            } else {
                try await auth.signIn(email: email, password: password)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func signInWithGoogle() async {
        isLoading = true
        errorMessage = nil
        do {
            try await auth.signInWithGoogle()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
