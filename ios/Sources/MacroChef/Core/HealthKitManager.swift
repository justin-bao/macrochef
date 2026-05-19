import Foundation
import HealthKit

/// Reads walking + running distance from Apple Health for a given day.
/// Inject via `.environment(healthKit)` and call `requestAuthorization()`
/// on app launch. Then call `fetchDistance(for:)` whenever the date changes.
@MainActor
@Observable
final class HealthKitManager {

    var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }
    var isAuthorized = false
    var authError: String?

    private let hkStore = HKHealthStore()

    private var distanceType: HKQuantityType? {
        HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)
    }

    // MARK: - Authorization

    func requestAuthorization() async {
        guard isAvailable, let distType = distanceType else { return }
        do {
            try await hkStore.requestAuthorization(toShare: [], read: [distType])
            isAuthorized = true
        } catch {
            authError = error.localizedDescription
        }
    }

    // MARK: - Fetch

    /// Returns total walking + running distance in miles for the calendar day
    /// containing `date`. Returns 0 when HealthKit is unavailable or denied.
    func fetchDistance(for date: Date) async -> Double {
        guard isAvailable, let distType = distanceType else { return 0 }

        let calendar = Calendar.current
        let start = calendar.startOfDay(for: date)
        let end   = calendar.date(byAdding: .day, value: 1, to: start)!

        let predicate = HKQuery.predicateForSamples(
            withStart: start, end: end, options: .strictStartDate
        )

        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: distType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, result, _ in
                let meters = result?.sumQuantity()?.doubleValue(for: .meter()) ?? 0
                continuation.resume(returning: meters / 1609.344)   // → miles
            }
            hkStore.execute(query)
        }
    }
}
