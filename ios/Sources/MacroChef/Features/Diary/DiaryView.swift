import SwiftUI

struct DiaryView: View {
    @Environment(TrackingStore.self) private var store
    @Environment(AuthManager.self) private var auth
    @State private var selectedDate: Date = .now
    @State private var addingToMeal: MealType?
    @State private var editingEntry: EditingEntry?
    @State private var api: APIClient?

    private var day: TrackingDay { store.day(for: selectedDate) }
    private var settings: TrackingSettings { store.settings }

    var body: some View {
        NavigationStack {
            List {
                // Date strip
                Section {
                    dateStrip
                        .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }

                // Macro progress card
                Section {
                    MacroProgressView(
                        consumed: day.totalFood,
                        target: settings.targetMacros,
                        burned: day.totalBurned
                    )
                    .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                }

                // Meal sections
                ForEach(MealType.allCases, id: \.self) { meal in
                    mealSection(meal)
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Today's Diary")
            .navigationBarTitleDisplayMode(.large)
        }
        .sheet(item: $addingToMeal) { meal in
            if let api {
                AddFoodSearchView(meal: meal, api: api) { item in
                    store.addFood(item, meal: meal, date: selectedDate)
                }
            }
        }
        .sheet(item: $editingEntry) { entry in
            EditFoodView(entry: entry) { updated in
                store.removeFood(id: entry.item.id, meal: entry.meal, date: selectedDate)
                store.addFood(updated, meal: entry.meal, date: selectedDate)
            }
        }
        .onAppear {
            api = APIClient(authManager: auth)
        }
    }

    @ViewBuilder
    private var dateStrip: some View {
        HStack(spacing: 0) {
            ForEach(-3..<1, id: \.self) { offset in
                let date = Calendar.current.date(byAdding: .day, value: offset, to: .now) ?? .now
                let isSelected = Calendar.current.isDate(date, inSameDayAs: selectedDate)
                Button {
                    selectedDate = date
                } label: {
                    VStack(spacing: 2) {
                        Text(date, format: .dateTime.weekday(.abbreviated))
                            .font(.caption2)
                            .foregroundStyle(isSelected ? .green : .secondary)
                        Text(date, format: .dateTime.day())
                            .font(.subheadline.weight(isSelected ? .bold : .regular))
                            .foregroundStyle(isSelected ? .green : .primary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(isSelected ? Color.green.opacity(0.12) : .clear,
                                in: RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding(.horizontal, 16)
    }

    @ViewBuilder
    private func mealSection(_ meal: MealType) -> some View {
        let items = day.meals.first(where: { $0.type == meal })?.items ?? []
        let total = items.reduce(Macros.zero) { $0 + $1.macros }

        Section {
            if items.isEmpty {
                Button {
                    addingToMeal = meal
                } label: {
                    HStack {
                        Image(systemName: "plus").foregroundStyle(.green)
                        Text("Add food").foregroundStyle(.secondary)
                    }
                    .font(.subheadline)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                ForEach(items) { item in
                    foodRow(item, meal: meal)
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) {
                                store.removeFood(id: item.id, meal: meal, date: selectedDate)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                        .swipeActions(edge: .leading) {
                            Button {
                                editingEntry = EditingEntry(item: item, meal: meal, date: selectedDate)
                            } label: {
                                Label("Edit", systemImage: "pencil")
                            }
                            .tint(.orange)
                        }
                }

                // Meal macro footer
                HStack(spacing: 12) {
                    macroChip("P", value: total.protein_g, unit: "g", color: .blue)
                    macroChip("C", value: total.carbs_g, unit: "g", color: .orange)
                    macroChip("F", value: total.fat_g, unit: "g", color: .yellow)
                    Spacer()
                    Button {
                        addingToMeal = meal
                    } label: {
                        Label("Add", systemImage: "plus")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.green)
                    }
                }
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
            }
        } header: {
            HStack {
                Text(meal.label).font(.headline).foregroundStyle(.primary)
                Spacer()
                if !items.isEmpty {
                    Text("\(Int(total.kcal)) kcal")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                Button {
                    addingToMeal = meal
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(.green)
                        .font(.title3)
                }
            }
            .textCase(nil)
            .padding(.bottom, 4)
        }
    }

    @ViewBuilder
    private func foodRow(_ item: FoodLogItem, meal: MealType) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                Text("\(item.quantity.formatted(.number.precision(.fractionLength(0)))) \(item.unit)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text("\(Int(item.kcal)) kcal")
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }

    @ViewBuilder
    private func macroChip(_ letter: String, value: Double, unit: String, color: Color) -> some View {
        HStack(spacing: 2) {
            Text(letter).font(.caption2.weight(.bold)).foregroundStyle(color)
            Text("\(value, specifier: "%.0f")\(unit)").font(.caption2).foregroundStyle(.secondary)
        }
    }
}

// MARK: - Edit Food Sheet

struct EditingEntry: Identifiable {
    let id = UUID()
    let item: FoodLogItem
    let meal: MealType
    let date: Date
}

struct EditFoodView: View {
    let entry: EditingEntry
    let onSave: (FoodLogItem) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var quantity: String
    @State private var unit: String
    @State private var kcal: String
    @State private var protein: String
    @State private var carbs: String
    @State private var fat: String

    init(entry: EditingEntry, onSave: @escaping (FoodLogItem) -> Void) {
        self.entry = entry
        self.onSave = onSave
        let i = entry.item
        _name     = State(initialValue: i.name)
        _quantity = State(initialValue: String(format: "%.4g", i.quantity))
        _unit     = State(initialValue: i.unit)
        _kcal     = State(initialValue: String(Int(i.kcal)))
        _protein  = State(initialValue: String(format: "%.1f", i.protein_g))
        _carbs    = State(initialValue: String(format: "%.1f", i.carbs_g))
        _fat      = State(initialValue: String(format: "%.1f", i.fat_g))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Food") {
                    TextField("Name", text: $name)
                    HStack {
                        TextField("Quantity", text: $quantity).keyboardType(.decimalPad).frame(width: 80)
                        TextField("Unit", text: $unit)
                    }
                }
                Section("Macros") {
                    LabeledContent("Calories (kcal)") {
                        TextField("0", text: $kcal).keyboardType(.numberPad).multilineTextAlignment(.trailing)
                    }
                    LabeledContent("Protein (g)") {
                        TextField("0", text: $protein).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                    }
                    LabeledContent("Carbs (g)") {
                        TextField("0", text: $carbs).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                    }
                    LabeledContent("Fat (g)") {
                        TextField("0", text: $fat).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                    }
                }
                Section {
                    Button("Save Changes") { save() }
                        .frame(maxWidth: .infinity)
                        .foregroundStyle(.green)
                        .disabled(name.isEmpty)
                }
            }
            .scrollDismissesKeyboard(.immediately)
            .navigationTitle("Edit Food")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func save() {
        let updated = FoodLogItem(
            name: name,
            quantity: Double(quantity) ?? entry.item.quantity,
            unit: unit.isEmpty ? entry.item.unit : unit,
            kcal: Double(kcal) ?? entry.item.kcal,
            protein_g: Double(protein) ?? entry.item.protein_g,
            carbs_g: Double(carbs) ?? entry.item.carbs_g,
            fat_g: Double(fat) ?? entry.item.fat_g,
            source: entry.item.source
        )
        onSave(updated)
        dismiss()
    }
}

// Make MealType identifiable for sheet(item:)
extension MealType: Identifiable {
    public var id: String { rawValue }
}
