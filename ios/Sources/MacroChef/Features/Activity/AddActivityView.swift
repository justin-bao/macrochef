import SwiftUI

struct AddActivityView: View {
    let onAdd: (ActivityLogItem) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var kind: ActivityKind = .run
    @State private var name = ""
    @State private var durationText = "30"
    @State private var caloriesText = ""
    @State private var distanceText = ""
    @State private var distanceUnit = "mi"
    @State private var intensity: String = "moderate"
    @State private var notes = ""

    private var estimatedCalories: Double {
        let mins = Double(durationText) ?? 30
        let base: Double
        switch kind {
        case .run: base = 10
        case .walk: base = 4
        case .bike: base = 8
        case .stairmaster: base = 9
        case .strength, .gym: base = 5
        case .other: base = 5
        }
        let multiplier: Double = switch intensity {
        case "low": 0.7
        case "high": 1.4
        case "vigorous": 1.8
        default: 1.0
        }
        return (base * multiplier * mins).rounded()
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Activity") {
                    Picker("Type", selection: $kind) {
                        ForEach(ActivityKind.allCases, id: \.self) { k in
                            Label(k.label, systemImage: k.systemImage).tag(k)
                        }
                    }
                    TextField("Name (optional)", text: $name)
                }

                Section("Details") {
                    HStack {
                        TextField("Duration", text: $durationText)
                            .keyboardType(.numberPad)
                            .frame(width: 80)
                        Text("minutes")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        TextField("Distance (optional)", text: $distanceText)
                            .keyboardType(.decimalPad)
                        Picker("", selection: $distanceUnit) {
                            Text("mi").tag("mi")
                            Text("km").tag("km")
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 100)
                    }

                    Picker("Intensity", selection: $intensity) {
                        Text("Low").tag("low")
                        Text("Moderate").tag("moderate")
                        Text("High").tag("high")
                        Text("Vigorous").tag("vigorous")
                    }
                }

                Section {
                    HStack {
                        Text("Calories burned")
                        Spacer()
                        TextField("Estimated", text: $caloriesText)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .foregroundStyle(.primary)
                    }
                    Button("Use estimate (\(Int(estimatedCalories)) kcal)") {
                        caloriesText = "\(Int(estimatedCalories))"
                    }
                    .font(.subheadline)
                    .foregroundStyle(.green)
                } header: {
                    Text("Calories")
                } footer: {
                    Text("Estimate based on \(kind.label.lowercased()) at \(intensity) intensity for \(durationText) min.")
                        .font(.caption)
                }

                Section("Notes") {
                    TextField("Optional notes", text: $notes, axis: .vertical)
                        .lineLimit(3)
                }

                Section {
                    Button("Log Activity") { addActivity() }
                        .frame(maxWidth: .infinity)
                        .foregroundStyle(.green)
                        .disabled((Double(durationText) ?? 0) <= 0)
                }
            }
            .navigationTitle("Log Activity")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func addActivity() {
        let duration = Double(durationText) ?? 30
        let calories = Double(caloriesText) ?? estimatedCalories
        let displayName = name.isEmpty ? kind.label : name
        let item = ActivityLogItem(
            kind: kind,
            name: displayName,
            durationMin: duration,
            caloriesBurned: calories,
            intensity: intensity,
            distance: Double(distanceText),
            distanceUnit: distanceText.isEmpty ? nil : distanceUnit,
            notes: notes.isEmpty ? nil : notes
        )
        onAdd(item)
        dismiss()
    }
}
