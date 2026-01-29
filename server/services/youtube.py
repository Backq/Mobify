from pytubefix import YouTube, Search
from pytubefix.cli import on_progress
import asyncio
from typing import List, Dict

class YouTubeService:
    def __init__(self):
        pass
        
    async def search(self, query: str, limit: int = 10, offset: int = 0) -> List[Dict]:
        """
        Search for videos using pytubefix with pagination
        """
        try:
            loop = asyncio.get_event_loop()
            # Run blocking search in executor
            results = await loop.run_in_executor(None, self._search_sync, query, limit, offset)
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
            
            # Use use_po_token=True if needed, but standard usually works with pytubefix
            stream_url = await loop.run_in_executor(None, self._get_audio_url_sync, url)
            
            # We need to fetch metadata again or just return basic info + stream url
            # Since we scrape metadata in search, we might miss it here if we just use ID.
            # But pytubefix YouTube object has metadata.
            
            return {
                'id': video_id,
                'stream_url': stream_url
            }
        except Exception as e:
            raise Exception(f"Failed to get stream: {str(e)}")

    def _get_audio_url_sync(self, url: str):
        yt = YouTube(url, on_progress_callback=on_progress)
        # Get best audio stream
        stream = yt.streams.get_audio_only()
        return stream.url

youtube_service = YouTubeService()
