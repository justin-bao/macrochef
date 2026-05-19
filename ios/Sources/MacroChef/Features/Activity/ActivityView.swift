import SwiftUI

struct ActivityView: View {
    @Environment(TrackingStore.self) private var store
    @Environment(HealthKitManager.self) private var healthKit
    @State private var selectedDate: Date = .now
    @State private var showAddActivity = false

    private var day: TrackingDay { store.day(for: selectedDate) }
    private var activities: [ActivityLogItem] { day.activities }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    burnCard
                }
                .listRowInsets(.init())
                .listRowBackground(Color.clear)

                if activities.isEmpty {
                    Section {
                        ContentUnavailableView(
                            "No activities logged",
                            systemImage: "figure.walk",
                            description: Text("Tap + to log a workout")
                        )
                        .listRowBackground(Color.clear)
                    }
                } else {
                    Section("Logged Activities") {
                        ForEach(activities) { activity in
                            activityRow(activity)
                        }
                        .onDelete { indexSet in
                            for index in indexSet {
                                store.removeActivity(id: activities[index].id, date: selectedDate)
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Activity")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { showAddActivity = true } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddActivity) {
                AddActivityView { item in store.addActivity(item, date: selectedDate) }
            }
            // Fetch health distance whenever the date changes
            .task(id: selectedDate) {
                await syncHealth(for: selectedDate)
            }
        }
    }

    // MARK: - Calorie burn card

    @ViewBuilder
    private var burnCard: some View {
        let bd = CalorieModel.breakdown(
            healthMiles: day.healthKitDistanceMi ?? 0,
            activities: activities,
            settings: store.settings
        )
        let hasHealth = day.healthKitDistanceMi != nil && healthKit.isAvailable

        VStack(spacing: 0) {
            // ── Top row: projected / net ──────────────────────────────────
            HStack(spacing: 0) {
                burnStat(
                    label: "Projected burn",
                    value: bd.projected,
                    color: .orange
                )

                Divider().frame(height: 60)

                burnStat(
                    label: day.totalFood.kcal >= bd.projected ? "over goal" : "net remaining",
                    value: max(0, bd.projected - day.totalFood.kcal),
                    color: day.totalFood.kcal > bd.projected ? .red : .green
                )
            }
            .padding(.horizontal)
            .padding(.top, 16)

            // ── Breakdown rows ────────────────────────────────────────────
            VStack(spacing: 0) {
                Divider().padding(.horizontal).padding(.top, 12)

                breakdownRow(
                    icon: "bed.double",
                    label: "BMR (resting)",
                    value: bd.bmr,
                    color: .secondary
                )

                if hasHealth {
                    breakdownRow(
                        icon: "applelogo",
                        label: "\(bd.walkingDistanceMi, specifier: "%.2f") mi walking",
                        value: bd.walkingCalories,
                        color: .pink
                    )
                }

                if bd.activityCalories > 0 {
                    breakdownRow(
                        icon: "figure.run",
                        label: "\(activities.count) activit\(activities.count == 1 ? "y" : "ies")",
                        value: bd.activityCalories,
                        color: .orange
                    )
                }

                if !hasHealth && healthKit.isAvailable {
                    HStack {
                        Image(systemName: "heart.text.square")
                            .foregroundStyle(.pink)
                            .frame(width: 24)
                        Text("Apple Health not authorized")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Button("Enable") {
                            Task { await healthKit.requestAuthorization() }
                        }
                        .font(.caption)
                        .foregroundStyle(.pink)
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }
            }
            .padding(.bottom, 12)
        }
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .padding()
    }

    @ViewBuilder
    private func burnStat(label: String, value: Double, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value.formatted(.number.precision(.fractionLength(0))))
                .font(.system(size: 38, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            Text("kcal")
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func breakdownRow(icon: String, label: String, value: Double, color: Color) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(color)
                .frame(width: 24)
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
            Text("\(Int(value)) kcal")
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(color)
        }
        .padding(.horizontal)
        .padding(.vertical, 7)
    }

    // MARK: - Activity rows

    @ViewBuilder
    private func activityRow(_ activity: ActivityLogItem) -> some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(.orange.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: activity.kind.systemImage)
                    .foregroundStyle(.orange)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(activity.name)
                    .font(.subheadline.weight(.medium))
                HStack(spacing: 8) {
                    Text("\(Int(activity.durationMin)) min")
                    if let dist = activity.distance, let unit = activity.distanceUnit {
                        Text("· \(dist, specifier: "%.1f") \(unit)")
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
            Text("\(Int(activity.caloriesBurned)) kcal")
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(.orange)
        }
    }

    // MARK: - Health sync

    private func syncHealth(for date: Date) async {
        guard healthKit.isAvailable else { return }
        if !healthKit.isAuthorized {
            await healthKit.requestAuthorization()
        }
        let miles = await healthKit.fetchDistance(for: date)
        store.setHealthKitDistance(miles: miles, date: date)
    }
}
