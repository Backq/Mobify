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
    
    private var timeObserver: Any?
    
    private init() {
        setupRemoteTransportControls()
    }
    
    func play(track: Track) async {
        do {
            let streamData = try await APIService.shared.getStream(videoId: track.id)
            let streamURLStr = "https://music.mobware.xyz/api\(streamData.stream_url)"
            guard let url = URL(string: streamURLStr) else { return }
            
            DispatchQueue.main.sync {
                self.currentTrack = track
                self.duration = Double(track.duration)
                
                let playerItem = AVPlayerItem(url: url)
                if self.player == nil {
                    self.player = AVPlayer(playerItem: playerItem)
                } else {
                    self.player?.replaceCurrentItem(with: playerItem)
                }
                
                self.player?.play()
                self.isPlaying = true
                setupNowPlaying()
                addTimeObserver()
            }
        } catch {
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
