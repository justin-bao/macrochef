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
        VStack(spacing: 20) {
            BrandIconView(size: 96)
                .shadow(color: .black.opacity(0.15), radius: 16, y: 6)
            Text("MacroChef")
                .font(.title2.bold())
                .foregroundStyle(.primary)
            ProgressView()
                .tint(Color.brand)
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
        .tint(Color.brand)
    }
}
