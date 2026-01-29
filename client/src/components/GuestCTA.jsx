import { Heart, ListMusic, Import, UserPlus } from 'lucide-react';
import './GuestCTA.css';

const GuestCTA = ({ onAction }) => {
    return (
        <div className="guest-cta glass-panel">
            <div className="cta-content">
                <div className="cta-header">
                    <h2>Unlock Full Experience</h2>
                    <p>Join Mobify to curate your personal music journey.</p>
                </div>

                <div className="cta-features">
                    <div className="feature-item">
                        <div className="feature-icon">
                            <Heart size={24} />
                        </div>
                        <div className="feature-text">
                            <h3>Favorites</h3>
                            <p>Save tracks you love.</p>
                        </div>
                    </div>

                    <div className="feature-item">
                        <div className="feature-icon">
                            <ListMusic size={24} />
                        </div>
                        <div className="feature-text">
                            <h3>Playlists</h3>
                            <p>Create custom mixes.</p>
                        </div>
                    </div>

                    <div className="feature-item">
                        <div className="feature-icon">
                            <Import size={24} />
                        </div>
                        <div className="feature-text">
                            <h3>Import</h3>
                            <p>Sync from Spotify.</p>
                        </div>
                    </div>
                </div>

                <button className="cta-button" onClick={onAction}>
                    <UserPlus size={20} />
                    <span>Create Account</span>
                </button>
            </div>

            <div className="cta-decoration-1"></div>
            <div className="cta-decoration-2"></div>
        </div>
    );
};

export default GuestCTA;
