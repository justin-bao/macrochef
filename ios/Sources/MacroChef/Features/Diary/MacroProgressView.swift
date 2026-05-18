import SwiftUI

struct MacroProgressView: View {
    let consumed: Macros
    let target: Macros
    let burned: Double

    private var net: Double { consumed.kcal - burned }
    private var remaining: Double { target.kcal - consumed.kcal }

    var body: some View {
        VStack(spacing: 16) {
            // Calorie summary
            HStack(alignment: .top) {
                macroStat(label: "Eaten", value: consumed.kcal, unit: "kcal", color: .primary)
                Spacer()
                VStack(spacing: 2) {
                    Text(max(0, remaining).formatted(.number.precision(.fractionLength(0))))
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                    Text(remaining >= 0 ? "remaining" : "over goal")
                        .font(.caption)
                        .foregroundStyle(remaining >= 0 ? .secondary : .red)
                }
                .frame(maxWidth: .infinity)
                Spacer()
                macroStat(label: "Burned", value: burned, unit: "kcal", color: .orange)
            }

            // Calorie progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(.quaternary)
                        .frame(height: 10)
                    RoundedRectangle(cornerRadius: 6)
                        .fill(remaining >= 0 ? Color.green : Color.red)
                        .frame(width: min(geo.size.width, geo.size.width * min(1, consumed.kcal / max(1, target.kcal))), height: 10)
                }
            }
            .frame(height: 10)

            // Macronutrients
            HStack(spacing: 0) {
                macroBar(label: "Protein", consumed: consumed.protein_g, target: target.protein_g, color: .blue)
                macroBar(label: "Carbs", consumed: consumed.carbs_g, target: target.carbs_g, color: .orange)
                macroBar(label: "Fat", consumed: consumed.fat_g, target: target.fat_g, color: .yellow)
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
