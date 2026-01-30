import Foundation
import AVFoundation
import MediaPlayer

class PlayerManager: ObservableObject {
    static let shared = PlayerManager()
    
    private var player: AVPlayer?
    @Published var currentTrack: Track?
    @Published var isPlaying: Bool = false
    @Published var progress: Double = 0
    @Published var duration: Double = 0
    @Published var isFavorite: Bool = false
    @Published var playlists: [Playlist] = []
    @Published var toastMessage: String? = nil
    @Published var errorMessage: String? = nil
    
    private var timeObserver: Any?
    
    private init() {
        setupRemoteTransportControls()
        fetchPlaylists()
    }
    
    func fetchPlaylists() {
        Task {
            if let ps = try? await APIService.shared.getPlaylists() {
                await MainActor.run { self.playlists = ps }
            }
        }
    }
    
    func toggleFavorite() {
        guard let track = currentTrack else { return }
        Task {
            do {
                if isFavorite {
                    try await APIService.shared.removeLiked(videoId: track.id)
                } else {
                    try await APIService.shared.addLiked(track: track)
                }
                await MainActor.run { self.isFavorite.toggle() }
            } catch {
                print("Toggle favorite failed: \(error)")
            }
        }
    }
    
    func addToPlaylist(_ playlistId: Int) {
        guard let track = currentTrack else { return }
        Task {
            do {
                try await APIService.shared.addTrackToPlaylist(id: playlistId, track: track)
                await MainActor.run {
                    self.toastMessage = "Added to playlist!"
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
                        self?.toastMessage = nil
                    }
                }
            } catch {
                print("Add to playlist failed: \(error)")
            }
        }
    }
    
    func play(track: Track) async {
        await MainActor.run {
            self.progress = 0
            self.isFavorite = false
            self.errorMessage = nil
        }
        
        do {
            let streamData = try await APIService.shared.getStream(videoId: track.id)
            let streamURLStr = "https://music.mobware.xyz/api\(streamData.stream_url)"
            guard let url = URL(string: streamURLStr) else { 
                await MainActor.run { self.errorMessage = "Malformed stream URL." }
                return 
            }
            
            DispatchQueue.main.sync {
                let playerItem = AVPlayerItem(url: url)
                self.player = AVPlayer(playerItem: playerItem)
                self.currentTrack = track
                self.duration = Double(track.duration)
                self.isPlaying = true
                self.player?.play()
                
                addTimeObserver()
                setupNowPlaying()
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
            print("Failed to play track: \(error)")
        }
    }
    
    private func addTimeObserver() {
        if let observer = timeObserver {
            player?.removeTimeObserver(observer)
        }
        
        let interval = CMTime(seconds: 1, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        timeObserver = player?.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            self?.progress = time.seconds
            self?.updateNowPlayingPlaybackInfo()
        }
    }
    
    func togglePlayPause() {
        if isPlaying {
            player?.pause()
        } else {
            player?.play()
        }
        isPlaying.toggle()
        updateNowPlayingPlaybackInfo()
    }
    
    // External Controls Logic (MPRemoteCommandCenter)
    private func setupRemoteTransportControls() {
        let commandCenter = MPRemoteCommandCenter.shared()
        
        commandCenter.playCommand.addTarget { [unowned self] event in
            if !self.isPlaying {
                self.togglePlayPause()
                return .success
            }
            return .commandFailed
        }
        
        commandCenter.pauseCommand.addTarget { [unowned self] event in
            if self.isPlaying {
                self.togglePlayPause()
                return .success
            }
            return .commandFailed
        }
    }
    
    private func setupNowPlaying() {
        guard let track = currentTrack else { return }
        var nowPlayingInfo = [String: Any]()
        nowPlayingInfo[MPMediaItemPropertyTitle] = track.title
        nowPlayingInfo[MPMediaItemPropertyArtist] = track.uploader
        nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = Double(track.duration)
        
        // Artwork logic would go here (fetch from URL)
        
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
    }
    
    private func updateNowPlayingPlaybackInfo() {
        var nowPlayingInfo = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
        nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = player?.currentTime().seconds
        nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
    }
}
