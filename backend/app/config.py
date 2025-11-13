from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    openai_api_key: str
    
    # Neo4j Database Configuration
    aws_neo4j_uri: str
    aws_neo4j_username: str
    aws_neo4j_password: str
    
    # PostgreSQL Database Configuration
    postgres_host: str
    postgres_port: int = 5432
    postgres_db: str
    postgres_user: str
    postgres_password: str
    
    # Application Settings
    debug: bool = False
    app_env: str = "development"
    api_version: str = "1.0.0"
    
    @property
    def postgres_url(self) -> str:
        """Build PostgreSQL connection URL."""
        from urllib.parse import quote
        return f"postgresql://{quote(self.postgres_user, safe='')}:{quote(self.postgres_password, safe='')}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    class Config:
        # Don't require .env file - AWS App Runner uses environment variables
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        # This is crucial - don't error if .env file doesn't exist
        extra = "ignore"


settings = Settings()
