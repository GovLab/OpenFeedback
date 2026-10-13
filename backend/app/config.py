from pydantic_settings import BaseSettings
from typing import Optional
import os
import json
import boto3
from botocore.exceptions import ClientError

from .topics import get_topic


def get_secret():
    """Fetch secrets from AWS Secrets Manager."""
    secret_name = os.getenv("SECRET_NAME", "openpermits")
    region_name = os.getenv("AWS_REGION", "us-east-2")

    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except ClientError as e:
        # For a list of exceptions thrown, see
        # https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
        print(f"Error fetching secret from AWS Secrets Manager: {e}")
        raise e

    # Parse the secret string as JSON
    secret = get_secret_value_response['SecretString']
    return json.loads(secret)


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

    # Which topic profile the AI prompts use: "permits" or "parks"
    topic: str = "permits"

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
        # Prefer .env.local for local development, fall back to .env
        # AWS App Runner uses environment variables directly
        env_file = ".env.local"
        env_file_encoding = "utf-8"
        case_sensitive = False
        # This is crucial - don't error if .env file doesn't exist
        extra = "ignore"


# Initialize settings
# Check if we should use AWS Secrets Manager (production) or environment variables (local dev)
def load_settings():
    """Load settings from AWS Secrets Manager if in production, otherwise use environment variables."""
    use_secrets_manager = os.getenv("USE_SECRETS_MANAGER", "false").lower() == "true"
    
    if use_secrets_manager:
        print("🔐 Loading configuration from AWS Secrets Manager...")
        try:
            secrets = get_secret()
            print(f"✅ Successfully loaded {len(secrets)} secrets from AWS Secrets Manager")
            # Convert keys to lowercase for Pydantic
            secrets_lowercase = {k.lower(): v for k, v in secrets.items()}
            # Return Settings initialized with secrets from AWS Secrets Manager
            return Settings(**secrets_lowercase)
        except Exception as e:
            print(f"❌ Failed to load secrets from AWS Secrets Manager: {e}")
            print("⚠️  Falling back to environment variables...")
            return Settings()
    else:
        print("📝 Loading configuration from environment variables (local development mode)")
        return Settings()


MIN_SESSION_SECRET_LENGTH = 32

settings = load_settings()
if len(settings.session_secret) < MIN_SESSION_SECRET_LENGTH:
    raise RuntimeError(f"SESSION_SECRET must be at least {MIN_SESSION_SECRET_LENGTH} characters")
if not settings.staff_password:
    raise RuntimeError("STAFF_PASSWORD must be set")

topic = get_topic(settings.topic)
