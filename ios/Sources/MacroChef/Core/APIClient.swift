import Foundation
import Supabase

actor APIClient {
    private let base: URL
    private let authManager: AuthManager
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(authManager: AuthManager) {
        self.base = Config.apiBaseURL
        self.authManager = authManager
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    // MARK: - Helpers

    private func authHeaders() async -> [String: String] {
        var headers: [String: String] = ["Content-Type": "application/json"]
        if let session = try? await authManager.supabase.auth.session {
            headers["Authorization"] = "Bearer \(session.accessToken)"
        }
        return headers
    }

    private func get<T: Decodable>(path: String, query: [String: String] = [:]) async throws -> T {
        var components = URLComponents(url: base.appendingPathComponent(path), resolvingAgainstBaseURL: true)!
        if !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        for (key, value) in await authHeaders() {
            request.setValue(value, forHTTPHeaderField: key)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw APIError.httpError((response as? HTTPURLResponse)?.statusCode ?? 0, body)
        }
        return try decoder.decode(T.self, from: data)
    }

    private func post<Body: Encodable, T: Decodable>(path: String, body: Body) async throws -> T {
        var request = URLRequest(url: base.appendingPathComponent(path))
        request.httpMethod = "POST"
        for (key, value) in await authHeaders() {
            request.setValue(value, forHTTPHeaderField: key)
        }
        request.httpBody = try encoder.encode(body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw APIError.httpError((response as? HTTPURLResponse)?.statusCode ?? 0, body)
        }
        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Food

    func searchFood(query: String) async throws -> [FoodSearchResult] {
        let response: FoodSearchResponse = try await get(
            path: "api/food/search",
            query: ["q": query]
        )
        return response.results
    }

    func estimateFood(name: String, quantity: Double, unit: String) async throws -> FoodEstimateResult? {
        let response: FoodEstimateResponse = try await post(
            path: "api/food/estimate",
            body: FoodEstimateRequest(name: name, quantity: quantity, unit: unit)
        )
        return response.estimate
    }

    // MARK: - Recipes

    func searchRecipes(
        query: String = "",
        kcal: Double? = nil,
        protein_g: Double? = nil,
        carbs_g: Double? = nil,
        fat_g: Double? = nil,
        number: Int = 12
    ) async throws -> [RecipeSearchResult] {
        let response: RecipeSearchResponse = try await post(
            path: "api/recipes/search",
            body: RecipeSearchRequest(
                query: query, number: number,
                kcal: kcal, protein_g: protein_g, carbs_g: carbs_g, fat_g: fat_g
            )
        )
        return response.results
    }

    func getRecipe(id: Int, source: String = "spoonacular") async throws -> RecipeDetail? {
        let response: RecipeDetailResponse = try await get(
            path: "api/recipes/\(id)",
            query: ["source": source]
        )
        return response.recipe
    }
}

// MARK: - Request / Response types

private struct FoodSearchResponse: Decodable {
    var results: [FoodSearchResult]
}

private struct FoodEstimateRequest: Encodable {
    var name: String
    var quantity: Double
    var unit: String
}

private struct FoodEstimateResponse: Decodable {
    var estimate: FoodEstimateResult?
    var error: String?
}

private struct RecipeSearchRequest: Encodable {
    var query: String
    var number: Int
    var kcal: Double?
    var protein_g: Double?
    var carbs_g: Double?
    var fat_g: Double?
}

private struct RecipeSearchResponse: Decodable {
    var results: [RecipeSearchResult]
    var error: String?
}

private struct RecipeDetailResponse: Decodable {
    var recipe: RecipeDetail?
    var error: String?
}

// MARK: - Errors

enum APIError: LocalizedError {
    case httpError(Int, String)
    case decodingError(Error)

    var errorDescription: String? {
        switch self {
        case .httpError(let code, let body): "HTTP \(code): \(body)"
        case .decodingError(let err): "Decoding error: \(err)"
        }
    }
}
