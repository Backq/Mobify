import SwiftUI

struct LibraryView: View {
    @State private var playlists: [Playlist] = []
    @State private var isLoading = true
    @State private var showCreateModal = false
    @State private var newPlaylistName = ""
    
    @State private var showImportSpotify = false
    @State private var spotifyPlaylistId = ""
    @State private var showImportYouTube = false
    @State private var youtubeUrl = ""
    
    var body: some View {
        NavigationView {
            ZStack {
                Theme.bgDark.ignoresSafeArea()
                
                List {
                    Section(header: Text("Playlists").foregroundColor(.gray)) {
                        NavigationLink(destination: LikedSongsView()) {
                            Label("Liked Songs", systemImage: "heart.fill")
                                .foregroundColor(.red)
                        }
                        
                        if isLoading {
                            ProgressView().tint(.white)
                        } else {
                            ForEach(playlists) { pl in
                                NavigationLink(destination: PlaylistDetailView(playlist: pl)) {
                                    VStack(alignment: .leading) {
                                        Text(pl.name).font(.headline)
                                        Text("\(pl.track_count) tracks").font(.caption).foregroundColor(.gray)
                                    }
                                }
                            }
                            
                            Button(action: { showCreateModal = true }) {
                                Label("Create New Playlist", systemImage: "plus.circle.fill")
                                    .foregroundColor(Theme.primaryBlue)
                            }
                        }
                    }
                    
                    Section(header: Text("Import").foregroundColor(.gray)) {
                        Button(action: { showImportSpotify = true }) {
                            Label("Import from Spotify", systemImage: "arrow.down.circle")
                        }
                        Button(action: { showImportYouTube = true }) {
                            Label("Import from YouTube", systemImage: "play.rectangle")
                        }
                    }
                }
                .listStyle(InsetGroupedListStyle())
            }
            .navigationTitle("Library")
            .alert("New Playlist", isPresented: $showCreateModal) {
                TextField("Playlist Name", text: $newPlaylistName)
                Button("Cancel", role: .cancel) { newPlaylistName = "" }
                Button("Create") { createPlaylist() }
            }
            .alert("Import Spotify Playlist", isPresented: $showImportSpotify) {
                TextField("Spotify Playlist ID", text: $spotifyPlaylistId)
                Button("Cancel", role: .cancel) { spotifyPlaylistId = "" }
                Button("Import") { importSpotify() }
            }
            .alert("Import YouTube URL", isPresented: $showImportYouTube) {
                TextField("YouTube URL", text: $youtubeUrl)
                Button("Cancel", role: .cancel) { youtubeUrl = "" }
                Button("Import") { importYouTube() }
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            fetchPlaylists()
        }
    }
    
    private func fetchPlaylists() {
        Task {
            do {
                let fetched = try await APIService.shared.getPlaylists()
                await MainActor.run {
                    self.playlists = fetched
                    self.isLoading = false
                }
            } catch {
                print("Failed to fetch playlists: \(error)")
                await MainActor.run { self.isLoading = false }
            }
        }
    }
    
    private func createPlaylist() {
        guard !newPlaylistName.isEmpty else { return }
        Task {
            do {
                _ = try await APIService.shared.createPlaylist(name: newPlaylistName)
                await MainActor.run {
                    newPlaylistName = ""
                    fetchPlaylists()
                }
            } catch {
                print("Failed to create playlist: \(error)")
            }
        }
    }
    
    private func importSpotify() {
        guard !spotifyPlaylistId.isEmpty else { return }
        Task {
            do {
                try await APIService.shared.importSpotifyPlaylist(id: spotifyPlaylistId, name: "Imported Spotify")
                await MainActor.run {
                    spotifyPlaylistId = ""
                    fetchPlaylists()
                }
            } catch {
                print("Import Spotify failed: \(error)")
            }
        }
    }
    
    private func importYouTube() {
        guard !youtubeUrl.isEmpty else { return }
        Task {
            do {
                try await APIService.shared.importYouTubePlaylist(url: youtubeUrl, name: "Imported YouTube")
                await MainActor.run {
                    youtubeUrl = ""
                    fetchPlaylists()
                }
            } catch {
                print("Import YouTube failed: \(error)")
            }
        }
    }
}
