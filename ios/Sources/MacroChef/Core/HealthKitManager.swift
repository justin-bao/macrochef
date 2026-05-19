import Foundation
import HealthKit

// Requires in Xcode: Signing & Capabilities → + Capability → HealthKit
// Info.plist key: NSHealthShareUsageDescription

@MainActor
@Observable
final class HealthKitManager {
    private let hkStore = HKHealthStore()

    var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }
    var isAuthorized = false

    private let distanceType = HKQuantityType(.distanceWalkingRunning)

    func requestAuthorization() async {
        guard isAvailable else { return }
        do {
            try await hkStore.requestAuthorization(toShare: [], read: [distanceType])
            isAuthorized = true
        } catch {
            // User declined — manual entry remains available
        }
    }

    func fetchDistanceMiles(for date: Date) async -> Double {
        guard isAvailable else { return 0 }
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: date)
        guard let end = calendar.date(byAdding: .day, value: 1, to: start) else { return 0 }
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end)

        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: distanceType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, stats, _ in
                let meters = stats?.sumQuantity()?.doubleValue(for: .meter()) ?? 0
                let miles = (meters / 1609.344 * 100).rounded() / 100
                continuation.resume(returning: miles)
            }
            self.hkStore.execute(query)
        }
    }
}
