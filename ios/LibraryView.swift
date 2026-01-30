import SwiftUI

struct LibraryView: View {
    @State private var playlists: [Playlist] = []
    @State private var isLoading = true
    @State private var showCreateModal = false
    @State private var newPlaylistName = ""
    
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
                        Button(action: { importSpotify() }) {
                            Label("Import from Spotify", systemImage: "arrow.down.circle")
                        }
                        Button(action: { importYouTube() }) {
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
        // Mock prompt for now, in a real app would show a sub-modal
        print("Importing Spotify...")
    }
    
    private func importYouTube() {
        print("Importing YouTube...")
    }
}
