import SwiftUI

struct DiaryView: View {
    @Environment(TrackingStore.self) private var store
    @Environment(AuthManager.self) private var auth
    @State private var selectedDate: Date = .now
    @State private var addingToMeal: MealType?
    @State private var api: APIClient?

    private var day: TrackingDay { store.day(for: selectedDate) }
    private var settings: TrackingSettings { store.settings }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Date picker row
                    dateStrip
                        .padding(.horizontal)

                    // Macro progress card
                    MacroProgressView(
                        consumed: day.totalFood,
                        target: settings.targetMacros,
                        burned: day.totalBurned
                    )
                    .padding(.horizontal)

                    // Meals
                    ForEach(MealType.allCases, id: \.self) { meal in
                        mealSection(meal)
                    }
                }
                .padding(.vertical)
            }
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
    }

    @ViewBuilder
    private func mealSection(_ meal: MealType) -> some View {
        let items = day.meals.first(where: { $0.type == meal })?.items ?? []
        let total = items.reduce(Macros.zero) { $0 + $1.macros }

        VStack(spacing: 0) {
            // Meal header
            HStack {
                Text(meal.label)
                    .font(.headline)
                Spacer()
                if !items.isEmpty {
                    Text("\(Int(total.kcal)) kcal")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Button {
                    addingToMeal = meal
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(.green)
                        .font(.title3)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)

            if items.isEmpty {
                Button {
                    addingToMeal = meal
                } label: {
                    HStack {
                        Image(systemName: "plus")
                        Text("Add food")
                    }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                }
                .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)
            } else {
                VStack(spacing: 0) {
                    ForEach(items) { item in
                        foodRow(item, meal: meal)
                        if item.id != items.last?.id {
                            Divider().padding(.leading)
                        }
                    }
                }
                .background(.background, in: RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)

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
                .padding(.horizontal, 20)
                .padding(.top, 8)
            }
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
        .padding(.horizontal)
        .padding(.vertical, 10)
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(role: .destructive) {
                store.removeFood(id: item.id, meal: meal, date: selectedDate)
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    @ViewBuilder
    private func macroChip(_ letter: String, value: Double, unit: String, color: Color) -> some View {
        HStack(spacing: 2) {
            Text(letter)
                .font(.caption2.weight(.bold))
                .foregroundStyle(color)
            Text("\(value, specifier: "%.0f")\(unit)")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

// Make MealType identifiable for sheet(item:)
extension MealType: Identifiable {
    public var id: String { rawValue }
}
