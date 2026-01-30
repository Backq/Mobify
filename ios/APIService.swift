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
            // Log error body for debugging
            if let errorString = String(data: data, encoding: .utf8) {
                print("API Error (\(method) \(endpoint)): \(errorString)")
            }
            throw URLError(.badServerResponse)
        }
        
        return try JSONDecoder().decode(T.self, from: data)
    }
    
    // MARK: - Auth
    func login(username: String, password: [Character]) async throws -> AuthResponse {
        let body = try JSONEncoder().encode(["username": username, "password": String(password)])
        return try await fetch(endpoint: "/auth/login", method: "POST", body: body)
    }
    
    func register(username: String, password: [Character]) async throws -> AuthResponse {
        let body = try JSONEncoder().encode(["username": username, "password": String(password)])
        return try await fetch(endpoint: "/auth/register", method: "POST", body: body)
    }
    
    // MARK: - Search
    func search(query: String, page: Int = 1) async throws -> SearchResponse {
        let escapedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return try await fetch(endpoint: "/search?query=\(escapedQuery)&page=\(page)")
    }
    
    // Helper for stream
    func getStream(videoId: String) async throws -> StreamData {
        return try await fetch(endpoint: "/stream/\(videoId)")
    }
    
    // MARK: - Liked Songs
    func getLikedSongs() async throws -> [Track] {
        return try await fetch(endpoint: "/liked")
    }
    
    func addLiked(track: Track) async throws {
        let body = try JSONEncoder().encode(track)
        let _: JSONValue = try await fetch(endpoint: "/liked", method: "POST", body: body)
    }
    
    func removeLiked(videoId: String) async throws {
        let _: JSONValue = try await fetch(endpoint: "/liked/\(videoId)", method: "DELETE")
    }
    
    // MARK: - Playlists
    func getPlaylists() async throws -> [Playlist] {
        return try await fetch(endpoint: "/playlists")
    }
    
    func getPlaylistDetail(id: Int) async throws -> PlaylistDetail {
        return try await fetch(endpoint: "/playlists/\(id)")
    }
    
    func createPlaylist(name: String) async throws -> Playlist {
        let body = try JSONEncoder().encode(["name": name])
        return try await fetch(endpoint: "/playlists", method: "POST", body: body)
    }
    
    func addTrackToPlaylist(id: Int, track: Track) async throws {
        let body = try JSONEncoder().encode(track)
        let _: JSONValue = try await fetch(endpoint: "/playlists/\(id)/tracks", method: "POST", body: body)
    }
    
    // MARK: - Import
    func importSpotifyPlaylist(id: String, name: String) async throws {
        let body = try JSONEncoder().encode(["spotify_id": id, "name": name])
        let _: JSONValue = try await fetch(endpoint: "/spotify/import/playlist", method: "POST", body: body)
    }
    
    func importYouTubePlaylist(url: String, name: String) async throws {
        let body = try JSONEncoder().encode(["url": url, "name": name])
        let _: JSONValue = try await fetch(endpoint: "/youtube/import/url", method: "POST", body: body)
    }
}

// Utility for Generic Responses
struct JSONValue: Codable {}
