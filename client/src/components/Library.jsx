import { useState, useEffect } from 'react';
import { Heart, ListMusic, Plus, Play, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { likedAPI, playlistAPI } from '../services/api';
import './Library.css';

const Library = ({ onTrackSelect, onPlaylistSelect, libraryUpdateTrigger, onUpdate }) => {
    const { isAuthenticated } = useAuth();
    const [likedSongs, setLikedSongs] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [activeSection, setActiveSection] = useState(null); // null, 'liked', or playlist id

    useEffect(() => {
        if (isAuthenticated) {
            loadLibrary();
        }
    }, [isAuthenticated, libraryUpdateTrigger]);

    const loadLibrary = async () => {
        setIsLoading(true);
        try {
            const [likedRes, playlistsRes] = await Promise.all([
                likedAPI.getAll(),
                playlistAPI.getAll()
            ]);
            setLikedSongs(likedRes.tracks || []);
            setPlaylists(playlistsRes.playlists || []);
        } catch (error) {
            console.error('Failed to load library', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;

        try {
            await playlistAPI.create(newPlaylistName.trim());
            setNewPlaylistName('');
            setShowCreatePlaylist(false);
            loadLibrary();
        } catch (error) {
            console.error('Failed to create playlist', error);
        }
    };

    const handleDeletePlaylist = async (e, playlistId) => {
        e.stopPropagation();
        if (!confirm('Delete this playlist?')) return;

        try {
            await playlistAPI.delete(playlistId);
            loadLibrary();
        } catch (error) {
            console.error('Failed to delete playlist', error);
        }
    };

    const handlePlayLiked = (index = 0) => {
        if (likedSongs.length > 0) {
            onTrackSelect(likedSongs[index], likedSongs);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="library-section">
            <h2 className="library-title">Your Library</h2>

            {isLoading ? (
                <div className="library-loading">Loading your library...</div>
            ) : (
                <div className="library-grid">
                    {/* Liked Songs Card */}
                    <div
                        className="library-card liked-card"
                        onClick={() => setActiveSection(activeSection === 'liked' ? null : 'liked')}
                    >
                        <div className="library-card-icon">
                            <Heart size={24} fill="currentColor" />
                        </div>
                        <div className="library-card-info">
                            <span className="library-card-name">Liked Songs</span>
                            <span className="library-card-count">{likedSongs.length} tracks</span>
                        </div>
                        <ChevronRight size={20} className={`library-card-arrow ${activeSection === 'liked' ? 'expanded' : ''}`} />
                    </div>

                    {/* Liked Songs Expanded */}
                    {activeSection === 'liked' && likedSongs.length > 0 && (
                        <div className="library-expanded">
                            {likedSongs.map((track, index) => (
                                <div
                                    key={track.id}
                                    className="library-track"
                                    onClick={() => handlePlayLiked(index)}
                                >
                                    <img src={track.thumbnail} alt="" className="library-track-thumb" />
                                    <div className="library-track-info">
                                        <div className="library-track-title">{track.title}</div>
                                        <div className="library-track-artist">{track.uploader}</div>
                                    </div>
                                    <Play size={18} className="library-track-play" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Playlists */}
                    {playlists.map(playlist => (
                        <div key={playlist.id}>
                            <div
                                className="library-card"
                                onClick={() => setActiveSection(activeSection === playlist.id ? null : playlist.id)}
                            >
                                <div className="library-card-icon playlist-icon">
                                    <ListMusic size={24} />
                                </div>
                                <div className="library-card-info">
                                    <span className="library-card-name">{playlist.name}</span>
                                    <span className="library-card-count">{playlist.track_count} tracks</span>
                                </div>
                                <button
                                    className="library-card-delete"
                                    onClick={(e) => handleDeletePlaylist(e, playlist.id)}
                                >
                                    <Trash2 size={16} />
                                </button>
                                <ChevronRight size={20} className={`library-card-arrow ${activeSection === playlist.id ? 'expanded' : ''}`} />
                            </div>

                            {activeSection === playlist.id && (
                                <PlaylistTracks
                                    playlistId={playlist.id}
                                    onTrackSelect={onTrackSelect}
                                    libraryUpdateTrigger={libraryUpdateTrigger}
                                />
                            )}
                        </div>
                    ))}

                    {/* Create Playlist Button */}
                    {showCreatePlaylist ? (
                        <form className="create-playlist-form" onSubmit={handleCreatePlaylist}>
                            <input
                                type="text"
                                placeholder="Playlist name..."
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                className="create-playlist-input"
                                autoFocus
                            />
                            <button type="submit" className="create-playlist-btn">Create</button>
                            <button
                                type="button"
                                className="create-playlist-cancel"
                                onClick={() => setShowCreatePlaylist(false)}
                            >
                                Cancel
                            </button>
                        </form>
                    ) : (
                        <button
                            className="library-card create-card"
                            onClick={() => setShowCreatePlaylist(true)}
                        >
                            <div className="library-card-icon">
                                <Plus size={24} />
                            </div>
                            <span className="library-card-name">Create Playlist</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// Sub-component for playlist tracks
const PlaylistTracks = ({ playlistId, onTrackSelect, libraryUpdateTrigger }) => {
    const [tracks, setTracks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTracks();
    }, [playlistId, libraryUpdateTrigger]);

    const loadTracks = async () => {
        try {
            const data = await playlistAPI.get(playlistId);
            setTracks(data.tracks || []);
        } catch (error) {
            console.error('Failed to load playlist tracks', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="library-expanded-loading">Loading...</div>;
    }

    if (tracks.length === 0) {
        return <div className="library-expanded-empty">No tracks yet</div>;
    }

    return (
        <div className="library-expanded">
            {tracks.map((track, index) => (
                <div
                    key={track.id}
                    className="library-track"
                    onClick={() => onTrackSelect(track, tracks)}
                >
                    <img src={track.thumbnail} alt="" className="library-track-thumb" />
                    <div className="library-track-info">
                        <div className="library-track-title">{track.title}</div>
                        <div className="library-track-artist">{track.uploader}</div>
                    </div>
                    <Play size={18} className="library-track-play" />
                </div>
            ))}
        </div>
    );
};

export default Library;
