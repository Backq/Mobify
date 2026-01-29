from syncedlyrics import search
import asyncio

class LyricsService:
    def _clean_query(self, query: str) -> str:
        # Remove common garbage that breaks sensitive search
        import re
        query = re.sub(r'\(feat\..*?\)', '', query, flags=re.IGNORECASE)
        query = re.sub(r'\(official audio\)', '', query, flags=re.IGNORECASE)
        query = re.sub(r'\(official video\)', '', query, flags=re.IGNORECASE)
        query = re.sub(r'\[.*?\]', '', query) # Remove brackets like [HQ]
        return query.strip()

    async def get_lyrics(self, query: str):
        """
        Search for synced lyrics using syncedlyrics.
        Returns the LRC string or None if not found.
        """
        try:
            clean_q = self._clean_query(query)
            print(f"[LYRICS] Validated search query: '{clean_q}' (Original: '{query}')")
            
            loop = asyncio.get_event_loop()
            # Run blocking search in executor
            lrc = await loop.run_in_executor(None, lambda: search(clean_q))
            return lrc
        except Exception as e:
            print(f"[ERROR] Lyrics search failed: {e}")
            return None

lyrics_service = LyricsService()
