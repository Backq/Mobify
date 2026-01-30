import Foundation

class APIService {
    static let shared = APIService()
    
    // In a real app, this would be configurable inside Settings
    private var baseURL: String = "https://music.mobware.xyz/api" // Production backend
    
    func setBaseURL(_ url: String) {
        self.baseURL = url
    }
    
    private var token: String? {
        UserDefaults.standard.string(forKey: "mobify_token")
    }
    
    private func createRequest(url: URL, method: String) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        if let token = token {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        return request
    }
    
    func fetch<T: Codable>(endpoint: String, method: String = "GET", body: Data? = nil) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw URLError(.badURL)
        }
        
        var request = createRequest(url: url, method: method)
        request.httpBody = body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        return try JSONDecoder().decode(T.self, from: data)
    }
    
    // Helper for search
    func search(query: String, page: Int = 1) async throws -> SearchResponse {
        let escapedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return try await fetch(endpoint: "/search?query=\(escapedQuery)&page=\(page)")
    }
    
    // Helper for stream
    func getStream(videoId: String) async throws -> StreamData {
        return try await fetch(endpoint: "/stream/\(videoId)")
    }
}
