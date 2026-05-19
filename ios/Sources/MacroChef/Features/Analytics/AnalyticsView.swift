import SwiftUI
import Charts

struct AnalyticsView: View {
    @Environment(TrackingStore.self) private var store
    @State private var trendRange = 7
    @State private var selectedDate: Date = .now

    // MARK: - Trend data

    private var weeklyData: [(date: Date, kcal: Double)] {
        store.weeklyCalories(endingOn: .now)
    }

    private var avgMacros: Macros { store.averageMacros(days: trendRange) }
    private var target: Macros   { store.settings.targetMacros }

    // MARK: - Daily data

    private var day: TrackingDay { store.day(for: selectedDate) }

    private var allItems: [FoodLogItem] {
        day.meals.flatMap(\.items)
    }

    private func mealMacros(_ mealType: MealType) -> Macros {
        day.meals.first(where: { $0.type == mealType })?.items.reduce(.zero, { $0 + $1.macros }) ?? .zero
    }

    /// Total macros per meal for distribution chart.
    private var mealTotals: [(meal: MealType, macros: Macros)] {
        MealType.allCases.compactMap { type in
            let m = mealMacros(type)
            return m.kcal > 0 ? (type, m) : nil
        }
    }

    /// Items bucketed by hour for timing chart.
    private var hourlyKcal: [(hour: Int, kcal: Double)] {
        var buckets: [Int: Double] = [:]
        for item in allItems {
            let hour = ISO8601DateFormatter().date(from: item.loggedAt).map {
                Calendar.current.component(.hour, from: $0)
            } ?? 12
            buckets[hour, default: 0] += item.kcal
        }
        guard !buckets.isEmpty else { return [] }
        let minH = buckets.keys.min()!
        let maxH = buckets.keys.max()!
        return ((max(0, minH - 1))...(min(23, maxH + 1))).map { h in
            (h, buckets[h] ?? 0)
        }
    }

    /// Cumulative kcal % of food budget through the day.
    private var cumulativeProgress: [(time: String, pct: Double)] {
        let settings = store.settings
        let burnBreakdown = CalorieModel.breakdown(
            healthMiles: day.healthKitDistanceMi ?? 0,
            activities: day.activities,
            settings: settings
        )
        let budget = burnBreakdown.projected + settings.dailyCalorieTarget
        guard budget > 0 else { return [] }

        let fmt = ISO8601DateFormatter()
        let sorted = allItems.sorted {
            (fmt.date(from: $0.loggedAt) ?? .distantPast) <
            (fmt.date(from: $1.loggedAt) ?? .distantPast)
        }

        var cum = 0.0
        let cal = Calendar.current
        return sorted.map { item in
            cum += item.kcal
            let d = fmt.date(from: item.loggedAt) ?? Date()
            let h = cal.component(.hour, from: d)
            let m = cal.component(.minute, from: d)
            let label = h == 0 ? "12am"
                : h < 12 ? "\(h)am"
                : h == 12 ? "12pm"
                : "\(h - 12)pm"
            let timeStr = m > 0 ? "\(label):\(String(format: "%02d", m))" : label
            return (timeStr, min(150, cum / budget * 100))
        }
    }

    private var isToday: Bool {
        Calendar.current.isDateInToday(selectedDate)
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {

                    // ── Trend range picker ────────────────────────────────
                    Picker("Range", selection: $trendRange) {
                        Text("7 days").tag(7)
                        Text("14 days").tag(14)
                        Text("30 days").tag(30)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    // ── Calorie trend bar chart ───────────────────────────
                    calorieChart

                    // ── Avg macros vs goal ────────────────────────────────
                    macroComparisonCard

                    // ── Macro distribution donut ──────────────────────────
                    macroDistributionCard

                    // ── Summary stats ─────────────────────────────────────
                    summaryStatsCard

                    Divider().padding(.horizontal)

                    // ── Daily detail header ───────────────────────────────
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Daily Detail")
                            .font(.headline)
                            .padding(.horizontal)

                        // Date strip
                        HStack(spacing: 0) {
                            Button {
                                selectedDate = Calendar.current.date(byAdding: .day, value: -1, to: selectedDate)!
                            } label: {
                                Image(systemName: "chevron.left")
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                            }

                            Spacer()
                            Text(isToday ? "Today" : selectedDate.formatted(date: .abbreviated, time: .omitted))
                                .font(.subheadline.weight(.medium))
                            Spacer()

                            if !isToday {
                                Button {
                                    selectedDate = Calendar.current.date(byAdding: .day, value: 1, to: selectedDate)!
                                } label: {
                                    Image(systemName: "chevron.right")
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                }
                            } else {
                                Color.clear
                                    .frame(width: 44, height: 36)
                            }
                        }
                        .foregroundStyle(Color.brand)
                    }

                    if allItems.isEmpty {
                        Text("No food logged for this day")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 24)
                            .background(.background, in: RoundedRectangle(cornerRadius: 16))
                            .padding(.horizontal)
                    } else {
                        // ── Per-meal macro distribution ───────────────────
                        dailyMealDistributionCard

                        // ── Hourly timing chart ───────────────────────────
                        dailyTimingCard

                        // ── Cumulative progress ───────────────────────────
                        dailyCumulativeCard
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Analytics")
        }
    }

    // MARK: - Trend charts (multi-day)

    @ViewBuilder
    private var calorieChart: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Calorie Trend")
                .font(.headline)
                .padding(.horizontal)

            Chart(weeklyData, id: \.date) { point in
                BarMark(
                    x: .value("Date", point.date, unit: .day),
                    y: .value("kcal", point.kcal)
                )
                .foregroundStyle(Color.brand.gradient)
                .cornerRadius(4)

                RuleMark(y: .value("Goal", target.kcal))
                    .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4]))
                    .foregroundStyle(.orange.opacity(0.8))
                    .annotation(position: .trailing, alignment: .center) {
                        Text("Goal")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .day)) { _ in
                    AxisValueLabel(format: .dateTime.weekday(.abbreviated))
                }
            }
            .chartYAxis {
                AxisMarks { value in
                    AxisValueLabel {
                        if let v = value.as(Double.self) {
                            Text("\(Int(v / 1000))k").font(.caption2)
                        }
                    }
                }
            }
            .frame(height: 200)
            .padding(.horizontal)
        }
        .padding(.vertical, 16)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
        .padding(.horizontal)
    }

    @ViewBuilder
    private var macroComparisonCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Avg vs Goal (\(trendRange)d)")
                .font(.headline)

            ForEach([
                ("Protein", avgMacros.protein_g, target.protein_g, Color.blue),
                ("Carbs",   avgMacros.carbs_g,   target.carbs_g,   Color.orange),
                ("Fat",     avgMacros.fat_g,     target.fat_g,     Color.yellow),
                ("Calories",avgMacros.kcal,      target.kcal,      Color.brand),
            ], id: \.0) { label, avg, goal, color in
                VStack(spacing: 4) {
                    HStack {
                        Text(label).font(.subheadline)
                        Spacer()
                        Text(label == "Calories"
                             ? "\(Int(avg)) / \(Int(goal)) kcal"
                             : "\(Int(avg)) / \(Int(goal))g")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4).fill(.quaternary).frame(height: 8)
                            RoundedRectangle(cornerRadius: 4)
                                .fill(color.gradient)
                                .frame(width: min(geo.size.width,
                                                  geo.size.width * (avg / max(1, goal))),
                                       height: 8)
                        }
                    }
                    .frame(height: 8)
                }
            }
        }
        .padding(16)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
        .padding(.horizontal)
    }

    @ViewBuilder
    private var macroDistributionCard: some View {
        let total = avgMacros.protein_g * 4 + avgMacros.carbs_g * 4 + avgMacros.fat_g * 9
        let segments: [(String, Double, Color)] = total > 0 ? [
            ("Protein", avgMacros.protein_g * 4 / total * 100, .blue),
            ("Carbs",   avgMacros.carbs_g   * 4 / total * 100, .orange),
            ("Fat",     avgMacros.fat_g     * 9 / total * 100, .yellow),
        ] : []

        VStack(alignment: .leading, spacing: 12) {
            Text("Macro Distribution")
                .font(.headline)

            if total > 0 {
                HStack(spacing: 24) {
                    Chart(segments, id: \.0) { seg in
                        SectorMark(angle: .value("pct", seg.1), innerRadius: .ratio(0.5))
                            .foregroundStyle(seg.2)
                    }
                    .frame(width: 120, height: 120)

                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(segments, id: \.0) { seg in
                            HStack(spacing: 8) {
                                Circle().fill(seg.2).frame(width: 10, height: 10)
                                Text(seg.0).font(.subheadline)
                                Spacer()
                                Text("\(Int(seg.1))%")
                                    .font(.subheadline.monospacedDigit())
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            } else {
                Text("No data for this period")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
        .padding(.horizontal)
    }

    @ViewBuilder
    private var summaryStatsCard: some View {
        let data   = weeklyData
        let logged = data.filter { $0.kcal > 0 }.count
        let best   = data.max(by: { $0.kcal < $1.kcal })
        let avg    = data.isEmpty ? 0.0 : data.reduce(0) { $0 + $1.kcal } / Double(max(1, data.count))

        VStack(alignment: .leading, spacing: 12) {
            Text("7-Day Summary")
                .font(.headline)

            HStack(spacing: 0) {
                statCell(label: "Days logged",  value: "\(logged)")
                Divider().frame(height: 40)
                statCell(label: "Avg calories", value: "\(Int(avg))")
                Divider().frame(height: 40)
                statCell(label: "Best day",     value: best.map { "\(Int($0.kcal))" } ?? "—")
            }
            .frame(maxWidth: .infinity)
        }
        .padding(16)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
        .padding(.horizontal)
    }

    @ViewBuilder
    private func statCell(label: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(value).font(.title3.weight(.bold).monospacedDigit())
            Text(label).font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Daily charts

    @ViewBuilder
    private var dailyMealDistributionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Macros by Meal")
                .font(.headline)

            let totalKcal = mealTotals.reduce(0) { $0 + $1.macros.kcal }

            Chart {
                ForEach(mealTotals, id: \.meal) { entry in
                    BarMark(
                        x: .value("Calories", entry.macros.kcal),
                        y: .value("Meal", entry.meal.label)
                    )
                    .foregroundStyle(by: .value("Meal", entry.meal.label))
                    .cornerRadius(4)
                    .annotation(position: .trailing) {
                        if totalKcal > 0 {
                            Text("\(Int(entry.macros.kcal / totalKcal * 100))%")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .chartForegroundStyleScale([
                "Breakfast": Color.brand,
                "Lunch":     Color.blue,
                "Dinner":    Color.orange,
                "Snacks":    Color.purple,
            ])
            .chartXAxis { AxisMarks { v in AxisValueLabel { if let c = v.as(Double.self) { Text("\(Int(c))").font(.caption2) } } } }
            .frame(height: CGFloat(max(2, mealTotals.count)) * 52)

            // Macro detail rows
            ForEach(mealTotals, id: \.meal) { entry in
                HStack {
                    Text(entry.meal.label)
                        .font(.subheadline)
                    Spacer()
                    HStack(spacing: 10) {
                        macroChip("\(Int(entry.macros.protein_g))g P", color: .blue)
                        macroChip("\(Int(entry.macros.carbs_g))g C",   color: .orange)
                        macroChip("\(Int(entry.macros.fat_g))g F",     color: .yellow)
                    }
                }
            }
        }
        .padding(16)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
        .padding(.horizontal)
    }

    @ViewBuilder
    private func macroChip(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2.monospacedDigit())
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.15), in: Capsule())
            .foregroundStyle(color)
    }

    @ViewBuilder
    private var dailyTimingCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("When You Ate")
                .font(.headline)

            if hourlyKcal.isEmpty {
                Text("No timestamped entries")
                    .font(.subheadline).foregroundStyle(.secondary)
            } else {
                Chart(hourlyKcal, id: \.hour) { point in
                    BarMark(
                        x: .value("Hour", hourLabel(point.hour)),
                        y: .value("kcal", point.kcal)
                    )
                    .foregroundStyle(Color.brand.gradient)
                    .cornerRadius(3)
                }
                .chartXAxis {
                    AxisMarks { v in
                        AxisValueLabel { if let s = v.as(String.self) { Text(s).font(.caption2) } }
                    }
                }
                .frame(height: 160)
            }
        }
        .padding(16)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
        .padding(.horizontal)
    }

    @ViewBuilder
    private var dailyCumulativeCard: some View {
        let data = cumulativeProgress
        VStack(alignment: .leading, spacing: 8) {
            Text("Cumulative vs Food Budget")
                .font(.headline)

            if data.isEmpty {
                Text("No data")
                    .font(.subheadline).foregroundStyle(.secondary)
            } else {
                Chart {
                    ForEach(Array(data.enumerated()), id: \.offset) { _, point in
                        LineMark(
                            x: .value("Time", point.time),
                            y: .value("%", point.pct)
                        )
                        .foregroundStyle(Color.brand)
                        .interpolationMethod(.monotone)
                    }
                    RuleMark(y: .value("Goal", 100))
                        .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4]))
                        .foregroundStyle(.orange.opacity(0.8))
                        .annotation(position: .trailing, alignment: .center) {
                            Text("Goal").font(.caption2).foregroundStyle(.orange)
                        }
                }
                .chartYAxis {
                    AxisMarks { v in
                        AxisValueLabel {
                            if let d = v.as(Double.self) { Text("\(Int(d))%").font(.caption2) }
                        }
                    }
                }
                .frame(height: 180)
            }
        }
        .padding(16)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
        .padding(.horizontal)
    }

    // MARK: - Utilities

    private func hourLabel(_ h: Int) -> String {
        h == 0 ? "12am" : h < 12 ? "\(h)am" : h == 12 ? "12pm" : "\(h - 12)pm"
    }
}
