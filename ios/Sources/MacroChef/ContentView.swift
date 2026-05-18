import SwiftUI

struct ContentView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(TrackingStore.self) private var store

    var body: some View {
        if auth.isLoading {
            splashView
        } else if !auth.isAuthenticated {
            AuthView()
        } else {
            mainTabs
                .task {
                    // Load cloud goals once on sign-in
                    await store.loadGoalsFromSupabase()
                }
        }
    }

    @ViewBuilder
    private var splashView: some View {
        VStack(spacing: 16) {
            Image(systemName: "fork.knife.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(.green)
            ProgressView()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var mainTabs: some View {
        TabView {
            DiaryView()
                .tabItem {
                    Label("Diary", systemImage: "calendar")
                }

            RecipesView()
                .tabItem {
                    Label("Recipes", systemImage: "fork.knife")
                }

            ActivityView()
                .tabItem {
                    Label("Activity", systemImage: "figure.run")
                }

            AnalyticsView()
                .tabItem {
                    Label("Analytics", systemImage: "chart.bar")
                }

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle")
                }
        }
        .tint(.green)
    }
}
