from pytubefix import YouTube, Search, Playlist
from pytubefix.cli import on_progress
import asyncio
import time
import socket
from typing import List, Dict

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
        pass
        
    async def search(self, query: str, limit: int = 10, offset: int = 0) -> List[Dict]:
        """
        Search for videos using pytubefix with pagination
        """
        try:
            print(f"[DEBUG] Searching for: {query}")
            loop = asyncio.get_event_loop()
            # Run blocking search in executor
            print("[DEBUG] Running search in executor...")
            results = await loop.run_in_executor(None, self._search_sync, query, limit, offset)
            print(f"[DEBUG] Search finished. Found {len(results)} items.")
            return results
        except Exception as e:
            print(f"[ERROR] Search failed: {e}")
            return []

    def _search_sync(self, query: str, limit: int, offset: int):
        # Append "official audio" to try and get the album version (better lyrics sync)
        search_query = f"{query} official audio" if "audio" not in query.lower() else query
        s = Search(search_query)
        results = []
        # Get videos from offset to offset+limit
        videos_to_fetch = s.videos[offset:offset + limit]
        for vid in videos_to_fetch:
            try:
                results.append({
                    'id': vid.video_id,
                    'title': vid.title,
                    'uploader': vid.author,
                    'duration': vid.length,
                    'thumbnail': vid.thumbnail_url,
                    'url': vid.watch_url
                })
            except Exception as e:
                print(f"Error parsing video: {e}")
                continue
        return results

    async def get_stream_url(self, video_id: str):
        """
        Get the direct stream URL using pytubefix
        """
        try:
            url = f"https://www.youtube.com/watch?v={video_id}"
            loop = asyncio.get_event_loop()
            
            # Fetch metadata and stream info
            data = await loop.run_in_executor(None, self._get_stream_details_sync, url)
            
            return {
                'id': video_id,
                'stream_url': data['stream_url'],
                'title': data['title'],
                'duration': data['duration']
            }
        except Exception as e:
            raise Exception(f"Failed to get stream: {str(e)}")

    def _get_stream_details_sync(self, url: str):
        yt = YouTube(url, on_progress_callback=on_progress)
        stream = yt.streams.get_audio_only()
        return {
            'stream_url': stream.url,
            'title': yt.title,
            'duration': yt.length
        }

    async def get_playlist_tracks(self, playlist_url: str) -> List[Dict]:
        """
        Extract tracks from a YouTube playlist URL
        """
        try:
            loop = asyncio.get_event_loop()
            tracks = await loop.run_in_executor(None, self._get_playlist_tracks_sync, playlist_url)
            return tracks
        except Exception as e:
            print(f"[ERROR] Failed to fetch playlist tracks: {e}")
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
            except Exception as e:
                print(f"Error parsing video in playlist: {e}")
                continue
        return results

    def _get_audio_url_sync(self, url: str):
        yt = YouTube(url, on_progress_callback=on_progress)
        # Get best audio stream
        stream = yt.streams.get_audio_only()
        return stream.url

youtube_service = YouTubeService()
