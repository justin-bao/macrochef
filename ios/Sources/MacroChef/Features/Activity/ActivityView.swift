import SwiftUI

struct ActivityView: View {
    @Environment(TrackingStore.self) private var store
    @State private var selectedDate: Date = .now
    @State private var showAddActivity = false

    private var day: TrackingDay { store.day(for: selectedDate) }
    private var activities: [ActivityLogItem] { day.activities }
    private var totalBurned: Double { day.totalBurned }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    burnedCard
                }
                .listRowInsets(.init())
                .listRowBackground(Color.clear)

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
        }
    }

    @ViewBuilder
    private var burnedCard: some View {
        HStack(spacing: 0) {
            VStack(spacing: 4) {
                Text("\(Int(totalBurned))")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundStyle(.orange)
                Text("kcal burned")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)

            Divider().frame(height: 60)

            VStack(spacing: 4) {
                let food = day.totalFood.kcal
                let net = food - totalBurned
                Text("\(Int(max(0, net)))")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                Text("net kcal")
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
}
