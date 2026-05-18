import SwiftUI
import Charts

struct AnalyticsView: View {
    @Environment(TrackingStore.self) private var store
    @State private var selectedRange = 7

    private var weeklyData: [(date: Date, kcal: Double)] {
        store.weeklyCalories(endingOn: .now)
    }

    private var avgMacros: Macros {
        store.averageMacros(days: selectedRange)
    }

    private var target: Macros {
        store.settings.targetMacros
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Range picker
                    Picker("Range", selection: $selectedRange) {
                        Text("7 days").tag(7)
                        Text("14 days").tag(14)
                        Text("30 days").tag(30)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    // Calorie trend chart
                    calorieChart

                    // Average macros vs goal
                    macroComparisonCard

                    // Macro distribution donut
                    macroDistributionCard

                    // 7-day summary stats
                    summaryStatsCard
                }
                .padding(.vertical)
            }
            .navigationTitle("Analytics")
        }
    }

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
                .foregroundStyle(.green.gradient)
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
            Text("Avg vs Goal (\(selectedRange)d)")
                .font(.headline)

            ForEach([
                ("Protein", avgMacros.protein_g, target.protein_g, Color.blue),
                ("Carbs", avgMacros.carbs_g, target.carbs_g, Color.orange),
                ("Fat", avgMacros.fat_g, target.fat_g, Color.yellow),
                ("Calories", avgMacros.kcal, target.kcal, Color.green),
            ], id: \.0) { label, avg, goal, color in
                VStack(spacing: 4) {
                    HStack {
                        Text(label).font(.subheadline)
                        Spacer()
                        Text(label == "Calories" ? "\(Int(avg)) / \(Int(goal)) kcal" : "\(Int(avg)) / \(Int(goal))g")
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.secondary)
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4).fill(.quaternary).frame(height: 8)
                            RoundedRectangle(cornerRadius: 4)
                                .fill(color.gradient)
                                .frame(width: min(geo.size.width, geo.size.width * (avg / max(1, goal))), height: 8)
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
            ("Carbs", avgMacros.carbs_g * 4 / total * 100, .orange),
            ("Fat", avgMacros.fat_g * 9 / total * 100, .yellow),
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
                                Text("\(Int(seg.1))%").font(.subheadline.monospacedDigit()).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            } else {
                Text("No data for this period")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
        .padding(.horizontal)
    }

    @ViewBuilder
    private var summaryStatsCard: some View {
        let data = weeklyData
        let logged = data.filter { $0.kcal > 0 }.count
        let best = data.max(by: { $0.kcal < $1.kcal })
        let avgCalories = data.isEmpty ? 0 : data.reduce(0) { $0 + $1.kcal } / Double(max(1, data.count))

        VStack(alignment: .leading, spacing: 12) {
            Text("7-Day Summary")
                .font(.headline)

            HStack(spacing: 0) {
                statCell(label: "Days logged", value: "\(logged)")
                Divider().frame(height: 40)
                statCell(label: "Avg calories", value: "\(Int(avgCalories))")
                Divider().frame(height: 40)
                statCell(label: "Best day", value: best.map { "\(Int($0.kcal))" } ?? "—")
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
}
