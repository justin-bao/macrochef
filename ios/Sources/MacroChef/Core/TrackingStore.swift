import Foundation
import Supabase

private let diaryKey = "macrochef-diary-v1"
private let settingsKey = "macrochef-settings-v1"

@MainActor
@Observable
final class TrackingStore {
    var diary: [String: TrackingDay] = [:]
    var settings: TrackingSettings = TrackingSettings()
    var isLoadingGoals: Bool = false

    private let authManager: AuthManager
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(authManager: AuthManager) {
        self.authManager = authManager
        loadLocal()
    }

    // MARK: - Date helpers

    static func key(for date: Date = .now) -> String {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: date)
    }

    func day(for date: Date = .now) -> TrackingDay {
        diary[Self.key(for: date)] ?? TrackingDay.empty()
    }

    // MARK: - Food

    func addFood(_ item: FoodLogItem, meal: MealType, date: Date = .now) {
        let key = Self.key(for: date)
        var d = diary[key] ?? TrackingDay.empty()
        if let i = d.meals.firstIndex(where: { $0.type == meal }) {
            d.meals[i].items.append(item)
        }
        diary[key] = d
        saveLocal()
    }

    func removeFood(id: String, meal: MealType, date: Date = .now) {
        let key = Self.key(for: date)
        guard var d = diary[key],
              let mi = d.meals.firstIndex(where: { $0.type == meal }) else { return }
        d.meals[mi].items.removeAll { $0.id == id }
        diary[key] = d
        saveLocal()
    }

    // MARK: - Activity

    func addActivity(_ item: ActivityLogItem, date: Date = .now) {
        let key = Self.key(for: date)
        var d = diary[key] ?? TrackingDay.empty()
        d.activities.append(item)
        diary[key] = d
        saveLocal()
    }

    func removeActivity(id: String, date: Date = .now) {
        let key = Self.key(for: date)
        guard var d = diary[key] else { return }
        d.activities.removeAll { $0.id == id }
        diary[key] = d
        saveLocal()
    }

    // MARK: - Settings / Goals

    func updateSettings(_ newSettings: TrackingSettings) {
        settings = newSettings
        saveLocal()
        Task { await syncGoalsToSupabase() }
    }

    // MARK: - Supabase sync

    func loadGoalsFromSupabase() async {
        guard let userId = authManager.user?.id else { return }
        isLoadingGoals = true
        defer { isLoadingGoals = false }

        do {
            struct GoalRow: Decodable {
                var kcal: Double?
                var protein_g: Double?
                var carbs_g: Double?
                var fat_g: Double?
            }
            let row: GoalRow? = try await authManager.supabase
                .from("macro_goals")
                .select("kcal,protein_g,carbs_g,fat_g")
                .eq("user_id", value: userId.uuidString)
                .maybeSingle()
                .execute()
                .value
            if let row {
                settings.dailyCalorieTarget = row.kcal ?? settings.dailyCalorieTarget
                settings.dailyProteinTarget = row.protein_g ?? settings.dailyProteinTarget
                settings.dailyCarbsTarget = row.carbs_g ?? settings.dailyCarbsTarget
                settings.dailyFatTarget = row.fat_g ?? settings.dailyFatTarget
                saveLocal()
            }
        } catch {
            // Local settings remain in place
        }
    }

    func syncGoalsToSupabase() async {
        guard let userId = authManager.user?.id else { return }
        do {
            let row: [String: AnyJSON] = [
                "user_id": .string(userId.uuidString),
                "kcal": .number(settings.dailyCalorieTarget),
                "protein_g": .number(settings.dailyProteinTarget),
                "carbs_g": .number(settings.dailyCarbsTarget),
                "fat_g": .number(settings.dailyFatTarget),
            ]
            try await authManager.supabase
                .from("macro_goals")
                .upsert(row, onConflict: "user_id")
                .execute()
        } catch {
            // Fail silently — local copy is the source of truth
        }
    }

    // MARK: - Analytics helpers

    func weeklyCalories(endingOn date: Date = .now) -> [(date: Date, kcal: Double)] {
        (0..<7).compactMap { offset -> (Date, Double)? in
            guard let d = Calendar.current.date(byAdding: .day, value: -offset, to: date) else { return nil }
            let key = Self.key(for: d)
            let total = diary[key]?.totalFood.kcal ?? 0
            return (d, total)
        }.reversed()
    }

    func averageMacros(days: Int = 7, endingOn date: Date = .now) -> Macros {
        var sum = Macros.zero
        var count = 0
        for offset in 0..<days {
            if let d = Calendar.current.date(byAdding: .day, value: -offset, to: date) {
                let key = Self.key(for: d)
                if let day = diary[key] {
                    sum = sum + day.totalFood
                    count += 1
                }
            }
        }
        guard count > 0 else { return .zero }
        return Macros(
            kcal: sum.kcal / Double(count),
            protein_g: sum.protein_g / Double(count),
            carbs_g: sum.carbs_g / Double(count),
            fat_g: sum.fat_g / Double(count)
        )
    }

    // MARK: - Persistence

    private func saveLocal() {
        if let data = try? encoder.encode(diary) {
            UserDefaults.standard.set(data, forKey: diaryKey)
        }
        if let data = try? encoder.encode(settings) {
            UserDefaults.standard.set(data, forKey: settingsKey)
        }
    }

    private func loadLocal() {
        if let data = UserDefaults.standard.data(forKey: diaryKey),
           let saved = try? decoder.decode([String: TrackingDay].self, from: data) {
            diary = saved
        }
        if let data = UserDefaults.standard.data(forKey: settingsKey),
           let saved = try? decoder.decode(TrackingSettings.self, from: data) {
            settings = saved
        }
    }
}
