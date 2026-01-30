import SwiftUI

struct PlaylistDetailView: View {
    let playlist: Playlist
    @State private var tracks: [Track] = []
    @State private var isLoading = true
    @ObservedObject var playerManager = PlayerManager.shared
    
    var body: some View {
        ZStack {
            Theme.bgDark.ignoresSafeArea()
            
            if isLoading {
                ProgressView().tint(.white)
            } else if tracks.isEmpty {
                VStack {
                    Image(systemName: "music.note.list")
                        .font(.system(size: 60))
                        .foregroundColor(.gray)
                    Text("This playlist is empty")
                        .font(.headline)
                        .foregroundColor(.gray)
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(tracks) { track in
                            TrackRow(track: track)
                                .onTapGesture {
                                    Task {
                                        await playerManager.play(track: track)
                                    }
                                }
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle(playlist.name)
        .onAppear {
            fetchTracks()
        }
    }
    
    private func fetchTracks() {
        Task {
            do {
                let detail = try await APIService.shared.getPlaylistDetail(id: playlist.id)
                await MainActor.run {
                    self.tracks = detail.tracks
                    self.isLoading = false
                }
            } catch {
                print("Failed to fetch playlist tracks: \(error)")
                await MainActor.run { self.isLoading = false }
            }
        }
    }
}
