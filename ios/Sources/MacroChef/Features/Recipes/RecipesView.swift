import SwiftUI

struct RecipesView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(TrackingStore.self) private var store
    @State private var api: APIClient?
    @State private var query = ""
    @State private var results: [RecipeSearchResult] = []
    @State private var isLoading = false
    @State private var error: String?
    @State private var useGoals = false
    @State private var selectedRecipe: RecipeSearchResult?
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                    TextField("Search recipes…", text: $query)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onChange(of: query) { _, q in scheduleSearch(q) }
                    if isLoading { ProgressView().scaleEffect(0.8) }
                    if !query.isEmpty {
                        Button { query = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }
                    }
                }
                .padding(12)
                .background(.quaternary, in: RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal)
                .padding(.top)

                // Goals toggle
                HStack {
                    Toggle(isOn: $useGoals) {
                        Label("Match my macro goals", systemImage: "target")
                            .font(.subheadline)
                    }
                    .tint(.green)
                    .onChange(of: useGoals) { _, _ in doSearch(query: query) }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)

                Divider()

                if let error {
                    ContentUnavailableView("Search failed", systemImage: "exclamationmark.triangle",
                                          description: Text(error))
                } else if results.isEmpty && !query.isEmpty && !isLoading {
                    ContentUnavailableView("No recipes found", systemImage: "fork.knife",
                                          description: Text("Try a different search"))
                } else if results.isEmpty && query.isEmpty {
                    emptyState
                } else {
                    recipeGrid
                }
            }
            .navigationTitle("Recipes")
            .navigationDestination(item: $selectedRecipe) { recipe in
                RecipeDetailView(recipe: recipe, api: api)
            }
        }
        .onAppear {
            api = APIClient(authManager: auth)
            if results.isEmpty { doSearch(query: "") }
        }
    }

    @ViewBuilder
    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "fork.knife.circle")
                .font(.system(size: 56))
                .foregroundStyle(.green.opacity(0.6))
            Text("Discover recipes")
                .font(.headline)
            Text("Search by name, cuisine, or ingredient — or toggle macro goals to find recipes that fit your targets.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Button("Show popular recipes") {
                doSearch(query: "")
            }
            .buttonStyle(.bordered)
            .tint(.green)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var recipeGrid: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                ForEach(results) { recipe in
                    RecipeCard(recipe: recipe)
                        .onTapGesture { selectedRecipe = recipe }
                }
            }
            .padding()
        }
    }

    private func scheduleSearch(_ query: String) {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            doSearch(query: query)
        }
    }

    private func doSearch(query: String) {
        guard let api else { return }
        let goals = store.settings
        Task {
            await MainActor.run { isLoading = true; error = nil }
            do {
                let found = try await api.searchRecipes(
                    query: query,
                    kcal: useGoals ? goals.dailyCalorieTarget / 3 : nil,
                    protein_g: useGoals ? goals.dailyProteinTarget / 3 : nil,
                    carbs_g: useGoals ? goals.dailyCarbsTarget / 3 : nil,
                    fat_g: useGoals ? goals.dailyFatTarget / 3 : nil,
                    number: 20
                )
                await MainActor.run { results = found; isLoading = false }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}

struct RecipeCard: View {
    let recipe: RecipeSearchResult

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            AsyncImage(url: URL(string: recipe.image)) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                case .failure:
                    Color.secondary.opacity(0.2)
                        .overlay(Image(systemName: "fork.knife").foregroundStyle(.secondary))
                default:
                    Color.secondary.opacity(0.1)
                }
            }
            .frame(height: 120)
            .clipped()
            .clipShape(UnevenRoundedRectangle(topLeadingRadius: 12, topTrailingRadius: 12))

            VStack(alignment: .leading, spacing: 6) {
                Text(recipe.title)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)

                if let kcal = recipe.kcal {
                    HStack(spacing: 6) {
                        Text("\(Int(kcal)) kcal")
                            .font(.caption.monospacedDigit())
                            .fontWeight(.medium)
                        if let fit = recipe.fitKind {
                            fitBadge(fit)
                        }
                    }
                }

                if let p = recipe.protein_g, let c = recipe.carbs_g, let f = recipe.fat_g {
                    HStack(spacing: 6) {
                        Text("P \(Int(p))g").font(.caption2).foregroundStyle(.blue)
                        Text("C \(Int(c))g").font(.caption2).foregroundStyle(.orange)
                        Text("F \(Int(f))g").font(.caption2).foregroundStyle(.secondary)
                    }
                }
            }
            .padding(10)
        }
        .background(.background, in: RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.07), radius: 6, y: 2)
    }

    @ViewBuilder
    private func fitBadge(_ kind: String) -> some View {
        let (label, color): (String, Color) = switch kind {
        case "fits": ("Fits", .green)
        case "swaps": ("Swaps", .orange)
        case "close": ("Close", .blue)
        default: (kind.capitalized, .secondary)
        }
        Text(label)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(color.opacity(0.15), in: Capsule())
            .foregroundStyle(color)
    }
}

// Make RecipeSearchResult identifiable for NavigationDestination
extension RecipeSearchResult: Hashable {
    public static func == (lhs: RecipeSearchResult, rhs: RecipeSearchResult) -> Bool { lhs.id == rhs.id }
    public func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
