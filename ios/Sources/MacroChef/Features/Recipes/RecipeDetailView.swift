import SwiftUI

struct RecipeDetailView: View {
    let recipe: RecipeSearchResult
    let api: APIClient?

    @Environment(AuthManager.self) private var auth
    @Environment(TrackingStore.self) private var store
    @State private var detail: RecipeDetail?
    @State private var isLoading = true
    @State private var error: String?
    @State private var servings: Int = 1
    @State private var savedToMeal: MealType?
    @State private var showAddToMeal = false

    private var scale: Double { Double(servings) / Double(detail?.servings ?? 1) }
    private var scaled: Macros? {
        guard let d = detail else { return nil }
        return Macros(kcal: d.macros.kcal * scale, protein_g: d.macros.protein_g * scale,
                      carbs_g: d.macros.carbs_g * scale, fat_g: d.macros.fat_g * scale)
    }

    var body: some View {
        ScrollView {
            if isLoading {
                ProgressView("Loading recipe…").frame(maxWidth: .infinity).padding(.top, 80)
            } else if let error {
                ContentUnavailableView("Failed to load", systemImage: "exclamationmark.triangle",
                                       description: Text(error))
            } else if let detail {
                recipeContent(detail)
            }
        }
        .navigationTitle(recipe.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showAddToMeal = true
                } label: {
                    Label("Add to Diary", systemImage: "plus.circle")
                }
                .disabled(detail == nil)
            }
        }
        .sheet(isPresented: $showAddToMeal) {
            mealPicker
        }
        .task {
            await loadDetail()
        }
    }

    @ViewBuilder
    private func recipeContent(_ d: RecipeDetail) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Hero image
            AsyncImage(url: URL(string: d.image)) { phase in
                switch phase {
                case .success(let img): img.resizable().scaledToFill()
                case .failure: Color.secondary.opacity(0.15).overlay(Image(systemName: "fork.knife").font(.largeTitle).foregroundStyle(.secondary))
                default: Color.secondary.opacity(0.1)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 240)
            .clipped()

            VStack(alignment: .leading, spacing: 20) {
                // Meta
                HStack(spacing: 16) {
                    if d.readyInMinutes > 0 {
                        Label("\(d.readyInMinutes) min", systemImage: "clock")
                    }
                    Label("\(d.servings) servings", systemImage: "person.2")
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)

                // Serving adjuster
                VStack(alignment: .leading, spacing: 8) {
                    Text("Servings")
                        .font(.subheadline.weight(.semibold))
                    HStack {
                        Button {
                            if servings > 1 { servings -= 1 }
                        } label: {
                            Image(systemName: "minus.circle.fill").font(.title2).foregroundStyle(.green)
                        }
                        Text("\(servings)")
                            .font(.title2.monospacedDigit())
                            .frame(width: 40)
                        Button {
                            servings += 1
                        } label: {
                            Image(systemName: "plus.circle.fill").font(.title2).foregroundStyle(.green)
                        }
                    }
                }

                // Macro card
                if let m = scaled {
                    HStack(spacing: 0) {
                        macroPill(label: "Calories", value: m.kcal, unit: "kcal", color: .primary)
                        Divider().frame(height: 40)
                        macroPill(label: "Protein", value: m.protein_g, unit: "g", color: .blue)
                        Divider().frame(height: 40)
                        macroPill(label: "Carbs", value: m.carbs_g, unit: "g", color: .orange)
                        Divider().frame(height: 40)
                        macroPill(label: "Fat", value: m.fat_g, unit: "g", color: .yellow)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(.quaternary, in: RoundedRectangle(cornerRadius: 12))
                }

                // Ingredients
                VStack(alignment: .leading, spacing: 10) {
                    Text("Ingredients")
                        .font(.headline)
                    ForEach(d.ingredients) { ing in
                        HStack(alignment: .top, spacing: 8) {
                            Circle().fill(.green).frame(width: 6, height: 6).padding(.top, 6)
                            Text(ing.original.isEmpty ? ing.name : ing.original)
                                .font(.subheadline)
                        }
                    }
                }

                // Instructions
                if !d.instructions.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Instructions")
                            .font(.headline)
                        ForEach(Array(d.instructions.enumerated()), id: \.offset) { i, step in
                            HStack(alignment: .top, spacing: 12) {
                                Text("\(i + 1)")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(.white)
                                    .frame(width: 22, height: 22)
                                    .background(.green, in: Circle())
                                Text(step)
                                    .font(.subheadline)
                            }
                        }
                    }
                }

                // Source link
                if let url = d.sourceUrl.flatMap(URL.init) {
                    Link(destination: url) {
                        Label("View original recipe", systemImage: "arrow.up.right.square")
                            .font(.subheadline)
                    }
                    .tint(.green)
                }
            }
            .padding()
        }
    }

    @ViewBuilder
    private func macroPill(label: String, value: Double, unit: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(value.formatted(.number.precision(.fractionLength(0))))
                .font(.subheadline.weight(.bold).monospacedDigit())
                .foregroundStyle(color)
            Text(unit).font(.caption2).foregroundStyle(.secondary)
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private var mealPicker: some View {
        NavigationStack {
            List(MealType.allCases, id: \.self) { meal in
                Button(meal.label) {
                    addRecipeToMeal(meal)
                    showAddToMeal = false
                }
            }
            .navigationTitle("Add to Diary")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showAddToMeal = false }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func addRecipeToMeal(_ meal: MealType) {
        guard let d = detail, let m = scaled else { return }
        let item = FoodLogItem(
            name: "\(d.title) (\(servings) serving\(servings == 1 ? "" : "s"))",
            quantity: Double(servings),
            unit: "serving",
            kcal: m.kcal,
            protein_g: m.protein_g,
            carbs_g: m.carbs_g,
            fat_g: m.fat_g,
            source: .recipe
        )
        store.addFood(item, meal: meal)
    }

    private func loadDetail() async {
        guard let api else { isLoading = false; error = "API not available"; return }
        do {
            let source = recipe.source ?? "spoonacular"
            let d = try await api.getRecipe(id: recipe.id, source: source)
            await MainActor.run {
                detail = d
                servings = d?.servings ?? 1
                isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                isLoading = false
            }
        }
    }
}
