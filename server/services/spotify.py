import spotipy
from spotipy.oauth2 import SpotifyOAuth
from core.config import CONFIG
import httpx
import time

class SpotifyService:
    def __init__(self):
        self.client_id = CONFIG.spotify.client_id
        self.client_secret = CONFIG.spotify.client_secret
        self.redirect_uri = CONFIG.spotify.redirect_uri
        self.scope = "user-library-read playlist-read-private playlist-read-collaborative"

    async def get_tracks_by_url(self, url: str):
        """Fetch tracks using spotdown.org API (public playlists only)"""
        print(f"[SPOTIFY] DEBUG: Fetching tracks from SpotDown for URL: {url}")
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    "https://spotdown.org/api/song-details",
                    params={"url": url},
                    timeout=20.0 # Reduced timeout slightly
                )
                print(f"[SPOTIFY] DEBUG: SpotDown Response Status: {response.status_code}")
                if response.status_code != 200:
                    print(f"[SPOTIFY] DEBUG: SpotDown Error Response: {response.text}")
                    return []
                    
                data = response.json()
                
                if "songs" not in data:
                    print(f"[SPOTIFY] DEBUG: No 'songs' field in response data: {data}")
                    return []
                
                tracks = data["songs"]
                print(f"[SPOTIFY] DEBUG: Found {len(tracks)} tracks in SpotDown response")
                
                formatted_tracks = []
                for song in tracks:
                    formatted_tracks.append({
                        'title': song.get('title', 'Unknown Title'),
                        'artist': song.get('artist', 'Unknown Artist'),
                        'thumbnail': song.get('thumbnail'),
                        'album': song.get('album', 'Unknown Album'),
                        'duration_seconds': self._parse_duration(song.get('duration', '0:00'))
                    })
                return formatted_tracks
            except httpx.TimeoutException:
                print("[SPOTIFY] DEBUG: SpotDown API timed out")
                return []
            except Exception as e:
                print(f"Error fetching tracks from SpotDown: {type(e).__name__}: {e}")
                return []

    def _parse_duration(self, duration_str):
        try:
            parts = duration_str.split(':')
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            return 0
        except:
            return 0

    def get_auth_manager(self):
        return SpotifyOAuth(
            client_id=self.client_id,
            client_secret=self.client_secret,
            redirect_uri=self.redirect_uri,
            scope=self.scope,
            open_browser=False
        )

    def get_authorize_url(self):
        return self.get_auth_manager().get_authorize_url()

    def get_tokens(self, code):
        return self.get_auth_manager().get_access_token(code)

    def get_client(self, access_token):
        return spotipy.Spotify(auth=access_token)

    def get_user_playlists(self, access_token):
        sp = self.get_client(access_token)
        results = sp.current_user_playlists()
        playlists = []
        for item in results['items']:
            playlists.append({
                'id': item['id'],
                'name': item['name'],
                'tracks_count': item['tracks']['total'],
                'image': item['images'][0]['url'] if item['images'] else None
            })
        return playlists

    def get_playlist_tracks(self, access_token, playlist_id):
        sp = self.get_client(access_token)
        results = sp.playlist_items(playlist_id)
        tracks = []
        for item in results['items']:
            if not item.get('track'): continue
            track = item['track']
            tracks.append(self._format_track(track))
        
        # Handle pagination
        while results['next']:
            results = sp.next(results)
            for item in results['items']:
                if not item.get('track'): continue
                tracks.append(self._format_track(item['track']))
                
        return tracks

    def get_user_saved_tracks(self, access_token):
        sp = self.get_client(access_token)
        results = sp.current_user_saved_tracks()
        tracks = []
        for item in results['items']:
            if not item.get('track'): continue
            tracks.append(self._format_track(item['track']))
            
        while results['next']:
            results = sp.next(results)
            for item in results['items']:
                if not item.get('track'): continue
                tracks.append(self._format_track(item['track']))
                
        return tracks

    def _format_track(self, track):
        return {
            'id': track['id'],
            'title': track['name'],
            'artist': ', '.join([a['name'] for a in track['artists']]),
            'album': track['album']['name'],
            'thumbnail': track['album']['images'][0]['url'] if track['album']['images'] else None,
            'duration_ms': track['duration_ms'],
            'duration_seconds': track['duration_ms'] // 1000
        }

spotify_service = SpotifyService()
