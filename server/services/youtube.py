import asyncio
import socket
import time
from typing import List, Dict
from pytubefix import YouTube, Search, Playlist
from pytubefix.cli import on_progress

# Force IPv4 to avoid YouTube IPv6 blocks on VPS
def force_ipv4():
    old_getaddrinfo = socket.getaddrinfo
    def new_getaddrinfo(*args, **kwargs):
        responses = old_getaddrinfo(*args, **kwargs)
        return [response for response in responses if response[0] == socket.AF_INET]
    socket.getaddrinfo = new_getaddrinfo

force_ipv4()

class YouTubeService:
    def __init__(self):
        # Cache to prevent double-requests (Metadata + Audio Proxy)
        # video_id -> {'data': dict, 'expires': float}
        self.stream_cache = {}

    def _get_cached_stream(self, video_id: str):
        now = time.time()
        if video_id in self.stream_cache:
            item = self.stream_cache[video_id]
            if now < item['expires']:
                print(f"[DEBUG] Cache HIT for {video_id}")
                return item['data']
            else:
                del self.stream_cache[video_id]
        return None

    def _set_cached_stream(self, video_id: str, data: dict):
        self.stream_cache[video_id] = {
            'data': data,
            'expires': time.time() + 600 # Cache for 10 minutes
        }

    async def search(self, query: str, limit: int = 10, offset: int = 0) -> List[Dict]:
        try:
            print(f"[DEBUG] Search: {query}")
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(None, self._search_sync, query, limit, offset)
            return results
        except Exception as e:
            print(f"[ERROR] Search failed: {e}")
            return []

    def _search_sync(self, query: str, limit: int, offset: int):
        # We use a human search query
        s = Search(query)
        results = []
        # Get videos with slice
        videos = s.videos[offset:offset + limit]
        for vid in videos:
            try:
                results.append({
                    'id': vid.video_id,
                    'title': vid.title,
                    'uploader': vid.author,
                    'duration': vid.length,
                    'thumbnail': vid.thumbnail_url,
                    'url': vid.watch_url
                })
            except Exception:
                continue
        return results

    async def get_stream_url(self, video_id: str):
        # Check Cache First
        cached = self._get_cached_stream(video_id)
        if cached: return cached

        try:
            url = f"https://www.youtube.com/watch?v={video_id}"
            loop = asyncio.get_event_loop()
            
            # Using client='MWEB' or 'WEB' often helps on VPS
            # but let's try the user's standard request first
            data = await loop.run_in_executor(None, self._get_audio_url_sync, url)
            
            self._set_cached_stream(video_id, data)
            return data
        except Exception as e:
            print(f"[ERROR] Pytubefix extraction failed: {e}")
            raise Exception(f"Failed to get stream: {str(e)}")

    def _get_audio_url_sync(self, url: str):
        # Default pytubefix logic
        yt = YouTube(url, on_progress_callback=on_progress)
        stream = yt.streams.get_audio_only()
        if not stream:
            raise Exception("No audio stream found")
            
        return {
            'id': yt.video_id,
            'stream_url': stream.url,
            'title': yt.title,
            'duration': yt.length
        }

    async def get_playlist_tracks(self, playlist_url: str) -> List[Dict]:
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._get_playlist_tracks_sync, playlist_url)
        except Exception as e:
            print(f"[ERROR] Playlist failed: {e}")
            return []

    def _get_playlist_tracks_sync(self, url: str):
        pl = Playlist(url)
        results = []
        for video in pl.videos:
            try:
                results.append({
                    'id': video.video_id,
                    'title': video.title,
                    'uploader': video.author,
                    'duration': video.length,
                    'thumbnail': video.thumbnail_url
                })
            except Exception:
                continue
        return results

youtube_service = YouTubeService()
