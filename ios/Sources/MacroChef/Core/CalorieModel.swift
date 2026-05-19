import Foundation

// Mirrors src/lib/garmin-calories.ts — keep in sync when the web model changes.

struct CalorieBreakdown {
    var bmrPerDay: Int
    var bmrPerHour: Double
    var effectiveWalkingDistanceMi: Double
    var walkingCalories: Int
    var activityActiveCalories: Int
    var projectedDayBurn: Int
}

func getCalorieBreakdown(day: TrackingDay, settings: TrackingSettings) -> CalorieBreakdown {
    let weightKg = settings.unitSystem == "imperial"
        ? settings.weight * 0.453592
        : settings.weight
    let heightCm = settings.unitSystem == "imperial"
        ? settings.height * 2.54
        : settings.height

    let sexOffset: Double
    switch settings.sex {
    case .male: sexOffset = 5
    case .female: sexOffset = -161
    case .unspecified: sexOffset = -78
    }

    let bmr = max(1200, 10 * weightKg + 6.25 * heightCm - 5 * Double(settings.age) + sexOffset)
    let bmrPerHour = bmr / 24.0

    // Effective walking = total HealthKit distance minus explicit activity distances
    let totalDayMi = day.appleHealthSummary?.totalDistanceMi ?? 0
    let activityDistanceMi = day.activities.compactMap { a -> Double? in
        guard let dist = a.distance, let unit = a.distanceUnit, unit == "mi" else { return nil }
        return dist
    }.reduce(0, +)
    let effectiveWalkingMi = max(0, totalDayMi - activityDistanceMi)

    // ACSM formula at 3 mph (80.5 m/min): VO2 = 0.1 × speed + restVO2
    let rvo2 = 3.5
    let vo2 = 0.1 * 80.5 + rvo2
    let minutesPerMile = 20.0
    let caloriesPerMile = vo2 * weightKg * minutesPerMile / 200.0
    let walkingCalories = Int((effectiveWalkingMi * caloriesPerMile).rounded())

    let activityActiveCalories = Int(day.activities.reduce(0) { $0 + $1.caloriesBurned })

    return CalorieBreakdown(
        bmrPerDay: Int(bmr.rounded()),
        bmrPerHour: bmrPerHour,
        effectiveWalkingDistanceMi: (effectiveWalkingMi * 100).rounded() / 100,
        walkingCalories: walkingCalories,
        activityActiveCalories: activityActiveCalories,
        projectedDayBurn: Int(bmr.rounded()) + walkingCalories + activityActiveCalories
    )
}
