import os
from pydantic_settings import BaseSettings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(BASE_DIR, ".env")

class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANGEL_ONE_API_KEY: str = ""
    ANGEL_ONE_CLIENT_ID: str = ""
    ANGEL_ONE_PASSWORD: str = ""
    ANGEL_ONE_TOTP_SECRET: str = ""
    NEWSAPI_KEY: str = ""
    SECRET_KEY: str = "your_super_secret_jwt_key_here"
    DATABASE_URL: str = "sqlite:///./stocksense.db"
    GROQ_API_KEY: str = ""

    class Config:
        env_file = env_path

settings = Settings()
