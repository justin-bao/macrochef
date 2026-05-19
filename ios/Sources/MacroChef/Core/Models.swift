import Foundation

// MARK: - Nutrition

struct Macros: Codable, Equatable {
    var kcal: Double
    var protein_g: Double
    var carbs_g: Double
    var fat_g: Double

    static let zero = Macros(kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0)

    static func + (lhs: Macros, rhs: Macros) -> Macros {
        Macros(kcal: lhs.kcal + rhs.kcal, protein_g: lhs.protein_g + rhs.protein_g,
               carbs_g: lhs.carbs_g + rhs.carbs_g, fat_g: lhs.fat_g + rhs.fat_g)
    }
}

// MARK: - Tracking

enum MealType: String, Codable, CaseIterable {
    case breakfast, lunch, dinner, snacks

    var label: String {
        switch self {
        case .breakfast: "Breakfast"
        case .lunch: "Lunch"
        case .dinner: "Dinner"
        case .snacks: "Snacks"
        }
    }
}

enum ActivityKind: String, Codable, CaseIterable {
    case run, walk, bike, stairmaster, strength, gym, other

    var label: String {
        switch self {
        case .run: "Run"
        case .walk: "Walk"
        case .bike: "Bike"
        case .stairmaster: "Stairmaster"
        case .strength: "Strength"
        case .gym: "Gym"
        case .other: "Other"
        }
    }

    var systemImage: String {
        switch self {
        case .run: "figure.run"
        case .walk: "figure.walk"
        case .bike: "bicycle"
        case .stairmaster: "figure.stairs"
        case .strength: "dumbbell"
        case .gym: "figure.mixed.cardio"
        case .other: "bolt.heart"
        }
    }
}

enum FoodSource: String, Codable {
    case manual, recipe, restaurant, ai, usda
}

enum ActivitySource: String, Codable {
    case manual, apple_health, strava, garmin
}

struct AppleHealthSummary: Codable {
    var totalDistanceMi: Double
    var updatedAt: String
}

struct FoodLogItem: Codable, Identifiable {
    var id: String
    var name: String
    var quantity: Double
    var unit: String
    var kcal: Double
    var protein_g: Double
    var carbs_g: Double
    var fat_g: Double
    var source: FoodSource
    var confidence: String?
    var note: String?
    var loggedAt: String

    var macros: Macros {
        Macros(kcal: kcal, protein_g: protein_g, carbs_g: carbs_g, fat_g: fat_g)
    }

    init(name: String, quantity: Double, unit: String,
         kcal: Double, protein_g: Double, carbs_g: Double, fat_g: Double,
         source: FoodSource = .manual, confidence: String? = nil, note: String? = nil) {
        self.id = UUID().uuidString
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.kcal = kcal
        self.protein_g = protein_g
        self.carbs_g = carbs_g
        self.fat_g = fat_g
        self.source = source
        self.confidence = confidence
        self.note = note
        self.loggedAt = ISO8601DateFormatter().string(from: .now)
    }
}

struct MealLog: Codable {
    var type: MealType
    var items: [FoodLogItem]
}

struct ActivityLogItem: Codable, Identifiable {
    var id: String
    var kind: ActivityKind
    var name: String
    var durationMin: Double
    var caloriesBurned: Double
    var intensity: String?
    var source: ActivitySource?
    var distance: Double?
    var distanceUnit: String?
    var notes: String?
    var loggedAt: String

    init(kind: ActivityKind, name: String, durationMin: Double, caloriesBurned: Double,
         intensity: String? = nil, distance: Double? = nil, distanceUnit: String? = nil,
         notes: String? = nil) {
        self.id = UUID().uuidString
        self.kind = kind
        self.name = name
        self.durationMin = durationMin
        self.caloriesBurned = caloriesBurned
        self.intensity = intensity
        self.source = .manual
        self.distance = distance
        self.distanceUnit = distanceUnit
        self.notes = notes
        self.loggedAt = ISO8601DateFormatter().string(from: .now)
    }
}

struct TrackingDay: Codable {
    var meals: [MealLog]
    var activities: [ActivityLogItem]
    var appleHealthSummary: AppleHealthSummary?

    static func empty() -> TrackingDay {
        TrackingDay(
            meals: MealType.allCases.map { MealLog(type: $0, items: []) },
            activities: [],
            appleHealthSummary: nil
        )
    }

    var totalFood: Macros {
        meals.flatMap(\.items).reduce(.zero) { $0 + $1.macros }
    }

    var totalBurned: Double {
        activities.reduce(0) { $0 + $1.caloriesBurned }
    }
}

// MARK: - Settings / Goals

enum ProfileGoal: String, Codable, CaseIterable {
    case lose_body_fat, build_muscle, maintain_weight, fuel_runs, general_nutrition

    var label: String {
        switch self {
        case .lose_body_fat: "Lose Body Fat"
        case .build_muscle: "Build Muscle"
        case .maintain_weight: "Maintain Weight"
        case .fuel_runs: "Fuel Runs"
        case .general_nutrition: "General Nutrition"
        }
    }
}

enum Sex: String, Codable, CaseIterable {
    case female, male, unspecified

    var label: String { rawValue.capitalized }
}

struct TrackingSettings: Codable {
    var weight: Double = 180
    var height: Double = 70
    var age: Int = 35
    var sex: Sex = .unspecified
    var goal: ProfileGoal = .maintain_weight
    var unitSystem: String = "imperial"
    var dailyCalorieTarget: Double = 2500
    var dailyProteinTarget: Double = 180
    var dailyCarbsTarget: Double = 280
    var dailyFatTarget: Double = 80

    var targetMacros: Macros {
        Macros(kcal: dailyCalorieTarget, protein_g: dailyProteinTarget,
               carbs_g: dailyCarbsTarget, fat_g: dailyFatTarget)
    }
}

// MARK: - Food Search

struct FoodSearchResult: Codable, Identifiable {
    var fdcId: Int
    var name: String
    var brandOwner: String?
    var dataType: String?
    var servingDescription: String?
    var kcal_per_100g: Double
    var protein_g_per_100g: Double
    var carbs_g_per_100g: Double
    var fat_g_per_100g: Double

    var id: Int { fdcId }

    func toFoodLogItem(quantity: Double, unit: String, grams: Double) -> FoodLogItem {
        let factor = grams / 100.0
        return FoodLogItem(
            name: name,
            quantity: quantity,
            unit: unit,
            kcal: (kcal_per_100g * factor).rounded(),
            protein_g: (protein_g_per_100g * factor * 10).rounded() / 10,
            carbs_g: (carbs_g_per_100g * factor * 10).rounded() / 10,
            fat_g: (fat_g_per_100g * factor * 10).rounded() / 10,
            source: .usda
        )
    }
}

struct FoodEstimateResult: Codable {
    var name: String
    var quantity: Double
    var unit: String
    var matchedName: String
    var sourceLabel: String
    var servingBasis: String
    var kcal: Double
    var protein_g: Double
    var carbs_g: Double
    var fat_g: Double
    var confidence: String

    func toFoodLogItem() -> FoodLogItem {
        FoodLogItem(
            name: name,
            quantity: quantity,
            unit: unit,
            kcal: kcal,
            protein_g: protein_g,
            carbs_g: carbs_g,
            fat_g: fat_g,
            source: .usda,
            confidence: confidence
        )
    }
}

// MARK: - Recipes

struct RecipeSearchResult: Codable, Identifiable {
    var id: Int
    var title: String
    var image: String
    var servings: Int?
    var source: String?
    var kcal: Double?
    var protein_g: Double?
    var carbs_g: Double?
    var fat_g: Double?
    var fitKind: String?
}

struct RecipeIngredient: Codable, Identifiable {
    var id: Int
    var name: String
    var original: String
    var amount: Double
    var unit: String
    var kcal: Double?
    var protein_g: Double?
    var carbs_g: Double?
    var fat_g: Double?
}

struct RecipeDetail: Codable, Identifiable {
    var id: Int
    var source: String
    var title: String
    var image: String
    var servings: Int
    var readyInMinutes: Int
    var sourceUrl: String?
    var summary: String?
    var instructions: [String]
    var ingredients: [RecipeIngredient]
    var macros: Macros
}

struct SavedRecipe: Codable, Identifiable {
    var id: String
    var user_id: String
    var spoonacular_id: Int?
    var title: String
    var image: String?
    var servings: Int?
    var target_macros: Macros?
    var computed_macros: Macros?
}
