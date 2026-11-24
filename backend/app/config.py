from pydantic_settings import BaseSettings

from .topics import get_topic


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
    
    # Staff dashboard login
    staff_password: str
    session_secret: str

    # Which topic profile the AI prompts use: "permits", "parks" or "housing"
    topic: str = "permits"

    
    @property
    def postgres_url(self) -> str:
        """Build PostgreSQL connection URL."""
        from urllib.parse import quote
        return f"postgresql://{quote(self.postgres_user, safe='')}:{quote(self.postgres_password, safe='')}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    class Config:
        # Local development reads .env.local; deployments set environment variables directly
        env_file = ".env.local"
        env_file_encoding = "utf-8"
        case_sensitive = False
        # This is crucial - don't error if .env file doesn't exist
        extra = "ignore"


MIN_SESSION_SECRET_LENGTH = 32

settings = Settings()
if len(settings.session_secret) < MIN_SESSION_SECRET_LENGTH:
    raise RuntimeError(f"SESSION_SECRET must be at least {MIN_SESSION_SECRET_LENGTH} characters")
if not settings.staff_password:
    raise RuntimeError("STAFF_PASSWORD must be set")

topic = get_topic(settings.topic)
