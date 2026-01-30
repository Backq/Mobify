import SwiftUI

struct PlayerView: View {
    @ObservedObject var playerManager = PlayerManager.shared
    @Binding var isExpanded: Bool
    
    var body: some View {
        ZStack {
            if let track = playerManager.currentTrack {
                // Fullscreen Background
                AsyncImage(url: URL(string: track.thumbnail)) { image in
                    image.resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.black
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .blur(radius: 50)
                .overlay(Color.black.opacity(0.6))
                .ignoresSafeArea()
                
                VStack(spacing: 30) {
                    // Header
                    HStack {
                        Button(action: { isExpanded = false }) {
                            Image(systemName: "chevron.down")
                                .font(.title2)
                        }
                        Spacer()
                        Text("Now Playing")
                            .font(.headline)
                            .opacity(0.8)
                        Spacer()
                        Button(action: {}) {
                            Image(systemName: "heart")
                                .font(.title2)
                        }
                    }
                    .padding(.horizontal)
                    
                    Spacer()
                    
                    // Artwork
                    AsyncImage(url: URL(string: track.thumbnail)) { image in
                        image.resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        Rectangle().fill(Color.gray.opacity(0.3))
                    }
                    .cornerRadius(20)
                    .shadow(radius: 20)
                    .padding(30)
                    
                    // Title/Artist
                    VStack(spacing: 8) {
                        Text(track.title)
                            .font(.title2)
                            .bold()
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                        Text(track.uploader)
                            .font(.headline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)
                    
                    // Progress
                    VStack {
                        Slider(value: $playerManager.progress, in: 0...playerManager.duration)
                            .accentColor(Theme.primaryBlue)
                        HStack {
                            Text(formatTime(playerManager.progress))
                            Spacer()
                            Text(formatTime(playerManager.duration))
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)
                    
                    // Controls
                    HStack(spacing: 40) {
                        Button(action: {}) { Image(systemName: "shuffle").font(.title3) }
                        Button(action: {}) { Image(systemName: "backward.fill").font(.title) }
                        
                        Button(action: { playerManager.togglePlayPause() }) {
                            Image(systemName: playerManager.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                                .resizable()
                                .frame(width: 80, height: 80)
                        }
                        
                        Button(action: {}) { Image(systemName: "forward.fill").font(.title) }
                        Button(action: {}) { Image(systemName: "repeat").font(.title3) }
                    }
                    
                    Spacer()
                }
                .foregroundColor(.white)
            }
        }
    }
    
    func formatTime(_ time: Double) -> String {
        let mins = Int(time) / 60
        let secs = Int(time) % 60
        return String(format: "%d:%02d", mins, secs)
    }
}
