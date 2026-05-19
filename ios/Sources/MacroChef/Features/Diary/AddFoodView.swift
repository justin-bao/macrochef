import SwiftUI

struct AddFoodView: View {
    let meal: MealType
    let onAdd: (FoodLogItem) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var api: APIClient?
    @State private var searchQuery = ""
    @State private var results: [FoodSearchResult] = []
    @State private var isSearching = false
    @State private var selectedResult: FoodSearchResult?
    @State private var showManual = false
    @State private var searchTask: Task<Void, Never>?

    // Manual entry state
    @State private var manualName = ""
    @State private var manualKcal = ""
    @State private var manualProtein = ""
    @State private var manualCarbs = ""
    @State private var manualFat = ""
    @State private var manualQuantity = "1"
    @State private var manualUnit = "serving"

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Mode", selection: $showManual) {
                    Text("Search").tag(false)
                    Text("Manual").tag(true)
                }
                .pickerStyle(.segmented)
                .padding()

                if showManual {
                    manualForm
                } else {
                    searchForm
                }
            }
            .navigationTitle("Add to \(meal.label)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .task {
            // APIClient is injected via environment in parent — we receive it via task
        }
    }

    @ViewBuilder
    private var searchForm: some View {
        VStack(spacing: 0) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search food (e.g. chicken breast)", text: $searchQuery)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .onChange(of: searchQuery) { _, q in scheduleSearch(q) }
                if isSearching {
                    ProgressView().scaleEffect(0.8)
                }
            }
            .padding(12)
            .background(.quaternary, in: RoundedRectangle(cornerRadius: 10))
            .padding()

            if let selected = selectedResult {
                servingSelector(for: selected)
            } else {
                List(results) { result in
                    Button {
                        selectedResult = result
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(result.name)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.primary)
                            HStack(spacing: 8) {
                                Text("\(Int(result.kcal_per_100g)) kcal")
                                Text("P: \(result.protein_g_per_100g, specifier: "%.1f")g")
                                Text("C: \(result.carbs_g_per_100g, specifier: "%.1f")g")
                                Text("F: \(result.fat_g_per_100g, specifier: "%.1f")g")
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            if let brand = result.brandOwner {
                                Text(brand).font(.caption2).foregroundStyle(.tertiary)
                            }
                        }
                    }
                }
                .listStyle(.plain)

                if results.isEmpty && !searchQuery.isEmpty && !isSearching {
                    ContentUnavailableView("No results", systemImage: "magnifyingglass",
                                          description: Text("Try a different search or add manually"))
                }
            }
        }
    }

    @ViewBuilder
    private func servingSelector(for food: FoodSearchResult) -> some View {
        ServingPickerView(food: food) { item in
            onAdd(item)
            dismiss()
        } onBack: {
            selectedResult = nil
        }
    }

    @ViewBuilder
    private var manualForm: some View {
        Form {
            Section("Food") {
                TextField("Name", text: $manualName)
            }
            Section("Amount") {
                HStack {
                    TextField("Quantity", text: $manualQuantity)
                        .keyboardType(.decimalPad)
                        .frame(width: 80)
                    TextField("Unit (e.g. g, oz, serving)", text: $manualUnit)
                }
            }
            Section("Macros") {
                LabeledContent("Calories (kcal)") {
                    TextField("0", text: $manualKcal).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                }
                LabeledContent("Protein (g)") {
                    TextField("0", text: $manualProtein).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                }
                LabeledContent("Carbs (g)") {
                    TextField("0", text: $manualCarbs).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                }
                LabeledContent("Fat (g)") {
                    TextField("0", text: $manualFat).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                }
            }
            Section {
                Button("Add to \(meal.label)") {
                    addManual()
                }
                .frame(maxWidth: .infinity)
                .foregroundStyle(.green)
                .disabled(manualName.isEmpty)
            }
        }
    }

    private func scheduleSearch(_ query: String) {
        searchTask?.cancel()
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            results = []
            return
        }
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(350))
            guard !Task.isCancelled else { return }
            isSearching = true
            // API client is passed from the parent environment
            // For now fall back to a simple approach — parent should inject it
            isSearching = false
        }
    }

    private func addManual() {
        let item = FoodLogItem(
            name: manualName,
            quantity: Double(manualQuantity) ?? 1,
            unit: manualUnit,
            kcal: Double(manualKcal) ?? 0,
            protein_g: Double(manualProtein) ?? 0,
            carbs_g: Double(manualCarbs) ?? 0,
            fat_g: Double(manualFat) ?? 0,
            source: .manual
        )
        onAdd(item)
        dismiss()
    }
}

struct ServingPickerView: View {
    let food: FoodSearchResult
    let onAdd: (FoodLogItem) -> Void
    let onBack: () -> Void

    @State private var gramsText = "100"
    private var grams: Double { Double(gramsText) ?? 100 }

    private var preview: Macros {
        let f = grams / 100
        return Macros(
            kcal: food.kcal_per_100g * f,
            protein_g: food.protein_g_per_100g * f,
            carbs_g: food.carbs_g_per_100g * f,
            fat_g: food.fat_g_per_100g * f
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            Button(action: onBack) {
                HStack {
                    Image(systemName: "chevron.left")
                    Text("Back to results")
                }
                .font(.subheadline)
                .foregroundStyle(.green)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
            }

            VStack(alignment: .leading, spacing: 8) {
                Text(food.name)
                    .font(.headline)
                if let brand = food.brandOwner {
                    Text(brand).font(.caption).foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal)

            Form {
                Section("Serving size") {
                    HStack {
                        TextField("Grams", text: $gramsText)
                            .keyboardType(.decimalPad)
                        Text("g")
                            .foregroundStyle(.secondary)
                    }
                    if let desc = food.servingDescription {
                        Text(desc).font(.caption).foregroundStyle(.secondary)
                    }
                }
                Section("Nutrition") {
                    LabeledContent("Calories") { Text("\(Int(preview.kcal)) kcal") }
                    LabeledContent("Protein") { Text("\(preview.protein_g, specifier: "%.1f") g") }
                    LabeledContent("Carbs") { Text("\(preview.carbs_g, specifier: "%.1f") g") }
                    LabeledContent("Fat") { Text("\(preview.fat_g, specifier: "%.1f") g") }
                }
                Section {
                    Button("Add to meal") {
                        let item = food.toFoodLogItem(quantity: grams, unit: "g", grams: grams)
                        onAdd(item)
                    }
                    .frame(maxWidth: .infinity)
                    .foregroundStyle(.green)
                }
            }
        }
    }
}

// MARK: - Search-enabled wrapper

struct AddFoodSearchView: View {
    let meal: MealType
    let api: APIClient
    let onAdd: (FoodLogItem) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var searchQuery = ""
    @State private var results: [FoodSearchResult] = []
    @State private var isSearching = false
    @State private var selectedResult: FoodSearchResult?
    @State private var searchTask: Task<Void, Never>?
    enum AddFoodTab { case search, ai, manual }
    @State private var activeTab: AddFoodTab = .search

    // Manual entry
    @State private var manualName = ""
    @State private var manualKcal = ""
    @State private var manualProtein = ""
    @State private var manualCarbs = ""
    @State private var manualFat = ""
    @State private var manualQuantity = "1"
    @State private var manualUnit = "serving"

    // AI estimate entry
    @State private var aiDescription = ""
    @State private var aiQuantity = "1"
    @State private var aiUnit = "serving"
    @State private var aiEstimate: FoodEstimateResult?
    @State private var isEstimating = false
    @State private var aiError: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Mode", selection: $activeTab) {
                    Text("Search").tag(AddFoodTab.search)
                    Text("AI").tag(AddFoodTab.ai)
                    Text("Manual").tag(AddFoodTab.manual)
                }
                .pickerStyle(.segmented)
                .padding()

                switch activeTab {
                case .search:   searchContent
                case .ai:       aiForm
                case .manual:   manualForm
                }
            }
            .navigationTitle("Add to \(meal.label)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    @ViewBuilder
    private var searchContent: some View {
        VStack(spacing: 0) {
            HStack {
                Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                TextField("Search food (e.g. chicken breast, Cheerios)", text: $searchQuery)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .onChange(of: searchQuery) { _, q in scheduleSearch(q) }
                if isSearching { ProgressView().scaleEffect(0.8) }
            }
            .padding(12)
            .background(.quaternary, in: RoundedRectangle(cornerRadius: 10))
            .padding()

            if let selected = selectedResult {
                ServingPickerView(food: selected) { item in
                    onAdd(item)
                    dismiss()
                } onBack: {
                    selectedResult = nil
                }
            } else {
                List(results) { result in
                    Button { selectedResult = result } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(result.name).font(.subheadline.weight(.medium)).foregroundStyle(.primary)
                            HStack(spacing: 8) {
                                Text("\(Int(result.kcal_per_100g)) kcal")
                                Text("P \(result.protein_g_per_100g, specifier: "%.1f")g")
                                Text("C \(result.carbs_g_per_100g, specifier: "%.1f")g")
                                Text("F \(result.fat_g_per_100g, specifier: "%.1f")g")
                            }
                            .font(.caption).foregroundStyle(.secondary)
                            if let b = result.brandOwner {
                                Text(b).font(.caption2).foregroundStyle(.tertiary)
                            }
                        }
                    }
                }
                .listStyle(.plain)

                if results.isEmpty && !searchQuery.isEmpty && !isSearching {
                    ContentUnavailableView("No results", systemImage: "magnifyingglass",
                                          description: Text("Try a different search or use Manual entry"))
                }
            }
        }
    }

    @ViewBuilder
    private var manualForm: some View {
        Form {
            Section("Food") { TextField("Name", text: $manualName) }
            Section("Amount") {
                HStack {
                    TextField("Quantity", text: $manualQuantity).keyboardType(.decimalPad).frame(width: 80)
                    TextField("Unit", text: $manualUnit)
                }
            }
            Section("Macros") {
                LabeledContent("Calories (kcal)") { TextField("0", text: $manualKcal).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                LabeledContent("Protein (g)") { TextField("0", text: $manualProtein).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                LabeledContent("Carbs (g)") { TextField("0", text: $manualCarbs).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                LabeledContent("Fat (g)") { TextField("0", text: $manualFat).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
            }
            Section {
                Button("Add to \(meal.label)") { addManual() }
                    .frame(maxWidth: .infinity).foregroundStyle(.green).disabled(manualName.isEmpty)
            }
        }
    }

    @ViewBuilder
    private var aiForm: some View {
        Form {
            Section {
                TextField("Describe the food (e.g. 2 scrambled eggs with butter)", text: $aiDescription)
                    .textInputAutocapitalization(.sentences)
            } header: {
                Text("Food Description")
            } footer: {
                Text("Describe what you ate and we'll look up the macros from USDA.")
            }

            Section("Amount") {
                HStack {
                    TextField("Quantity", text: $aiQuantity).keyboardType(.decimalPad).frame(width: 80)
                    TextField("Unit (e.g. g, oz, serving)", text: $aiUnit)
                }
            }

            if let estimate = aiEstimate {
                Section("Estimated Nutrition") {
                    LabeledContent("Matched as") { Text(estimate.matchedName).foregroundStyle(.secondary).font(.caption) }
                    LabeledContent("Calories") { Text("\(estimate.kcal) kcal") }
                    LabeledContent("Protein")  { Text("\(estimate.protein_g, specifier: "%.1f") g") }
                    LabeledContent("Carbs")    { Text("\(estimate.carbs_g, specifier: "%.1f") g") }
                    LabeledContent("Fat")      { Text("\(estimate.fat_g, specifier: "%.1f") g") }
                    LabeledContent("Source")   { Text(estimate.sourceLabel).font(.caption).foregroundStyle(.secondary) }
                }

                Section {
                    Button("Add to \(meal.label)") {
                        let item = FoodLogItem(
                            name: estimate.name,
                            quantity: Double(aiQuantity) ?? 1,
                            unit: aiUnit,
                            kcal: Double(estimate.kcal),
                            protein_g: estimate.protein_g,
                            carbs_g: estimate.carbs_g,
                            fat_g: estimate.fat_g,
                            source: .usda
                        )
                        onAdd(item)
                        dismiss()
                    }
                    .frame(maxWidth: .infinity)
                    .foregroundStyle(.green)
                }
            }

            if let error = aiError {
                Section {
                    Text(error).foregroundStyle(.red).font(.caption)
                }
            }

            Section {
                Button {
                    Task { await estimateFood() }
                } label: {
                    HStack {
                        Spacer()
                        if isEstimating {
                            ProgressView().scaleEffect(0.85)
                        } else {
                            Label("Look Up Macros", systemImage: "wand.and.stars")
                        }
                        Spacer()
                    }
                }
                .foregroundStyle(.green)
                .disabled(aiDescription.trimmingCharacters(in: .whitespaces).isEmpty || isEstimating)
            }
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func estimateFood() async {
        isEstimating = true
        aiError = nil
        aiEstimate = nil
        let qty = Double(aiQuantity) ?? 1
        do {
            aiEstimate = try await api.estimateFood(
                name: aiDescription.trimmingCharacters(in: .whitespaces),
                quantity: qty,
                unit: aiUnit.trimmingCharacters(in: .whitespaces).isEmpty ? "serving" : aiUnit
            )
            if aiEstimate == nil { aiError = "No nutrition data found. Try rephrasing or use Manual entry." }
        } catch {
            aiError = error.localizedDescription
        }
        isEstimating = false
    }

    private func scheduleSearch(_ query: String) {
        searchTask?.cancel()
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else { results = []; return }
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            await MainActor.run { isSearching = true }
            let found = (try? await api.searchFood(query: query)) ?? []
            await MainActor.run { results = found; isSearching = false }
        }
    }

    private func addManual() {
        let item = FoodLogItem(name: manualName, quantity: Double(manualQuantity) ?? 1, unit: manualUnit,
                               kcal: Double(manualKcal) ?? 0, protein_g: Double(manualProtein) ?? 0,
                               carbs_g: Double(manualCarbs) ?? 0, fat_g: Double(manualFat) ?? 0, source: .manual)
        onAdd(item)
        dismiss()
    }
}
