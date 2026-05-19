import SwiftUI

struct ActivityView: View {
    @Environment(TrackingStore.self) private var store
    @Environment(HealthKitManager.self) private var healthKit
    @State private var selectedDate: Date = .now
    @State private var showAddActivity = false
    @State private var isSyncing = false

    private var day: TrackingDay { store.day(for: selectedDate) }
    private var activities: [ActivityLogItem] { day.activities }
    private var breakdown: CalorieBreakdown { getCalorieBreakdown(day: day, settings: store.settings) }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    burnCard
                }
                .listRowInsets(.init())
                .listRowBackground(Color.clear)

                Section {
                    healthRow
                }
                .listRowBackground(Color.clear)
                .listRowInsets(.init(top: 0, leading: 16, bottom: 0, trailing: 16))

                if activities.isEmpty {
                    Section {
                        ContentUnavailableView(
                            "No activities logged",
                            systemImage: "figure.walk",
                            description: Text("Tap + to log an activity")
                        )
                        .listRowBackground(Color.clear)
                    }
                } else {
                    Section("Activities") {
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
                    Button {
                        showAddActivity = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddActivity) {
                AddActivityView { item in
                    store.addActivity(item, date: selectedDate)
                }
            }
            .task(id: selectedDate) {
                await syncHealth()
            }
        }
    }

    // MARK: - Subviews

    @ViewBuilder
    private var burnCard: some View {
        HStack(spacing: 0) {
            VStack(spacing: 4) {
                Text("\(breakdown.projectedDayBurn)")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundStyle(.orange)
                Text("kcal projected")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)

            Divider().frame(height: 60)

            VStack(spacing: 4) {
                let net = day.totalFood.kcal - Double(breakdown.projectedDayBurn)
                Text("\(Int(net))")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundStyle(net >= 0 ? .primary : .orange)
                Text("kcal balance")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.vertical, 20)
        .padding(.horizontal)
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
        .padding()
    }

    @ViewBuilder
    private var healthRow: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "heart.fill")
                    .foregroundStyle(.red)
                Text("Apple Health")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                if isSyncing {
                    ProgressView().controlSize(.small)
                } else {
                    Button {
                        Task { await syncHealth() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.subheadline)
                    }
                    .buttonStyle(.borderless)
                }
            }

            if let summary = day.appleHealthSummary {
                Grid(alignment: .leading, horizontalSpacing: 24, verticalSpacing: 4) {
                    GridRow {
                        statCell("Total distance", value: "\(summary.totalDistanceMi, specifier: "%.2f") mi")
                        statCell("Walking eff.", value: "\(breakdown.effectiveWalkingDistanceMi, specifier: "%.2f") mi")
                    }
                    GridRow {
                        statCell("Walking cal", value: "+\(breakdown.walkingCalories) kcal")
                        statCell("BMR", value: "\(breakdown.bmrPerDay) kcal/day")
                    }
                }
                .font(.caption)
            } else if healthKit.isAvailable {
                Text("Syncing today's distance from Apple Health…")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                Text("Apple Health not available on this device")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private func statCell(_ title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(title).foregroundStyle(.secondary)
            Text(value).fontWeight(.medium)
        }
    }

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

    // MARK: - Actions

    private func syncHealth() async {
        guard healthKit.isAvailable else { return }
        isSyncing = true
        defer { isSyncing = false }
        if !healthKit.isAuthorized {
            await healthKit.requestAuthorization()
        }
        await store.syncAppleHealth(healthKit: healthKit, date: selectedDate)
    }
}
