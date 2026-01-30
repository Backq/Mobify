import SwiftUI

struct LikedSongsView: View {
    @State private var songs: [Track] = []
    @State private var isLoading = true
    @ObservedObject var playerManager = PlayerManager.shared
    
    var body: some View {
        ZStack {
            Theme.bgDark.ignoresSafeArea()
            
            if isLoading {
                ProgressView().tint(.white)
            } else if songs.isEmpty {
                VStack {
                    Image(systemName: "heart.slash")
                        .font(.system(size: 60))
                        .foregroundColor(.gray)
                    Text("No liked songs yet")
                        .font(.headline)
                        .foregroundColor(.gray)
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(songs) { track in
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
        .navigationTitle("Liked Songs")
        .onAppear {
            fetchSongs()
        }
    }
    
    private func fetchSongs() {
        Task {
            do {
                let fetched = try await APIService.shared.getLikedSongs()
                await MainActor.run {
                    self.songs = fetched
                    self.isLoading = false
                }
            } catch {
                print("Failed to fetch liked songs: \(error)")
                await MainActor.run { self.isLoading = false }
            }
        }
    }
}
