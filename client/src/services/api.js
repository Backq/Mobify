import axios from 'axios';

// In production (built), use relative path which Nginx will proxy to backend.
// In dev, use localhost:8000.
const API_URL = import.meta.env.PROD ? '/api' : `http://${window.location.hostname}:8000`;

// Create axios instance with auth interceptor
const api = axios.create({
    baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('mobify_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ============== Auth ==============

export const authAPI = {
    register: async (username, password) => {
        const res = await api.post('/auth/register', { username, password });
        return res.data;
    },

    login: async (username, password) => {
        const res = await api.post('/auth/login', { username, password });
        return res.data;
    },

    getMe: async () => {
        const res = await api.get('/auth/me');
        return res.data;
    }
};

// ============== Search ==============

export const searchAPI = {
    search: async (query, page = 1) => {
        const res = await api.get('/search', { params: { query, page } });
        return res.data;
    }
};

// ============== Liked Songs ==============

export const likedAPI = {
    getAll: async () => {
        const res = await api.get('/liked');
        return res.data;
    },

    check: async (videoId) => {
        const res = await api.get(`/liked/${videoId}`);
        return res.data.liked;
    },

    add: async (track) => {
        const res = await api.post('/liked', {
            video_id: track.id,
            title: track.title,
            uploader: track.uploader,
            thumbnail: track.thumbnail,
            duration: track.duration
        });
        return res.data;
    },

    remove: async (videoId) => {
        const res = await api.delete(`/liked/${videoId}`);
        return res.data;
    }
};

// ============== Playlists ==============

export const playlistAPI = {
    getAll: async () => {
        const res = await api.get('/playlists');
        return res.data;
    },

    create: async (name) => {
        const res = await api.post('/playlists', { name });
        return res.data;
    },

    get: async (id) => {
        const res = await api.get(`/playlists/${id}`);
        return res.data;
    },

    rename: async (id, name) => {
        const res = await api.put(`/playlists/${id}`, { name });
        return res.data;
    },

    delete: async (id) => {
        const res = await api.delete(`/playlists/${id}`);
        return res.data;
    },

    addTrack: async (playlistId, track) => {
        const res = await api.post(`/playlists/${playlistId}/tracks`, {
            video_id: track.id,
            title: track.title,
            uploader: track.uploader,
            thumbnail: track.thumbnail,
            duration: track.duration
        });
        return res.data;
    },

    removeTrack: async (playlistId, videoId) => {
        const res = await api.delete(`/playlists/${playlistId}/tracks/${videoId}`);
        return res.data;
    }
};

// ============== Spotify ==============

export const spotifyAPI = {
    getAuthUrl: async () => {
        const res = await api.get('/spotify/auth');
        return res.data.auth_url;
    },

    connect: async (code) => {
        const res = await api.post('/spotify/connect', { code });
        return res.data;
    },

    getStatus: async () => {
        const res = await api.get('/spotify/status');
        return res.data;
    },

    getPlaylists: async () => {
        const res = await api.get('/spotify/playlists');
        return res.data.playlists;
    },

    getPlaylistTracks: async (playlistId) => {
        const res = await api.get(`/spotify/playlists/${playlistId}`);
        return res.data.tracks;
    },

    getSavedTracks: async () => {
        const res = await api.get('/spotify/me/tracks');
        return res.data.tracks;
    },

    importPlaylist: async (spotifyId, name) => {
        const res = await api.post('/spotify/import/playlist', { spotify_id: spotifyId, name });
        return res.data;
    },

    importLiked: async () => {
        const res = await api.post('/spotify/import/liked');
        return res.data;
    },

    importPlaylistByUrl: async (url, name) => {
        const res = await api.post('/spotify/import/url', { url, name });
        return res.data;
    }
};

export const youtubeAPI = {
    importPlaylistByUrl: async (url, name) => {
        const res = await api.post('/youtube/import/url', { url, name });
        return res.data;
    }
};

// ============== Stream ==============

export const streamAPI = {
    getStream: async (videoId) => {
        const res = await api.get(`/stream/${videoId}`);
        return res.data;
    }
};

export const lyricsAPI = {
    get: async (query) => {
        const res = await api.get('/lyrics', { params: { query } });
        return res.data;
    }
};


export default api;
