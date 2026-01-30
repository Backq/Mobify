import Foundation

enum APIError: Error, LocalizedError {
    case badURL
    case serverError(status: Int, message: String)
    case decodingError(Error)
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .badURL: return "Invalid URL configuration."
        case .serverError(let status, let message): return "Server Error (\(status)): \(message)"
        case .decodingError: return "Failed to process server response."
        case .networkError(let e): return e.localizedDescription
        }
    }
}

class APIService {
    static let shared = APIService()
    
    private var baseURL: String = "https://music.mobware.xyz/api"
    
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
            throw APIError.badURL
        }
        
        var request = createRequest(url: url, method: method)
        request.httpBody = body
        
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.serverError(status: 0, message: "No HTTP Response")
        }
        
        if !(200...299).contains(httpResponse.statusCode) {
            let errorMsg = String(data: data, encoding: .utf8) ?? "Unknown Error"
            throw APIError.serverError(status: httpResponse.statusCode, message: errorMsg)
        }
        
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
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
    
    // Helper for search
    func search(query: String, page: Int = 1, limit: Int = 5) async throws -> SearchResponse {
        let escapedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return try await fetch(endpoint: "/search?query=\(escapedQuery)&page=\(page)&limit=\(limit)")
    }
    
    // Helper for stream
    func getStream(videoId: String) async throws -> StreamData {
        return try await fetch(endpoint: "/stream/\(videoId)")
    }
    
    // MARK: - Liked Songs
    func getLikedSongs() async throws -> [Track] {
        let res: LikedSongsResponse = try await fetch(endpoint: "/liked")
        return res.tracks
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
        let res: PlaylistsResponse = try await fetch(endpoint: "/playlists")
        return res.playlists
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
