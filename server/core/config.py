import json
import os
from pathlib import Path
from typing import List
from pydantic import BaseModel

class ServerConfig(BaseModel):
    host: str
    port: int
    cors_origins: List[str]

class ClientConfig(BaseModel):
    api_url: str

class SpotifyConfig(BaseModel):
    client_id: str
    client_secret: str
    redirect_uri: str

class AppConfig(BaseModel):
    server: ServerConfig
    client: ClientConfig
    spotify: SpotifyConfig

def load_config() -> AppConfig:
    # Go up two levels from server/core/config.py to find config.json
    config_path = Path(__file__).resolve().parent.parent.parent / "config.json"
    
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found at {config_path}")
        
    with open(config_path, "r") as f:
        data = json.load(f)
        
    return AppConfig(**data)

CONFIG = load_config()
