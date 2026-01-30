import SwiftUI

struct MainTabView: View {
    @State private var selection = 0
    @ObservedObject var playerManager = PlayerManager.shared
    @State private var isPlayerExpanded = false
    
    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selection) {
                SearchView(onTrackSelect: { track in
                    Task {
                        await playerManager.play(track: track)
                    }
                })
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }
                .tag(0)
                
                LibraryView()
                .tabItem {
                    Label("Library", systemImage: "books.vertical.fill")
                }
                .tag(1)
                
                // Profile or Settings placeholder
                Text("Profile Settings")
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
                .tag(2)
            }
            .accentColor(Theme.primaryBlue)
            
            // Mini Player - visible if track is loaded and not expanded
            if playerManager.currentTrack != nil && !isPlayerExpanded {
                MiniPlayer(isExpanded: $isPlayerExpanded)
                    .padding(.bottom, 50) // Above tab bar
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .sheet(isPresented: $isPlayerExpanded) {
            PlayerView(isExpanded: $isPlayerExpanded)
        }
    }
}

struct MiniPlayer: View {
    @ObservedObject var playerManager = PlayerManager.shared
    @Binding var isExpanded: Bool
    
    var body: some View {
        HStack {
            AsyncImage(url: URL(string: playerManager.currentTrack?.thumbnail ?? "")) { image in
                image.resizable()
            } placeholder: {
                Color.gray
            }
            .frame(width: 44, height: 44)
            .cornerRadius(4)
            
            VStack(alignment: .leading) {
                Text(playerManager.currentTrack?.title ?? "Unknown")
                    .font(.caption)
                    .bold()
                    .lineLimit(1)
                Text(playerManager.currentTrack?.uploader ?? "Unknown Artist")
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .lineLimit(1)
            }
            
            Spacer()
            
            Button(action: { playerManager.togglePlayPause() }) {
                Image(systemName: playerManager.isPlaying ? "pause.fill" : "play.fill")
                    .font(.title3)
            }
        }
        .padding(10)
        .glassStyle()
        .padding(.horizontal, 10)
        .onTapGesture {
            isExpanded = true
        }
    }
}
