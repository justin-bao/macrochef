import SwiftUI
import PhotosUI

// MARK: - Main search/log sheet

struct AddFoodSearchView: View {
    let meal: MealType
    let api: APIClient
    let onAdd: (FoodLogItem) -> Void

    @Environment(\.dismiss) private var dismiss

    enum Tab { case search, text, photo, label, manual }
    @State private var activeTab: Tab = .search

    // Context strip state
    @State private var contextSetting: String? = nil    // "homemade" | "restaurant" | "packaged"
    @State private var contextNotes: String = ""

    // Search tab
    @State private var searchQuery = ""
    @State private var searchResults: [FoodSearchResult] = []
    @State private var isSearching = false
    @State private var selectedResult: FoodSearchResult?
    @State private var searchTask: Task<Void, Never>?

    // Text (AI) tab
    @State private var textDescription = ""
    @State private var textStatus: String? = nil
    @State private var textError: String? = nil

    // Photo / Label tabs
    @State private var photoPickerItem: PhotosPickerItem? = nil
    @State private var labelPickerItem: PhotosPickerItem? = nil
    @State private var photoStatus: String? = nil
    @State private var labelStatus: String? = nil
    @State private var photoError: String? = nil
    @State private var labelError: String? = nil
    @State private var showCameraForPhoto = false
    @State private var showCameraForLabel = false
    @State private var capturedImageForPhoto: UIImage? = nil
    @State private var capturedImageForLabel: UIImage? = nil

    // Shared: multi-item review
    @State private var reviewItems: [EditableAIItem] = []
    @State private var showReview = false

    // Manual tab
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
                // ── Context strip ──────────────────────────────────────────
                if activeTab == .text || activeTab == .photo || activeTab == .label {
                    contextStrip
                        .padding(.horizontal)
                        .padding(.top, 8)
                }

                // ── Tab picker ─────────────────────────────────────────────
                Picker("Mode", selection: $activeTab) {
                    Image(systemName: "magnifyingglass").tag(Tab.search)
                    Image(systemName: "sparkles").tag(Tab.text)
                    Image(systemName: "camera").tag(Tab.photo)
                    Image(systemName: "doc.text.viewfinder").tag(Tab.label)
                    Image(systemName: "pencil").tag(Tab.manual)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.vertical, 8)

                Divider()

                // ── Tab content ────────────────────────────────────────────
                switch activeTab {
                case .search:  searchContent
                case .text:    textContent
                case .photo:   imageContent(mode: .photo)
                case .label:   imageContent(mode: .label)
                case .manual:  manualContent
                }
            }
            .navigationTitle("Add to \(meal.label)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .sheet(isPresented: $showReview) {
                AIReviewView(
                    items: $reviewItems,
                    meal: meal,
                    onAdd: { items in
                        items.forEach { onAdd($0.toFoodLogItem()) }
                        dismiss()
                    }
                )
            }
            .sheet(isPresented: $showCameraForPhoto) {
                CameraPicker { img in
                    capturedImageForPhoto = img
                    showCameraForPhoto = false
                    if let img { Task { await processImage(img, mode: "meal_photo") } }
                }
            }
            .sheet(isPresented: $showCameraForLabel) {
                CameraPicker { img in
                    capturedImageForLabel = img
                    showCameraForLabel = false
                    if let img { Task { await processImage(img, mode: "nutrition_label") } }
                }
            }
        }
    }

    // MARK: - Context strip

    @ViewBuilder
    private var contextStrip: some View {
        VStack(spacing: 6) {
            HStack(spacing: 6) {
                ForEach(["homemade", "restaurant", "packaged"], id: \.self) { s in
                    Button {
                        contextSetting = contextSetting == s ? nil : s
                    } label: {
                        Text(s.capitalized)
                            .font(.caption.weight(.medium))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(contextSetting == s ? Color.green : Color(.systemGray5),
                                        in: Capsule())
                            .foregroundStyle(contextSetting == s ? .white : .primary)
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }
            TextField("Notes (e.g. grilled, extra sauce)", text: $contextNotes)
                .font(.caption)
                .padding(8)
                .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 8))
        }
    }

    private var currentContext: FoodContext? {
        guard contextSetting != nil || !contextNotes.isEmpty else { return nil }
        return FoodContext(setting: contextSetting, notes: contextNotes.isEmpty ? nil : contextNotes)
    }

    // MARK: - Search tab

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
                } onBack: { selectedResult = nil }
            } else {
                List(searchResults) { result in
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

                if searchResults.isEmpty && !searchQuery.isEmpty && !isSearching {
                    ContentUnavailableView("No results", systemImage: "magnifyingglass",
                                          description: Text("Try the Text tab to describe your meal"))
                }
            }
        }
    }

    private func scheduleSearch(_ query: String) {
        searchTask?.cancel()
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else { searchResults = []; return }
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            await MainActor.run { isSearching = true }
            let found = (try? await api.searchFood(query: query)) ?? []
            await MainActor.run { searchResults = found; isSearching = false }
        }
    }

    // MARK: - Text (AI) tab

    @ViewBuilder
    private var textContent: some View {
        Form {
            Section {
                TextField("8 oz chicken breast, 1 cup rice, broccoli", text: $textDescription, axis: .vertical)
                    .lineLimit(3...6)
                    .textInputAutocapitalization(.sentences)
            } header: {
                Text("Describe your meal")
            } footer: {
                Text("AI identifies ingredients and looks each one up in USDA/Open Food Facts.")
            }

            if let err = textError {
                Section { Text(err).foregroundStyle(.red).font(.caption) }
            }

            Section {
                Button {
                    Task { await estimateText() }
                } label: {
                    HStack {
                        Spacer()
                        if let status = textStatus {
                            Label(status, systemImage: "hourglass").foregroundStyle(.secondary)
                        } else {
                            Label("Estimate Macros", systemImage: "sparkles").foregroundStyle(.green)
                        }
                        Spacer()
                    }
                }
                .disabled(textDescription.trimmingCharacters(in: .whitespaces).isEmpty || textStatus != nil)
            }
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func estimateText() async {
        textError = nil
        textStatus = "Identifying ingredients…"
        defer { textStatus = nil }
        do {
            let response = try await api.estimateAI(
                description: textDescription.trimmingCharacters(in: .whitespaces),
                context: currentContext
            )
            if let err = response.error, response.items.isEmpty {
                textError = err
                return
            }
            reviewItems = response.items.map { EditableAIItem(from: $0) }
            showReview = true
        } catch {
            textError = error.localizedDescription
        }
    }

    // MARK: - Photo / Label tabs

    enum ImageMode { case photo, label }

    @ViewBuilder
    private func imageContent(mode: ImageMode) -> some View {
        let isPhoto = mode == .photo
        let status = isPhoto ? photoStatus : labelStatus
        let errorMsg = isPhoto ? photoError : labelError
        let modeString = isPhoto ? "meal_photo" : "nutrition_label"
        let pickerBinding = isPhoto ? $photoPickerItem : $labelPickerItem
        let cameraBinding = isPhoto ? $showCameraForPhoto : $showCameraForLabel
        let icon = isPhoto ? "camera.fill" : "doc.text.viewfinder"
        let hint = isPhoto
            ? "Upload a meal photo — AI identifies the dish and estimates each ingredient."
            : "Upload a nutrition facts label — AI reads the serving size and per-serving macros."

        ScrollView {
            VStack(spacing: 16) {
                // Source buttons
                HStack(spacing: 12) {
                    PhotosPicker(selection: pickerBinding, matching: .images) {
                        Label("Photo Library", systemImage: "photo.on.rectangle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .onChange(of: isPhoto ? photoPickerItem : labelPickerItem) { _, item in
                        guard let item else { return }
                        Task { await loadPickerItem(item, mode: modeString) }
                    }

                    Button {
                        if isPhoto { showCameraForPhoto = true }
                        else { showCameraForLabel = true }
                    } label: {
                        Label("Camera", systemImage: "camera")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                .padding(.horizontal)

                // Hint
                Label(hint, systemImage: icon)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)

                // Status / error
                if let s = status {
                    HStack(spacing: 8) {
                        ProgressView().scaleEffect(0.8)
                        Text(s).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                if let e = errorMsg {
                    Text(e).font(.caption).foregroundStyle(.red).padding(.horizontal)
                }
            }
            .padding(.vertical, 24)
        }
    }

    private func loadPickerItem(_ item: PhotosPickerItem, mode: String) async {
        let isPhoto = mode == "meal_photo"
        if isPhoto { photoError = nil; photoStatus = "Loading image…" }
        else { labelError = nil; labelStatus = "Loading image…" }
        defer { if isPhoto { photoStatus = nil } else { labelStatus = nil } }

        guard let data = try? await item.loadTransferable(type: Data.self),
              let uiImage = UIImage(data: data) else {
            let msg = "Could not load image."
            if isPhoto { photoError = msg } else { labelError = msg }
            return
        }
        await processImage(uiImage, mode: mode)
    }

    private func processImage(_ image: UIImage, mode: String) async {
        let isPhoto = mode == "meal_photo"
        if isPhoto { photoError = nil; photoStatus = "Analyzing image…" }
        else { labelError = nil; labelStatus = "Reading label…" }
        defer { if isPhoto { photoStatus = nil } else { labelStatus = nil } }

        guard let jpegData = image.jpegData(compressionQuality: 0.7) else {
            let msg = "Could not compress image."
            if isPhoto { photoError = msg } else { labelError = msg }
            return
        }
        let base64 = jpegData.base64EncodedString()
        let dataUrl = "data:image/jpeg;base64,\(base64)"

        do {
            let response = try await api.estimateImage(
                imageDataUrl: dataUrl,
                mode: mode,
                context: currentContext
            )
            if let err = response.error, response.items.isEmpty {
                if isPhoto { photoError = err } else { labelError = err }
                return
            }
            reviewItems = response.items.map { EditableAIItem(from: $0) }
            showReview = true
        } catch {
            let msg = error.localizedDescription
            if isPhoto { photoError = msg } else { labelError = msg }
        }
    }

    // MARK: - Manual tab

    @ViewBuilder
    private var manualContent: some View {
        Form {
            Section("Food") { TextField("Name", text: $manualName) }
            Section("Amount") {
                HStack {
                    TextField("Quantity", text: $manualQuantity).keyboardType(.decimalPad).frame(width: 80)
                    TextField("Unit", text: $manualUnit)
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
                Button("Add to \(meal.label)") { addManual() }
                    .frame(maxWidth: .infinity).foregroundStyle(.green).disabled(manualName.isEmpty)
            }
        }
    }

    private func addManual() {
        let item = FoodLogItem(
            name: manualName, quantity: Double(manualQuantity) ?? 1, unit: manualUnit,
            kcal: Double(manualKcal) ?? 0, protein_g: Double(manualProtein) ?? 0,
            carbs_g: Double(manualCarbs) ?? 0, fat_g: Double(manualFat) ?? 0, source: .manual
        )
        onAdd(item)
        dismiss()
    }
}

// MARK: - Multi-item review sheet

struct AIReviewView: View {
    @Binding var items: [EditableAIItem]
    let meal: MealType
    let onAdd: ([EditableAIItem]) -> Void

    @Environment(\.dismiss) private var dismiss

    private var totalKcal: Int {
        items.compactMap { Double($0.kcalText) }.reduce(0) { Int($0) + Int($1) }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Review the macros before adding. All fields are editable.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                ForEach($items) { $item in
                    Section {
                        TextField("Name", text: $item.name)
                            .font(.subheadline.weight(.medium))
                        HStack {
                            TextField("Qty", text: $item.quantityText)
                                .keyboardType(.decimalPad)
                                .frame(width: 60)
                            TextField("Unit", text: $item.unit)
                        }
                        .font(.subheadline)

                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()),
                                            GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                            macroField("Kcal", text: $item.kcalText, color: .primary)
                            macroField("Protein", text: $item.proteinText, color: .blue)
                            macroField("Carbs", text: $item.carbsText, color: .orange)
                            macroField("Fat", text: $item.fatText, color: .yellow)
                        }

                        if let note = item.note {
                            Text(note)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        // Confidence badge
                        HStack {
                            confidenceBadge(item.confidence)
                            Spacer()
                        }
                    }
                }
                .onDelete { offsets in items.remove(atOffsets: offsets) }

                Section {
                    Button {
                        onAdd(items)
                    } label: {
                        HStack {
                            Spacer()
                            Text("Add \(items.count) item\(items.count == 1 ? "" : "s") · \(totalKcal) kcal")
                                .fontWeight(.semibold)
                            Spacer()
                        }
                    }
                    .foregroundStyle(.green)
                    .disabled(items.isEmpty)
                }
            }
            .navigationTitle("Review Items")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Back") { dismiss() }
                }
            }
        }
    }

    @ViewBuilder
    private func macroField(_ label: String, text: Binding<String>, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.caption2).foregroundStyle(color)
            TextField("0", text: text)
                .keyboardType(.decimalPad)
                .font(.caption)
                .padding(6)
                .background(Color(.systemGray6), in: RoundedRectangle(cornerRadius: 6))
        }
    }

    @ViewBuilder
    private func confidenceBadge(_ confidence: String) -> some View {
        let (label, color): (String, Color) = switch confidence {
        case "high":   ("High confidence", .green)
        case "medium": ("Medium confidence", .orange)
        default:       ("Low confidence — review carefully", .red)
        }
        Label(label, systemImage: confidence == "high" ? "checkmark.circle" : "exclamationmark.circle")
            .font(.caption2)
            .foregroundStyle(color)
    }
}

// MARK: - Serving picker (unchanged)

struct ServingPickerView: View {
    let food: FoodSearchResult
    let onAdd: (FoodLogItem) -> Void
    let onBack: () -> Void

    @State private var gramsText = "100"
    private var grams: Double { Double(gramsText) ?? 100 }

    private var preview: Macros {
        let f = grams / 100
        return Macros(kcal: food.kcal_per_100g * f, protein_g: food.protein_g_per_100g * f,
                      carbs_g: food.carbs_g_per_100g * f, fat_g: food.fat_g_per_100g * f)
    }

    var body: some View {
        VStack(spacing: 0) {
            Button(action: onBack) {
                HStack {
                    Image(systemName: "chevron.left")
                    Text("Back to results")
                }
                .font(.subheadline).foregroundStyle(.green)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
            }
            VStack(alignment: .leading, spacing: 8) {
                Text(food.name).font(.headline)
                if let brand = food.brandOwner { Text(brand).font(.caption).foregroundStyle(.secondary) }
            }
            .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal)

            Form {
                Section("Serving size") {
                    HStack {
                        TextField("Grams", text: $gramsText).keyboardType(.decimalPad)
                        Text("g").foregroundStyle(.secondary)
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
                        onAdd(food.toFoodLogItem(quantity: grams, unit: "g", grams: grams))
                    }
                    .frame(maxWidth: .infinity).foregroundStyle(.green)
                }
            }
        }
    }
}

// MARK: - Camera picker wrapper

struct CameraPicker: UIViewControllerRepresentable {
    let onCapture: (UIImage?) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onCapture: onCapture) }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = UIImagePickerController.isSourceTypeAvailable(.camera) ? .camera : .photoLibrary
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onCapture: (UIImage?) -> Void
        init(onCapture: @escaping (UIImage?) -> Void) { self.onCapture = onCapture }

        func imagePickerController(_ picker: UIImagePickerController,
                                   didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            picker.dismiss(animated: true)
            onCapture(info[.editedImage] as? UIImage ?? info[.originalImage] as? UIImage)
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            picker.dismiss(animated: true)
            onCapture(nil)
        }
    }
}
