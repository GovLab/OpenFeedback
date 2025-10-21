from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    openai_api_key: str
    # Database Configuration
    neo4j_uri: str
    neo4j_username: str
    neo4j_password: str
    
    # Application Settings
    debug: bool = False
    app_env: str = "development"
    api_version: str = "1.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        env_file_encoding = "utf-8"


settings = Settings()
