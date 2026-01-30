import Foundation

struct Track: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let uploader: String
    let thumbnail: String
    let duration: Int
    
    enum CodingKeys: String, CodingKey {
        case id, title, uploader, thumbnail, duration
    }
}

struct StreamData: Codable {
    let stream_url: String
    let title: String
    let duration: Int
}

struct Lyrics: Codable {
    let lyrics: String?
}

struct Playlist: Codable, Identifiable {
    let id: Int
    let name: String
    let track_count: Int
}

struct PlaylistDetail: Codable {
    let id: Int
    let name: String
    let tracks: [Track]
}

struct SearchResponse: Codable {
    let results: [Track]
    let page: Int
    let has_more: Bool
}

struct AuthResponse: Codable {
    let token: String
    let user: User
}

struct User: Codable {
    let id: Int
    let username: String
}
