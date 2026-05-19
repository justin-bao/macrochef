import Foundation

/// Server-side calorie model ported from src/lib/activity-calculator.ts and
/// src/lib/garmin-calories.ts so both platforms produce consistent numbers.
enum CalorieModel {

    // MARK: - BMR (Mifflin-St Jeor)

    /// Resting calories burned per day.
    static func bmrPerDay(_ s: TrackingSettings) -> Double {
        let kg = s.unitSystem == "imperial" ? s.weight * 0.453592 : s.weight
        let cm = s.unitSystem == "imperial" ? s.height * 2.54    : s.height
        let sexOffset: Double
        switch s.sex {
        case .male:        sexOffset =   5
        case .female:      sexOffset = -161
        case .unspecified: sexOffset =  -78
        }
        return max(1200, 10 * kg + 6.25 * cm - 5 * Double(s.age) + sexOffset)
    }

    // MARK: - Walking calories (ACSM horizontal formula at 3 mph)

    /// Active calories burned per mile of walking — personalized to body weight.
    static func caloriesPerMileWalking(_ s: TrackingSettings) -> Double {
        let kg     = s.unitSystem == "imperial" ? s.weight * 0.453592 : s.weight
        let bmrDay = bmrPerDay(s)
        // Resting VO2 clamped to physiological range
        let rvo2   = max(2.6, min(4.6, (bmrDay * 1000) / (1440 * 5 * kg)))
        let vo2    = 0.1 * 80.5 + rvo2     // ACSM at 80.5 m/min
        let minPerMile = 20.0               // 3 mph
        return (vo2 * kg * minPerMile / 200).rounded(.toNearestOrAwayFromZero)
    }

    // MARK: - Day breakdown

    struct DayBurnBreakdown {
        /// Mifflin-St Jeor resting calories for a full day.
        var bmr: Double
        /// Active calories from walking/running (net of activity distances).
        var walkingCalories: Double
        /// Effective walking distance in miles after subtracting logged activities.
        var walkingDistanceMi: Double
        /// Sum of manually logged activity calories.
        var activityCalories: Double
        /// BMR + walkingCalories + activityCalories.
        var projected: Double
    }

    /// Calculates the full projected-burn breakdown for a day.
    ///
    /// - Parameters:
    ///   - healthMiles: Total walking+running distance from HealthKit (miles).
    ///   - activities:  Manually logged activities (used for both their calories
    ///                  and their distances to avoid double-counting).
    ///   - settings:    User profile used for BMR and per-mile calorie formulas.
    static func breakdown(
        healthMiles: Double,
        activities: [ActivityLogItem],
        settings: TrackingSettings
    ) -> DayBurnBreakdown {
        let bmr        = bmrPerDay(settings)
        let calPerMile = caloriesPerMileWalking(settings)

        // Subtract distances already covered during explicit logged activities
        let activityMi: Double = activities.reduce(0) { sum, act in
            guard let dist = act.distance else { return sum }
            let mi = act.distanceUnit == "km" ? dist / 1.60934 : dist
            return sum + mi
        }
        let effectiveMi      = max(0, healthMiles - activityMi)
        let walkingCalories  = (effectiveMi * calPerMile).rounded()
        let activityCalories = activities.reduce(0) { $0 + $1.caloriesBurned }

        return DayBurnBreakdown(
            bmr: bmr,
            walkingCalories: walkingCalories,
            walkingDistanceMi: effectiveMi,
            activityCalories: activityCalories,
            projected: bmr + walkingCalories + activityCalories
        )
    }
}
