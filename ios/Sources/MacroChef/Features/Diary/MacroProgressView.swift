import SwiftUI

/// Calorie and macro progress card shown at the top of the diary.
///
/// Formula:
///   foodBudget  = bmr + netCalorieGoal + activeCalories
///   remaining   = foodBudget − consumed.kcal
///
/// - `bmr`              Full-day Mifflin-St Jeor resting calories (constant).
/// - `netCalorieGoal`   User's net adjustment: 0 = maintain, −500 = deficit, +500 = surplus.
/// - `activeCalories`   Walking calories (from distance) + logged activity calories.
/// - `consumed`         Macros eaten today.
/// - `target`           Gross targets for protein / carbs / fat (kcal field is ignored here).
struct MacroProgressView: View {
    let consumed: Macros
    let target: Macros        // .protein_g / .carbs_g / .fat_g are gross targets
    let bmr: Double
    let netCalorieGoal: Double
    let activeCalories: Double

    private var foodBudget: Double { bmr + netCalorieGoal + activeCalories }
    private var remaining: Double  { foodBudget - consumed.kcal }
    private var eatPct: Double     { foodBudget > 0 ? min(1, consumed.kcal / foodBudget) : 0 }

    var body: some View {
        VStack(spacing: 16) {
            // ── Top row: Eaten · Remaining · Active ──────────────────────────
            HStack(alignment: .top) {
                macroStat(label: "Eaten", value: consumed.kcal, unit: "kcal", color: .primary)
                Spacer()
                VStack(spacing: 2) {
                    Text(abs(remaining).formatted(.number.precision(.fractionLength(0))))
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                    Text(remaining >= 0 ? "remaining" : "over goal")
                        .font(.caption)
                        .foregroundStyle(remaining >= 0 ? Color.secondary : Color.red)
                }
                .frame(maxWidth: .infinity)
                Spacer()
                macroStat(label: "Active", value: activeCalories, unit: "kcal", color: .orange)
            }

            // ── Calorie progress bar ─────────────────────────────────────────
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(.quaternary)
                        .frame(height: 10)
                    RoundedRectangle(cornerRadius: 6)
                        .fill(remaining >= 0 ? Color.green : Color.red)
                        .frame(width: geo.size.width * eatPct, height: 10)
                }
            }
            .frame(height: 10)

            // ── Budget footer ────────────────────────────────────────────────
            let goalLabel: String = {
                if netCalorieGoal == 0 { return "Maintain" }
                let sign = netCalorieGoal < 0 ? "−" : "+"
                return "\(sign)\(Int(abs(netCalorieGoal))) kcal goal"
            }()
            Text("Budget \(Int(foodBudget)) kcal · BMR \(Int(bmr)) · \(goalLabel)")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .frame(maxWidth: .infinity, alignment: .center)

            // ── Macro bars (protein / carbs / fat) ──────────────────────────
            HStack(spacing: 0) {
                macroBar(label: "Protein", consumed: consumed.protein_g, target: target.protein_g, color: .blue)
                macroBar(label: "Carbs",   consumed: consumed.carbs_g,   target: target.carbs_g,   color: .orange)
                macroBar(label: "Fat",     consumed: consumed.fat_g,     target: target.fat_g,     color: .yellow)
            }
        }
        .padding(16)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }

    @ViewBuilder
    private func macroStat(label: String, value: Double, unit: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(value.formatted(.number.precision(.fractionLength(0))))
                .font(.headline.monospacedDigit())
            Text(unit)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .foregroundStyle(color)
    }

    @ViewBuilder
    private func macroBar(label: String, consumed: Double, target: Double, color: Color) -> some View {
        VStack(spacing: 6) {
            GeometryReader { geo in
                ZStack(alignment: .bottom) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(.quaternary)
                        .frame(width: 6)
                        .frame(maxHeight: .infinity)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(color)
                        .frame(width: 6, height: geo.size.height * min(1, consumed / max(1, target)))
                }
                .frame(maxWidth: .infinity)
            }
            .frame(height: 40)

            Text("\(Int(consumed))g")
                .font(.caption.monospacedDigit())
                .fontWeight(.medium)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text("/ \(Int(target))g")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
    }
}
