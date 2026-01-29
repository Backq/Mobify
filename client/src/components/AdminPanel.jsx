import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Check, Link as LinkIcon, Music, ListMusic, Download, ArrowLeft, ExternalLink, Loader } from 'lucide-react';
import { spotifyAPI } from '../services/api';
import './AdminPanel.css';

const AdminPanel = ({ onBack, onUpdateLibrary }) => {
    const [status, setStatus] = useState({ connected: false, token_expired: true });
    const [playlists, setPlaylists] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [importingId, setImportingId] = useState(null);
    const [message, setMessage] = useState('');
    const [directUrl, setDirectUrl] = useState('');
    const [directName, setDirectName] = useState('');

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const data = await spotifyAPI.getStatus();
            setStatus(data);
            if (data.connected && !data.token_expired) {
                fetchPlaylists();
            } else {
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Failed to get Spotify status', error);
            setIsLoading(false);
        }
    };

    const fetchPlaylists = async () => {
        setIsLoading(true);
        try {
            const data = await spotifyAPI.getPlaylists();
            setPlaylists(data || []);
        } catch (error) {
            console.error('Failed to fetch Spotify playlists', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const authUrl = await spotifyAPI.getAuthUrl();
            // We open in same tab for OAuth callback
            window.location.href = authUrl;
        } catch (error) {
            console.error('Failed to get auth URL', error);
        }
    };

    const handleImportPlaylist = async (playlist) => {
        setImportingId(playlist.id);
        setMessage(`Importing ${playlist.name}...`);
        try {
            const result = await spotifyAPI.importPlaylist(playlist.id, playlist.name);
            setMessage(`Successfully imported ${result.imported_count} tracks!`);
            if (onUpdateLibrary) onUpdateLibrary();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Failed to import playlist');
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setImportingId(null);
        }
    };

    const handleDirectImport = async (e) => {
        e.preventDefault();
        if (!directUrl || !directName) {
            setMessage('Please fill in both URL and Name');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setImportingId('direct');
        setMessage(`Importing playlist from URL...`);
        try {
            const result = await spotifyAPI.importPlaylistByUrl(directUrl, directName);
            setMessage(`Successfully imported ${result.imported_count} tracks!`);
            setDirectUrl('');
            setDirectName('');
            if (onUpdateLibrary) onUpdateLibrary();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Failed to import from URL. Check if playlist is public.');
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setImportingId(null);
        }
    };

    const handleImportLiked = async () => {
        setImportingId('liked');
        setMessage('Importing your Liked Songs...');
        try {
            const result = await spotifyAPI.importLiked();
            setMessage(`Successfully imported ${result.imported_count} liked songs!`);
            if (onUpdateLibrary) onUpdateLibrary();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Failed to import liked songs');
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setImportingId(null);
        }
    };

    return (
        <div className="admin-overlay" onClick={onBack}>
            <div className="admin-panel glass-panel animation-slide-up" onClick={e => e.stopPropagation()}>
                <div className="admin-header">
                    <button className="back-btn" onClick={onBack}>
                        <ArrowLeft size={20} />
                    </button>
                    <h2>Admin Settings</h2>
                    <div style={{ width: 24 }}></div>
                </div>

                <div className="admin-content">
                    <section className="admin-section">
                        <div className="section-header">
                            <LinkIcon size={20} className="section-icon" />
                            <h3>Spotify Integration</h3>
                        </div>

                        {!status.connected ? (
                            <div className="connect-card">
                                <p>Connect your Spotify account to import your music library automatically.</p>
                                <button className="connect-spotify-btn" onClick={handleConnect}>
                                    Connect Spotify
                                </button>
                            </div>
                        ) : (
                            <div className="spotify-status-card">
                                <div className="status-info">
                                    <Check size={18} className="status-check" />
                                    <span>Connected to Spotify</span>
                                    {status.token_expired && <span className="status-warning">(Token Expired)</span>}
                                </div>
                                <button className="secondary-btn" onClick={handleConnect}>
                                    <RefreshCw size={16} />
                                    Reconnect
                                </button>
                            </div>
                        )}
                    </section>

                    <section className="admin-section">
                        <div className="section-header">
                            <ExternalLink size={20} className="section-icon" />
                            <h3>Direct Playlist Import</h3>
                        </div>
                        <div className="direct-import-form">
                            <p className="section-desc">Paste a public Spotify playlist URL to import it directly.</p>
                            <form onSubmit={handleDirectImport}>
                                <div className="admin-input-group">
                                    <input
                                        type="text"
                                        placeholder="Spotify Playlist URL (e.g. https://open.spotify.com/playlist/...)"
                                        value={directUrl}
                                        onChange={(e) => setDirectUrl(e.target.value)}
                                        className="admin-input"
                                    />
                                </div>
                                <div className="admin-input-group">
                                    <input
                                        type="text"
                                        placeholder="Playlist Name in Mobify"
                                        value={directName}
                                        onChange={(e) => setDirectName(e.target.value)}
                                        className="admin-input"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="primary-btn"
                                    disabled={importingId !== null}
                                >
                                    {importingId === 'direct' ? <Loader className="spin" size={18} /> : <Download size={18} />}
                                    Start Direct Import
                                </button>
                            </form>
                        </div>
                    </section>

                    {status.connected && (
                        <section className="admin-section">
                            <div className="section-header">
                                <Music size={20} className="section-icon" />
                                <h3>Transfer Music</h3>
                            </div>

                            {message && <div className="admin-message">{message}</div>}

                            <div className="transfer-actions">
                                <button
                                    className="import-action-card"
                                    onClick={handleImportLiked}
                                    disabled={importingId !== null}
                                >
                                    <div className="action-icon liked-icon">
                                        <Download size={24} />
                                    </div>
                                    <div className="action-info">
                                        <span className="action-title">Import Liked Songs</span>
                                        <span className="action-desc">Add your Spotify faves to Mobify</span>
                                    </div>
                                    {importingId === 'liked' && <Loader className="spin" size={20} />}
                                </button>
                            </div>

                            <h4 className="sub-section-title">Your Spotify Playlists</h4>
                            <div className="spotify-playlists-grid">
                                {isLoading ? (
                                    <div className="admin-loader"><RefreshCw className="spin" /></div>
                                ) : (
                                    playlists.map(playlist => (
                                        <div key={playlist.id} className="spotify-playlist-item">
                                            <img src={playlist.image} alt={playlist.name} className="sp-thumb" />
                                            <div className="sp-info">
                                                <span className="sp-name">{playlist.name}</span>
                                                <span className="sp-count">{playlist.tracks_count} tracks</span>
                                            </div>
                                            <button
                                                className="sp-import-btn"
                                                onClick={() => handleImportPlaylist(playlist)}
                                                disabled={importingId !== null}
                                            >
                                                {importingId === playlist.id ? (
                                                    <Loader className="spin" size={18} />
                                                ) : (
                                                    <Download size={18} />
                                                )}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    )}
                </div>

                <footer className="admin-footer">
                    <p>MOBIFY made with <span className="heart">❤️</span> by back</p>
                    <p className="footer-sub">thanks to spotify to being dumb once again</p>
                </footer>
            </div>
        </div>
    );
};

export default AdminPanel;
