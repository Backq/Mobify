import { useState, useEffect } from 'react';
import { X, Plus, Loader, ListMusic } from 'lucide-react';
import { playlistAPI } from '../services/api';
import './PlaylistPicker.css';

const PlaylistPicker = ({ track, isOpen, onClose, onUpdate }) => {
    const [playlists, setPlaylists] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchPlaylists();
        }
    }, [isOpen]);

    const fetchPlaylists = async () => {
        setIsLoading(true);
        try {
            const data = await playlistAPI.getAll();
            setPlaylists(data.playlists || []);
        } catch (error) {
            console.error('Failed to fetch playlists', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToPlaylist = async (playlistId) => {
        try {
            await playlistAPI.addTrack(playlistId, track);
            if (onUpdate) onUpdate();
            setMessage('Added to playlist!');
            setTimeout(() => {
                setMessage('');
                onClose();
            }, 1500);
        } catch (error) {
            setMessage('Failed to add track');
            setTimeout(() => setMessage(''), 2000);
        }
    };

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;

        setIsLoading(true);
        try {
            const newPlaylist = await playlistAPI.create(newPlaylistName);
            setPlaylists(prev => [newPlaylist, ...prev]);
            setNewPlaylistName('');
            setIsCreating(false);
        } catch (error) {
            console.error('Failed to create playlist', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="pp-overlay" onClick={onClose}>
            <div className="pp-modal glass-panel" onClick={e => e.stopPropagation()}>
                <div className="pp-header">
                    <h3>Add to Playlist</h3>
                    <button className="pp-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="pp-content">
                    {message && <div className="pp-message">{message}</div>}

                    <div className="pp-list">
                        <button className="pp-create-trigger" onClick={() => setIsCreating(true)}>
                            <Plus size={20} />
                            <span>Create New Playlist</span>
                        </button>

                        {isCreating && (
                            <form className="pp-create-form" onSubmit={handleCreatePlaylist}>
                                <input
                                    type="text"
                                    placeholder="Playlist name..."
                                    value={newPlaylistName}
                                    onChange={(e) => setNewPlaylistName(e.target.value)}
                                    autoFocus
                                />
                                <div className="pp-create-actions">
                                    <button type="button" onClick={() => setIsCreating(false)}>Cancel</button>
                                    <button type="submit" disabled={isLoading}>Create</button>
                                </div>
                            </form>
                        )}

                        {isLoading && !isCreating ? (
                            <div className="pp-loader"><Loader className="spin" /></div>
                        ) : (
                            playlists.map(playlist => (
                                <button
                                    key={playlist.id}
                                    className="pp-item"
                                    onClick={() => handleAddToPlaylist(playlist.id)}
                                >
                                    <ListMusic size={20} />
                                    <span>{playlist.name}</span>
                                </button>
                            ))
                        )}

                        {!isLoading && playlists.length === 0 && !isCreating && (
                            <div className="pp-empty">No playlists yet</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaylistPicker;
