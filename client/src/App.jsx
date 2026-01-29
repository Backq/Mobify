import { useState, useEffect } from 'react';
import { ConfigProvider } from './contexts/ConfigContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Search from './components/Search';
import Player from './components/Player';
import Library from './components/Library';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import GuestCTA from './components/GuestCTA';
import { spotifyAPI } from './services/api';
import { LogOut, User as UserIcon, Settings, Home } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import './App.css';

function AppContent() {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [shuffledQueue, setShuffledQueue] = useState([]);
  const [libraryUpdateTrigger, setLibraryUpdateTrigger] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  useEffect(() => {
    // Check for Spotify OAuth callback code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('spotify_code');
    if (code && isAuthenticated) {
      handleSpotifyConnect(code);
    }
  }, [isAuthenticated]);

  // Load persisted track and queue on mount/auth change
  useEffect(() => {
    if (isAuthenticated && user) {
      const savedTrack = localStorage.getItem(`mobify_last_track_${user.id}`);
      const savedQueue = localStorage.getItem(`mobify_last_queue_${user.id}`);

      if (savedTrack) {
        try {
          setCurrentTrack(JSON.parse(savedTrack));
        } catch (e) {
          console.error("Failed to parse saved track", e);
        }
      }

      if (savedQueue) {
        try {
          setQueue(JSON.parse(savedQueue));
        } catch (e) {
          console.error("Failed to parse saved queue", e);
        }
      }
    } else if (!isAuthenticated) {
      setCurrentTrack(null);
      setQueue([]);
    }
  }, [isAuthenticated, user?.id]);

  // Save current track and queue to localStorage
  useEffect(() => {
    if (isAuthenticated && user) {
      if (currentTrack) {
        localStorage.setItem(`mobify_last_track_${user.id}`, JSON.stringify(currentTrack));
      }
      if (queue.length > 0) {
        localStorage.setItem(`mobify_last_queue_${user.id}`, JSON.stringify(queue));
      }
    }
  }, [currentTrack, queue, isAuthenticated, user?.id]);

  // Derived active queue
  const activeQueue = isShuffle ? shuffledQueue : queue;

  // Shuffle Utility
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Handle Shuffle Toggle
  useEffect(() => {
    if (isShuffle) {
      if (queue.length > 0) {
        // Keep current track first, shuffle the rest
        const tracksToShuffle = currentTrack
          ? queue.filter(t => t.id !== currentTrack.id)
          : [...queue];

        const shuffled = shuffleArray(tracksToShuffle);

        if (currentTrack) {
          setShuffledQueue([currentTrack, ...shuffled]);
        } else {
          setShuffledQueue(shuffled);
        }
      } else {
        setShuffledQueue([]);
      }
    }
  }, [isShuffle, queue.length]); // Re-shuffle only on toggle or queue size change? Ideally just toggle.
  // For now, let's just do it on toggle. If queue changes while shuffling, 
  // we might need to sync. Simple solution: reset shuffle if queue heavily changes.

  const handleSpotifyConnect = async (code) => {
    try {
      await spotifyAPI.connect(code);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsAdminPanelOpen(true);
    } catch (error) {
      console.error('Failed to connect Spotify', error);
    }
  };

  const triggerLibraryUpdate = () => setLibraryUpdateTrigger(prev => prev + 1);

  const handleTrackSelect = (track, trackList = []) => {
    setShouldAutoPlay(true);
    setCurrentTrack(track);
    if (trackList.length > 0) {
      setQueue(trackList);
    } else if (!queue.find(t => t.id === track.id)) {
      setQueue(prev => [...prev, track]);
    }
  };

  const handleNext = () => {
    setShouldAutoPlay(true);
    if (!currentTrack) return;
    const list = activeQueue;
    if (list.length === 0) return;

    const idx = list.findIndex(t => t.id === currentTrack.id);
    if (idx !== -1 && idx < list.length - 1) {
      setCurrentTrack(list[idx + 1]);
    } else if (isShuffle && list.length > 0) {
      // Loop back to start in shuffle mode? Or just stop? 
      // User generic player usually stops or loops. Let's loop for shuffle.
      setCurrentTrack(list[0]);
    }
  };

  const handlePrev = () => {
    setShouldAutoPlay(true);
    if (!currentTrack) return;
    const list = activeQueue;
    if (list.length === 0) return;

    const idx = list.findIndex(t => t.id === currentTrack.id);
    if (idx > 0) {
      setCurrentTrack(list[idx - 1]);
    }
  };

  const handleQueueReorder = (oldIndex, newIndex) => {
    if (isShuffle) {
      setShuffledQueue((items) => arrayMove(items, oldIndex, newIndex));
    } else {
      setQueue((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  const handleRemoveFromQueue = (trackToRemove) => {
    const id = trackToRemove.uniqueId || trackToRemove.id;
    // Remove from BOTH queues to keep them in sync regardless of view
    setQueue((prev) => prev.filter((t) => (t.uniqueId || t.id) !== id));
    if (isShuffle) {
      setShuffledQueue((prev) => prev.filter((t) => (t.uniqueId || t.id) !== id));
    }
  };

  return (
    <>
      <header className="app-header-bar">
        <div className="header-left">
          <h1 className="header-logo">Mobify</h1>
        </div>
        <div className="header-right">
          <button className="header-icon-btn" onClick={() => window.location.reload()} title="Dashboard">
            <Home size={22} />
          </button>
          {isAuthenticated ? (
            <div className="user-profile">
              <div className="user-info">
                <UserIcon size={18} className="user-icon" />
                <span className="user-username">{user.username}</span>
              </div>
              <div className="header-divider"></div>
              <button
                className={`header-icon-btn ${isAdminPanelOpen ? 'active' : ''}`}
                onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                title="Settings"
              >
                <Settings size={18} />
              </button>
              <button className="logout-btn" onClick={logout} title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={openAuthModal}>
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {isAuthenticated ? (
          <Library
            onTrackSelect={handleTrackSelect}
            libraryUpdateTrigger={libraryUpdateTrigger}
            onUpdate={triggerLibraryUpdate}
          />
        ) : (
          <GuestCTA onAction={openAuthModal} />
        )}

        <Search onTrackSelect={handleTrackSelect} />
      </main>

      <Player
        currentTrack={currentTrack}
        onNext={handleNext}
        onPrev={handlePrev}
        onLibraryUpdate={triggerLibraryUpdate}
        isShuffle={isShuffle}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        shouldAutoPlay={shouldAutoPlay}
        queue={activeQueue}
        onQueueReorder={handleQueueReorder}
        onQueueRemove={handleRemoveFromQueue}
      />

      {isAdminPanelOpen && (
        <AdminPanel
          onBack={() => setIsAdminPanelOpen(false)}
          onUpdateLibrary={triggerLibraryUpdate}
        />
      )}

      <AuthModal />
    </>
  );
}

function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
