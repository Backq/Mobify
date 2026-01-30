from fastapi import FastAPI, HTTPException, Depends, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from core.config import CONFIG
from services.youtube import youtube_service
from services.spotify import spotify_service
from services.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_current_user_optional
)
from services.lyrics import lyrics_service

from database import get_db, init_db, User, LikedSong, Playlist, PlaylistTrack
import uvicorn
import httpx
import time
import asyncio

app = FastAPI(title="Mobify API")

# Initialize database on startup
@app.on_event("startup")
def startup():
    init_db()

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=CONFIG.server.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== Pydantic Models ==============

class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class TrackData(BaseModel):
    video_id: str
    title: str
    uploader: str
    thumbnail: str
    duration: int

class PlaylistCreate(BaseModel):
    name: str

class PlaylistRename(BaseModel):
    name: str

class SpotifyImportRequest(BaseModel):
    spotify_id: str
    name: str

class SpotifyUrlImportRequest(BaseModel):
    url: str
    name: str

class YoutubeUrlImportRequest(BaseModel):
    url: str
    name: str

@app.get("/config")
def get_public_config():
    return {
        "server": CONFIG.server.dict(),
        "client": CONFIG.client.dict(),
        "spotify": {
            "client_id": CONFIG.spotify.client_id,
            "redirect_uri": CONFIG.spotify.redirect_uri
        }
    }

# ============== Spotify ==============

@app.get("/spotify/auth")
def spotify_auth(user: User = Depends(get_current_user)):
    auth_url = spotify_service.get_authorize_url()
    return {"auth_url": auth_url}

@app.get("/spotify/callback")
def spotify_callback(code: str):
    # Redirect back to the frontend with the code so it can finish the connection
    client_url = CONFIG.client.api_url.replace(":8000", ":5173") # Hack for local dev, should be cleaner
    # Actually, better to just use a hardcoded or config-based client URL
    return Response(status_code=302, headers={"Location": f"http://localhost:5173/?spotify_code={code}"})

@app.post("/spotify/connect")
def spotify_connect(payload: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    code = payload.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    
    try:
        token_info = spotify_service.get_tokens(code)
        user.spotify_access_token = token_info['access_token']
        user.spotify_refresh_token = token_info['refresh_token']
        user.spotify_token_expiry = int(time.time() + token_info['expires_in'])
        db.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/spotify/status")
def spotify_status(user: User = Depends(get_current_user)):
    return {
        "connected": user.spotify_refresh_token is not None,
        "token_expired": user.spotify_token_expiry < time.time() if user.spotify_token_expiry else True
    }

@app.get("/spotify/playlists")
def spotify_playlists(user: User = Depends(get_current_user)):
    if not user.spotify_access_token:
        raise HTTPException(status_code=400, detail="Spotify not connected")
    
    # Refresh token if needed
    # (Simplified for now, assumes token is valid or we handle refresh logic)
    
    try:
        playlists = spotify_service.get_user_playlists(user.spotify_access_token)
        return {"playlists": playlists}
    except Exception as e:
        # Handle expired token by suggesting a reconnect or implementing silent refresh
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/spotify/playlists/{playlist_id}")
def spotify_playlist_tracks(playlist_id: str, user: User = Depends(get_current_user)):
    if not user.spotify_access_token:
        raise HTTPException(status_code=400, detail="Spotify not connected")
    
    try:
        tracks = spotify_service.get_playlist_tracks(user.spotify_access_token, playlist_id)
        return {"tracks": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/spotify/me/tracks")
def spotify_saved_tracks(user: User = Depends(get_current_user)):
    if not user.spotify_access_token:
        raise HTTPException(status_code=400, detail="Spotify not connected")
    
    try:
        tracks = spotify_service.get_user_saved_tracks(user.spotify_access_token)
        return {"tracks": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/spotify/import/playlist")
async def spotify_import_playlist(req: SpotifyImportRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.spotify_access_token:
        raise HTTPException(status_code=400, detail="Spotify not connected")
    
    tracks = spotify_service.get_playlist_tracks(user.spotify_access_token, req.spotify_id)
    
    # Create Mobify playlist
    db_playlist = Playlist(user_id=user.id, name=req.name)
    db.add(db_playlist)
    db.commit()
    db.refresh(db_playlist)
    
    imported_count = 0
    for track in tracks:
        query = f"{track['title']} {track['artist']}"
        search_results = await youtube_service.search(query, limit=1)
        if search_results:
            yt_track = search_results[0]
            db_track = PlaylistTrack(
                playlist_id=db_playlist.id,
                video_id=yt_track['id'],
                title=yt_track['title'],
                uploader=yt_track['uploader'],
                thumbnail=yt_track['thumbnail'],
                duration=yt_track['duration'],
                position=imported_count
            )
            db.add(db_track)
            imported_count += 1
            
    db.commit()
    return {"success": True, "imported_count": imported_count, "playlist_id": db_playlist.id}

@app.post("/spotify/import/liked")
async def spotify_import_liked(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.spotify_access_token:
        raise HTTPException(status_code=400, detail="Spotify not connected")
    
    tracks = spotify_service.get_user_saved_tracks(user.spotify_access_token)
    
    imported_count = 0
    for track in tracks:
        # Check if already liked
        # (Simplified: just search and add if not present)
        query = f"{track['title']} {track['artist']}"
        search_results = await youtube_service.search(query, limit=1)
        if search_results:
            yt_track = search_results[0]
            # Check if video_id already in liked
            exists = db.query(LikedSong).filter(LikedSong.user_id == user.id, LikedSong.video_id == yt_track['id']).first()
            if not exists:
                db_liked = LikedSong(
                    user_id=user.id,
                    video_id=yt_track['id'],
                    title=yt_track['title'],
                    uploader=yt_track['uploader'],
                    thumbnail=yt_track['thumbnail'],
                    duration=yt_track['duration']
                )
                db.add(db_liked)
                imported_count += 1
                
    db.commit()
    return {"success": True, "imported_count": imported_count}

@app.post("/spotify/import/url")
async def spotify_import_url(req: SpotifyUrlImportRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    print(f"[SPOTIFY] DEBUG: Starting direct import for URL: {req.url}")
    tracks = await spotify_service.get_tracks_by_url(req.url)
    
    if not tracks:
        print("[SPOTIFY] DEBUG: No tracks found, aborting import")
        raise HTTPException(status_code=400, detail="Could not fetch tracks from URL or playlist is empty")
    
    print(f"[SPOTIFY] DEBUG: Found {len(tracks)} tracks, creating playlist: {req.name}")
    # Create Mobify playlist
    db_playlist = Playlist(user_id=user.id, name=req.name)
    db.add(db_playlist)
    db.commit()
    db.refresh(db_playlist)
    
    # Process tracks in parallel with a semaphore to avoid rate limiting
    semaphore = asyncio.Semaphore(5)
    
    async def process_track(track, position):
        async with semaphore:
            query = f"{track['title']} {track['artist']}"
            print(f"[SPOTIFY] DEBUG: Searching YouTube for: {query}")
            search_results = await youtube_service.search(query, limit=1)
            if search_results:
                yt_track = search_results[0]
                return PlaylistTrack(
                    playlist_id=db_playlist.id,
                    video_id=yt_track['id'],
                    title=yt_track['title'],
                    uploader=yt_track['uploader'],
                    thumbnail=yt_track['thumbnail'],
                    duration=yt_track['duration'],
                    position=position
                )
            return None

    print(f"[SPOTIFY] DEBUG: Processing {len(tracks)} tracks in parallel...")
    tasks = [process_track(track, i) for i, track in enumerate(tracks)]
    db_tracks = await asyncio.gather(*tasks)
    
    imported_count = 0
    for db_track in db_tracks:
        if db_track:
            db.add(db_track)
            imported_count += 1
            
    db.commit()
    print(f"[SPOTIFY] DEBUG: Import complete. Successfully imported {imported_count} tracks.")
    return {"success": True, "imported_count": imported_count, "playlist_id": db_playlist.id}

@app.post("/youtube/import/url")
async def youtube_import_url(req: YoutubeUrlImportRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    print(f"[YOUTUBE] DEBUG: Starting direct import for URL: {req.url}")
    tracks = await youtube_service.get_playlist_tracks(req.url)
    
    if not tracks:
        print("[YOUTUBE] DEBUG: No tracks found or playlist is private")
        raise HTTPException(status_code=400, detail="Could not fetch tracks from YouTube URL or playlist is empty/private")
    
    print(f"[YOUTUBE] DEBUG: Found {len(tracks)} tracks, creating playlist: {req.name}")
    db_playlist = Playlist(user_id=user.id, name=req.name)
    db.add(db_playlist)
    db.commit()
    db.refresh(db_playlist)
    
    imported_count = 0
    for i, track in enumerate(tracks):
        db_track = PlaylistTrack(
            playlist_id=db_playlist.id,
            video_id=track['id'],
            title=track['title'],
            uploader=track['uploader'],
            thumbnail=track['thumbnail'],
            duration=track['duration'],
            position=i
        )
        db.add(db_track)
        imported_count += 1
            
    db.commit()
    print(f"[YOUTUBE] DEBUG: Import complete. Successfully imported {imported_count} tracks.")
    return {"success": True, "imported_count": imported_count, "playlist_id": db_playlist.id}

# ============== Root ==============

@app.get("/")
def read_root():
    return {"message": "Mobify API is running"}

# ============== Auth Endpoints ==============

@app.post("/auth/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    # Check if username exists
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    user = User(
        username=data.username,
        password_hash=hash_password(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token(user.id)
    return {"token": token, "user": {"id": user.id, "username": user.username}}

@app.post("/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(user.id)
    return {"token": token, "user": {"id": user.id, "username": user.username}}

@app.get("/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "username": user.username}

# ============== Search ==============

@app.get("/search")
async def search(
    query: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=30)
):
    if not query:
        raise HTTPException(status_code=400, detail="Query parameter 'query' is required")
    try:
        offset = (page - 1) * limit
        results = await youtube_service.search(query, limit=limit, offset=offset)
        return {
            "results": results,
            "page": page,
            "has_more": len(results) == limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============== Stream ==============

@app.get("/stream/{video_id}")
async def get_stream(video_id: str):
    try:
        data = await youtube_service.get_stream_url(video_id)
        data['stream_url'] = f"/audio/{video_id}"
        return data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/lyrics")
async def get_lyrics(query: str):
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    try:
        lrc = await lyrics_service.get_lyrics(query)
        if not lrc:
            # Return empty string or specific message if not found, 
            # ensuring 200 OK so frontend handles "no lyrics" gracefully
            return {"lyrics": None}
        return {"lyrics": lrc}
    except Exception as e:
        print(f"[ERROR] Lyrics endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audio/{video_id}")
async def proxy_audio(video_id: str, request: Request):
    try:
        # Get stream data once
        stream_data = await youtube_service.get_stream_url(video_id)
        url = stream_data['stream_url']
        
        # Relay range header
        range_header = request.headers.get("range")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        if range_header:
            headers["range"] = range_header

        async def stream_generator():
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("GET", url, headers=headers, follow_redirects=True) as r:
                    # Relay 403/401/etc from YouTube if they happen
                    if r.status_code >= 400:
                        yield b"Error from YouTube: " + str(r.status_code).encode()
                        return
                    async for chunk in r.aiter_bytes(chunk_size=128*1024): # Increased to 128KB
                        yield chunk

        # Initial probe for headers
        async with httpx.AsyncClient(timeout=10.0) as client:
            source_resp = await client.head(url, headers=headers, follow_redirects=True)
            
            # If head fails, try a tiny get
            if source_resp.status_code >= 400:
                 source_resp = await client.get(url, headers={**headers, "Range": "bytes=0-0"}, follow_redirects=True)

            status_code = source_resp.status_code
            response_headers = {
                "Accept-Ranges": "bytes",
                "Content-Type": source_resp.headers.get("Content-Type", "audio/mpeg"),
                "Content-Length": source_resp.headers.get("Content-Length"),
                "Content-Range": source_resp.headers.get("Content-Range"),
                "Cache-Control": "public, max-age=3600",
                "Connection": "keep-alive"
            }
            
            # Filter None
            response_headers = {k: v for k, v in response_headers.items() if v is not None}
            
            return StreamingResponse(
                stream_generator(),
                status_code=status_code,
                headers=response_headers
            )
            
    except Exception as e:
        print(f"[ERROR] Proxy Audio failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== Liked Songs ==============

@app.get("/liked")
def get_liked_songs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    songs = db.query(LikedSong).filter(LikedSong.user_id == user.id).order_by(LikedSong.added_at.desc()).all()
    return {
        "tracks": [
            {
                "id": s.video_id,
                "title": s.title,
                "uploader": s.uploader,
                "thumbnail": s.thumbnail,
                "duration": s.duration
            }
            for s in songs
        ]
    }

@app.get("/liked/{video_id}")
def check_liked(video_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exists = db.query(LikedSong).filter(
        LikedSong.user_id == user.id,
        LikedSong.video_id == video_id
    ).first() is not None
    return {"liked": exists}

@app.post("/liked")
def add_liked(track: TrackData, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if already liked
    existing = db.query(LikedSong).filter(
        LikedSong.user_id == user.id,
        LikedSong.video_id == track.video_id
    ).first()
    
    if existing:
        return {"message": "Already liked"}
    
    song = LikedSong(
        user_id=user.id,
        video_id=track.video_id,
        title=track.title,
        uploader=track.uploader,
        thumbnail=track.thumbnail,
        duration=track.duration
    )
    db.add(song)
    db.commit()
    return {"message": "Added to liked songs"}

@app.delete("/liked/{video_id}")
def remove_liked(video_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    song = db.query(LikedSong).filter(
        LikedSong.user_id == user.id,
        LikedSong.video_id == video_id
    ).first()
    
    if song:
        db.delete(song)
        db.commit()
    
    return {"message": "Removed from liked songs"}

# ============== Playlists ==============

@app.get("/playlists")
def get_playlists(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    playlists = db.query(Playlist).filter(Playlist.user_id == user.id).order_by(Playlist.created_at.desc()).all()
    return {
        "playlists": [
            {
                "id": p.id,
                "name": p.name,
                "track_count": len(p.tracks)
            }
            for p in playlists
        ]
    }

@app.post("/playlists")
def create_playlist(data: PlaylistCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    playlist = Playlist(user_id=user.id, name=data.name)
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return {"id": playlist.id, "name": playlist.name}

@app.get("/playlists/{playlist_id}")
def get_playlist(playlist_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == user.id
    ).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    return {
        "id": playlist.id,
        "name": playlist.name,
        "tracks": [
            {
                "id": t.video_id,
                "title": t.title,
                "uploader": t.uploader,
                "thumbnail": t.thumbnail,
                "duration": t.duration
            }
            for t in playlist.tracks
        ]
    }

@app.put("/playlists/{playlist_id}")
def rename_playlist(playlist_id: int, data: PlaylistRename, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == user.id
    ).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    playlist.name = data.name
    db.commit()
    return {"message": "Playlist renamed"}

@app.delete("/playlists/{playlist_id}")
def delete_playlist(playlist_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == user.id
    ).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    db.delete(playlist)
    db.commit()
    return {"message": "Playlist deleted"}

@app.post("/playlists/{playlist_id}/tracks")
def add_track_to_playlist(
    playlist_id: int,
    track: TrackData,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == user.id
    ).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Check if track already in playlist
    existing = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id,
        PlaylistTrack.video_id == track.video_id
    ).first()
    
    if existing:
        return {"message": "Track already in playlist"}
    
    # Get next position
    max_pos = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id
    ).count()
    
    pt = PlaylistTrack(
        playlist_id=playlist_id,
        video_id=track.video_id,
        title=track.title,
        uploader=track.uploader,
        thumbnail=track.thumbnail,
        duration=track.duration,
        position=max_pos
    )
    db.add(pt)
    db.commit()
    return {"message": "Track added to playlist"}

@app.delete("/playlists/{playlist_id}/tracks/{video_id}")
def remove_track_from_playlist(
    playlist_id: int,
    video_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == user.id
    ).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    track = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id,
        PlaylistTrack.video_id == video_id
    ).first()
    
    if track:
        db.delete(track)
        db.commit()
    
    return {"message": "Track removed from playlist"}

# ============== Config ==============

@app.get("/config")
def get_config():
    return CONFIG.client

if __name__ == "__main__":
    uvicorn.run("main:app", host=CONFIG.server.host, port=CONFIG.server.port, reload=True)
