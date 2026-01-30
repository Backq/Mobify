import asyncio
import json
import subprocess
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
        # We use yt-dlp as it's the most robust bypass for BotDetection
        self.ytdlp_path = "yt-dlp"

    async def search(self, query: str, limit: int = 10, offset: int = 0) -> List[Dict]:
        try:
            print(f"[DEBUG] yt-dlp searching for: {query}")
            # Use ytsearch with limit
            # Note: yt-dlp doesn't have a direct "offset" for search results, 
            # so we fetch more and slice if needed, or just let it be.
            # Usually search isn't the bottleneck.
            cmd = [
                self.ytdlp_path,
                f"ytsearch{limit + offset}:{query}",
                "--dump-json",
                "--flat-playlist",
                "--quiet"
            ]
            
            loop = asyncio.get_event_loop()
            process = await loop.run_in_executor(None, lambda: subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True))
            stdout, stderr = await loop.run_in_executor(None, process.communicate)
            
            results = []
            lines = stdout.strip().split('\n')
            # Handle empty lines or errors
            valid_lines = [line for line in lines if line.strip()]
            
            # Slice for offset/limit
            for line in valid_lines[offset:offset+limit]:
                try:
                    data = json.loads(line)
                    results.append({
                        'id': data.get('id'),
                        'title': data.get('title'),
                        'uploader': data.get('uploader') or data.get('channel'),
                        'duration': int(data.get('duration') or 0),
                        'thumbnail': data.get('thumbnail') or f"https://i.ytimg.com/vi/{data.get('id')}/hqdefault.jpg",
                        'url': f"https://www.youtube.com/watch?v={data.get('id')}"
                    })
                except Exception as e:
                    print(f"Error parsing json line: {e}")
            
            print(f"[DEBUG] Search finished. Found {len(results)} items.")
            return results
        except Exception as e:
            print(f"[ERROR] yt-dlp search failed: {e}")
            return []

    async def get_stream_url(self, video_id: str):
        try:
            url = f"https://www.youtube.com/watch?v={video_id}"
            print(f"[DEBUG] yt-dlp extracting stream for: {video_id}")
            
            # -g returns the stream URL, -e returns the title, --get-duration returns duration
            # Best to use --dump-json to get everything at once reliably
            cmd = [
                self.ytdlp_path,
                "-j",
                "-f", "ba/b", # bestaudio or best
                "--no-playlist",
                url
            ]
            
            loop = asyncio.get_event_loop()
            process = await loop.run_in_executor(None, lambda: subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True))
            stdout, stderr = await loop.run_in_executor(None, process.communicate)
            
            if not stdout.strip():
                raise Exception(f"yt-dlp failed: {stderr}")
                
            data = json.loads(stdout)
            return {
                'id': video_id,
                'stream_url': data.get('url'),
                'title': data.get('title'),
                'duration': int(data.get('duration') or 0)
            }
        except Exception as e:
            print(f"[ERROR] yt-dlp extraction failed: {e}")
            raise Exception(f"Video unavailable or block: {str(e)}")

    async def get_playlist_tracks(self, playlist_url: str) -> List[Dict]:
        try:
            cmd = [
                self.ytdlp_path,
                "--dump-json",
                "--flat-playlist",
                "--quiet",
                playlist_url
            ]
            loop = asyncio.get_event_loop()
            process = await loop.run_in_executor(None, lambda: subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True))
            stdout, stderr = await loop.run_in_executor(None, process.communicate)
            
            results = []
            for line in stdout.strip().split('\n'):
                if not line.strip(): continue
                try:
                    data = json.loads(line)
                    results.append({
                        'id': data.get('id'),
                        'title': data.get('title'),
                        'uploader': data.get('uploader') or data.get('channel'),
                        'duration': int(data.get('duration') or 0),
                        'thumbnail': data.get('thumbnail')
                    })
                except:
                    continue
            return results
        except Exception as e:
            print(f"[ERROR] Failed to fetch playlist tracks: {e}")
            return []

youtube_service = YouTubeService()
