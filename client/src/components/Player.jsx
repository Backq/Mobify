import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronDown, Heart, ListPlus, Shuffle, Mic2 } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { likedAPI, streamAPI, lyricsAPI } from '../services/api';
import PlaylistPicker from './PlaylistPicker';
import Lyrics from './Lyrics';
import Queue from './Queue';
import './Player.css';

const Player = ({ currentTrack, onNext, onPrev, onLibraryUpdate, isShuffle, onToggleShuffle, shouldAutoPlay, queue, onQueueReorder, onQueueRemove }) => {
    const config = useConfig();
    const { isAuthenticated, openAuthModal, user } = useAuth();
    const audioRef = useRef(null);
    const rafRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    // Initialize volume from localStorage or default to 0.8
    const [volume, setVolume] = useState(() => {
        const saved = localStorage.getItem('mobify_volume');
        return saved ? parseFloat(saved) : 0.8;
    });
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isPlaylistPickerOpen, setIsPlaylistPickerOpen] = useState(false);

    // Lyrics state
    const [lyrics, setLyrics] = useState(null);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showQueue, setShowQueue] = useState(false);

    // Refs for stale closure fix
    const currentTrackRef = useRef(currentTrack);
    const userRef = useRef(user);
    const isAuthenticatedRef = useRef(isAuthenticated);
    const hasRestoredRef = useRef(false);
    const durationRef = useRef(0); // Add duration ref to avoid stale closures

    // Update refs whenever props/context change
    useEffect(() => {
        currentTrackRef.current = currentTrack;
        userRef.current = user;
        isAuthenticatedRef.current = isAuthenticated;
    }, [currentTrack, user, isAuthenticated]);

    // Unified end-of-track handler
    const handleEnded = () => {
        setIsPlaying(false);
        if (onNext) onNext();
    };

    // Initialize audio element once
    useEffect(() => {
        audioRef.current = new Audio();
        audioRef.current.volume = volume;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
        };
    }, []);

    // Check if current track is favorite
    useEffect(() => {
        if (currentTrack && isAuthenticated) {
            likedAPI.check(currentTrack.id)
                .then(isLiked => setIsFavorite(isLiked))
                .catch(() => setIsFavorite(false));
        } else {
            setIsFavorite(false);
        }
    }, [currentTrack, isAuthenticated]);

    // Load and play track when currentTrack changes
    useEffect(() => {
        if (!currentTrack || !audioRef.current) return;

        const loadTrack = async () => {
            setIsLoading(true);
            setIsPlaying(false);
            setProgress(0);
            const trackDuration = currentTrack.duration || 0;
            setDuration(trackDuration);
            durationRef.current = trackDuration;
            setLyrics(null); // Reset lyrics
            hasRestoredRef.current = false; // Reset restore flag for new track

            // Create unique session ID based on track to invalidate old restores
            // We'll handle the "reset" logic implicitly by just overwriting the single key later
            // OR explicitly clearing it here if we want to ensure no cross-contamination
            // But requirement was "reset if I change song", so we just won't restore unless IDs match.

            try {
                // Fetch Lyrics in background
                lyricsAPI.get(`${currentTrack.title} ${currentTrack.uploader}`)
                    .then(data => setLyrics(data.lyrics))
                    .catch(err => console.error("Failed to fetch lyrics", err));

                const streamData = await streamAPI.getStream(currentTrack.id);
                const audioUrl = `${config.api_url}${streamData.stream_url}`;

                audioRef.current.src = audioUrl;
                audioRef.current.load();

                // Attempt restore immediately if we can (though duration might be NaN yet)
                // We'll rely on handleCanPlay for robust restoration


                // Only autoplay if explicitly requested (e.g. user clicked a song)
                if (shouldAutoPlay) {
                    await audioRef.current.play();
                    setIsPlaying(true);
                } else {
                    console.log(`[PLAYER] Autoplay blocked for restored track: ${currentTrack.title}`);
                    setIsPlaying(false);
                }
                setIsLoading(false);

                // MediaSession for CarPlay/Lockscreen
                if ('mediaSession' in navigator) {
                    const artworkUrl = currentTrack.thumbnail;

                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: currentTrack.title,
                        artist: currentTrack.uploader,
                        album: 'Mobify', // Helpful for mobile OS categorization
                        artwork: [
                            { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
                            { src: artworkUrl, sizes: '128x128', type: 'image/jpeg' },
                            { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
                            { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
                            { src: artworkUrl, sizes: '384x384', type: 'image/jpeg' },
                            { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
                        ]
                    });

                    navigator.mediaSession.playbackState = shouldAutoPlay ? "playing" : "paused";

                    navigator.mediaSession.setActionHandler('play', () => { audioRef.current.play(); setIsPlaying(true); });
                    navigator.mediaSession.setActionHandler('pause', () => { audioRef.current.pause(); setIsPlaying(false); });
                    navigator.mediaSession.setActionHandler('previoustrack', onPrev);
                    navigator.mediaSession.setActionHandler('nexttrack', onNext);
                    navigator.mediaSession.setActionHandler('seekto', (details) => {
                        if (details.seekTime !== undefined && audioRef.current) {
                            audioRef.current.currentTime = details.seekTime;
                            setProgress(details.seekTime);
                        }
                    });
                }
            } catch (error) {
                console.error("Failed to load stream", error);
                setIsLoading(false);
            }
        };

        loadTrack();
    }, [currentTrack, config.api_url]);

    // Optimized progress tracking with requestAnimationFrame
    useEffect(() => {
        const checkProgress = () => {
            if (audioRef.current && !audioRef.current.paused) {
                const currentTime = audioRef.current.currentTime;
                const d = durationRef.current;
                setProgress(currentTime);

                // Manual end detection using the LOCKED duration from metadata
                if (d > 0 && currentTime >= d - 0.5) {
                    console.log("[PLAYER] Manual end triggered at Locked Duration:", d);
                    handleEnded();
                    return;
                }

                rafRef.current = requestAnimationFrame(checkProgress);
            }
        };

        if (isPlaying) {
            rafRef.current = requestAnimationFrame(checkProgress);
        } else {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        }

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isPlaying]);

    // Audio events
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // We still listen to timeupdate for low-frequency updates (e.g. background audio)
        // But rAF handles the UI smoothness when active.
        const updateProgress = () => {
            // ALWAYS update progress here as fallback for when rAF is throttled in background
            setProgress(audio.currentTime);

            // Update MediaSession position state
            if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
                try {
                    const d = durationRef.current;
                    navigator.mediaSession.setPositionState({
                        duration: d || 0,
                        playbackRate: audio.playbackRate || 1,
                        position: audio.currentTime
                    });
                } catch (e) { /* ignore */ }
            }

            // Persistence logic remains here (fires less frequently)
            const user = userRef.current;
            const track = currentTrackRef.current;
            if (isAuthenticatedRef.current && user && track && hasRestoredRef.current) {
                localStorage.setItem(`mobify_playback_state_${user.id}`, JSON.stringify({
                    videoId: track.id,
                    time: audio.currentTime
                }));
            }
        };

        // (handleEnded moved to top level)

        const handleCanPlay = () => {
            // we NO LONGER trust audio.duration on mobile. 
            // We use durationRef.current which was set from YouTube metadata.

            // Restore logic...
            const user = userRef.current;
            const track = currentTrackRef.current;
            if (isAuthenticatedRef.current && user && track && !hasRestoredRef.current) {
                const savedStateJson = localStorage.getItem(`mobify_playback_state_${user.id}`);
                if (savedStateJson) {
                    try {
                        const savedState = JSON.parse(savedStateJson);
                        if (savedState.videoId === track.id) {
                            const time = parseFloat(savedState.time);
                            if (time > 0 && time < (audio.duration || 1000)) {
                                console.log(`[PLAYER] RESUMING at: ${time}s`);
                                audio.currentTime = time;
                                setProgress(time);
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                }
                hasRestoredRef.current = true;
            }
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('loadedmetadata', handleCanPlay);
        audio.addEventListener('play', () => setIsPlaying(true));
        audio.addEventListener('pause', () => setIsPlaying(false));

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('loadedmetadata', handleCanPlay);
            audio.removeEventListener('play', () => setIsPlaying(true));
            audio.removeEventListener('pause', () => setIsPlaying(false));
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [onNext]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        // setIsPlaying updated via event listeners 'play'/'pause' to ensure source of truth
    };

    const handleSeek = (e) => {
        if (!audioRef.current) return;
        const newTime = Number(e.target.value);
        try {
            audioRef.current.currentTime = newTime;
            setProgress(newTime);
        } catch (err) {
            console.warn('Seek not supported for this stream');
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = Number(e.target.value);
        setVolume(newVolume);

        // Save volume
        localStorage.setItem('mobify_volume', newVolume.toString());

        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        if (!audioRef.current) return;
        if (isMuted) {
            audioRef.current.volume = volume || 0.5;
            setIsMuted(false);
        } else {
            audioRef.current.volume = 0;
            setIsMuted(true);
        }
    };

    const handleFavoriteClick = async () => {
        if (!isAuthenticated) {
            openAuthModal();
            return;
        }

        try {
            if (isFavorite) {
                await likedAPI.remove(currentTrack.id);
                setIsFavorite(false);
            } else {
                await likedAPI.add(currentTrack);
                setIsFavorite(true);
            }
            if (onLibraryUpdate) onLibraryUpdate();
        } catch (error) {
            console.error('Failed to toggle favorite', error);
        }
    };

    const handlePlaylistClick = () => {
        if (!isAuthenticated) {
            openAuthModal();
            return;
        }
        setIsPlaylistPickerOpen(true);
    };

    const formatTime = (time) => {
        if (!time || isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    if (!currentTrack) return null;

    const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

    return (
        <>
            <div className={`player-bar glass-panel ${isFullScreen ? 'hidden' : ''}`}>
                <div className="player-left" onClick={() => setIsFullScreen(true)}>
                    <div className="mini-cover-wrapper">
                        <img src={currentTrack.thumbnail} alt="cover" className="mini-cover" />
                        {isLoading && <div className="mini-loader"></div>}
                    </div>
                    <div className="mini-info">
                        <div className="mini-title">{currentTrack.title}</div>
                        <div className="mini-artist">{currentTrack.uploader}</div>
                    </div>
                </div>

                <div className="player-center">
                    <div className="mini-progress-bar">
                        <div className="mini-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>

                <div className="player-controls-mini">
                    <button onClick={togglePlay} className="btn-play-mini" disabled={isLoading}>
                        {isLoading ? (
                            <div className="btn-loader"></div>
                        ) : isPlaying ? (
                            <Pause size={28} />
                        ) : (
                            <Play size={28} style={{ marginLeft: '2px' }} />
                        )}
                    </button>
                </div>
            </div>

            <div className={`player-fullscreen ${isFullScreen ? 'active' : ''}`}>
                <div className="fs-backdrop" style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}></div>
                <div className="fs-content">
                    <div className="fs-header">
                        <button className="icon-btn" onClick={() => setIsFullScreen(false)}>
                            <ChevronDown size={28} />
                        </button>
                        <span className="fs-header-title">Now Playing</span>
                        <div className="fs-header-actions">
                            <button
                                className={`icon-btn ${showQueue ? 'active-text' : ''}`}
                                onClick={() => { setShowQueue(!showQueue); setShowLyrics(false); }}
                                title="Queue"
                            >
                                <ListPlus size={24} />
                            </button>
                            <button
                                className={`icon-btn ${showLyrics ? 'active-text' : ''}`}
                                onClick={() => setShowLyrics(!showLyrics)}
                                title="Lyrics"
                            >
                                <Mic2 size={24} />
                            </button>
                            <button className="icon-btn" onClick={handleFavoriteClick}>
                                <Heart size={24} fill={isFavorite ? '#ef4444' : 'transparent'} color={isFavorite ? '#ef4444' : 'white'} />
                            </button>
                        </div>
                    </div>

                    <div className="fs-art-container">
                        <img
                            src={currentTrack.thumbnail}
                            alt="cover"
                            className={`fs-art ${isPlaying ? 'playing' : ''}`}
                        />
                    </div>

                    <div className="fs-info">
                        <h2 className="fs-title">{currentTrack.title}</h2>
                        <p className="fs-artist">{currentTrack.uploader}</p>
                    </div>

                    <div className="fs-progress">
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={progress}
                            onChange={handleSeek}
                            className="progress-slider"
                            style={{ '--progress': `${progressPercent}%` }}
                        />
                        <div className="fs-time">
                            <span>{formatTime(progress)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="fs-controls">
                        <div className="playback-group">
                            <button className={`icon-btn secondary-btn shuffle-btn ${isShuffle ? 'active' : ''}`} onClick={onToggleShuffle}>
                                <Shuffle size={20} />
                            </button>
                            <button className="icon-btn control-btn" onClick={onPrev}>
                                <SkipBack size={32} />
                            </button>
                            <button className="btn-play-fs" onClick={togglePlay} disabled={isLoading}>
                                {isLoading ? (
                                    <div className="btn-loader-lg"></div>
                                ) : isPlaying ? (
                                    <Pause size={36} />
                                ) : (
                                    <Play size={36} style={{ marginLeft: '4px' }} />
                                )}
                            </button>
                            <button className="icon-btn control-btn" onClick={onNext}>
                                <SkipForward size={32} />
                            </button>
                        </div>
                    </div>

                    <div className="fs-volume">
                        <button className="icon-btn" onClick={toggleMute}>
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="volume-slider"
                            style={{ '--volume': `${(isMuted ? 0 : volume) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            <PlaylistPicker
                track={currentTrack}
                isOpen={isPlaylistPickerOpen}
                onClose={() => setIsPlaylistPickerOpen(false)}
                onUpdate={onLibraryUpdate}
            />

            <Lyrics
                lyrics={lyrics}
                currentTime={progress}
                isOpen={isFullScreen && showLyrics}
                onClose={() => setShowLyrics(false)}
            />

            <Queue
                queue={queue}
                isOpen={isFullScreen && showQueue}
                onReorder={onQueueReorder}
                onRemove={onQueueRemove}
                onClose={() => setShowQueue(false)}
            />
        </>
    );
};

export default Player;
