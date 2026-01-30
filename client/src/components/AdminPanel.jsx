import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Check, Link as LinkIcon, Music, ListMusic, Download, ArrowLeft, ExternalLink, Loader, Youtube } from 'lucide-react';
import { spotifyAPI, youtubeAPI } from '../services/api';
import './AdminPanel.css';

const AdminPanel = ({ onBack, onUpdateLibrary }) => {
    const [status, setStatus] = useState({ connected: false, token_expired: true });
    const [playlists, setPlaylists] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [importingId, setImportingId] = useState(null);
    const [message, setMessage] = useState('');
    const [directUrl, setDirectUrl] = useState('');
    const [directName, setDirectName] = useState('');

    // YouTube specific state
    const [ytUrl, setYtUrl] = useState('');
    const [ytName, setYtName] = useState('');

    useEffect(() => {
        // We skip spotify status check because auth is disabled for now
        // checkStatus();
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
        alert("Spotify OAuth is currently disabled due to developer portal restrictions. Please use the Direct Import via URL below.");
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

    const handleYoutubeImport = async (e) => {
        e.preventDefault();
        if (!ytUrl || !ytName) {
            setMessage('Please fill in both YouTube URL and Name');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setImportingId('youtube');
        setMessage(`Importing YouTube playlist...`);
        try {
            const result = await youtubeAPI.importPlaylistByUrl(ytUrl, ytName);
            setMessage(`Successfully imported ${result.imported_count} tracks from YouTube!`);
            setYtUrl('');
            setYtName('');
            if (onUpdateLibrary) onUpdateLibrary();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Failed to import YouTube playlist. Check if it is public.');
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
                    {message && <div className="admin-message">{message}</div>}

                    {/* YouTube Playlist Import */}
                    <section className="admin-section">
                        <div className="section-header">
                            <Youtube size={20} className="section-icon youtube-icon-color" />
                            <h3>YouTube Playlist Import</h3>
                        </div>
                        <div className="direct-import-form">
                            <p className="section-desc">Paste a public YouTube playlist URL to import all tracks.</p>
                            <form onSubmit={handleYoutubeImport}>
                                <div className="admin-input-group">
                                    <input
                                        type="text"
                                        placeholder="YouTube Playlist URL (e.g. https://www.youtube.com/playlist?list=...)"
                                        value={ytUrl}
                                        onChange={(e) => setYtUrl(e.target.value)}
                                        className="admin-input"
                                    />
                                </div>
                                <div className="admin-input-group">
                                    <input
                                        type="text"
                                        placeholder="Playlist Name in Mobify"
                                        value={ytName}
                                        onChange={(e) => setYtName(e.target.value)}
                                        className="admin-input"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="primary-btn youtube-import-btn"
                                    disabled={importingId !== null}
                                >
                                    {importingId === 'youtube' ? <Loader className="spin" size={18} /> : <Download size={18} />}
                                    Start YouTube Import
                                </button>
                            </form>
                        </div>
                    </section>

                    <section className="admin-section">
                        <div className="section-header">
                            <ExternalLink size={20} className="section-icon" />
                            <h3>Spotify Playlist Import</h3>
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
                                    Start Spotify Import
                                </button>
                            </form>
                        </div>
                    </section>
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
