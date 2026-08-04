import os
from pydantic import field_validator
from pydantic_settings import BaseSettings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(BASE_DIR, ".env")

# Values that must never sign a real token. The first was this file's default
# for the life of the project, which meant a missing .env silently produced
# JWTs signed with a string anyone reading the repo could see — enough to mint
# a valid token for any account.
WEAK_SECRETS = {
    "your_super_secret_jwt_key_here",
    "change-this-to-a-random-string",
    "secret",
    "changeme",
}


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANGEL_ONE_API_KEY: str = ""
    ANGEL_ONE_CLIENT_ID: str = ""
    ANGEL_ONE_PASSWORD: str = ""
    ANGEL_ONE_TOTP_SECRET: str = ""
    NEWSAPI_KEY: str = ""
    # Deliberately no default: this must come from the environment, and the
    # app should refuse to start rather than fall back to something guessable.
    SECRET_KEY: str
    DATABASE_URL: str = "sqlite:///./stocksense.db"
    GROQ_API_KEY: str = ""

    @field_validator("SECRET_KEY")
    @classmethod
    def _reject_weak_secret(cls, v: str) -> str:
        if v.strip() in WEAK_SECRETS:
            raise ValueError(
                "SECRET_KEY is set to a known placeholder. Generate a real one:\n"
                "  python -c \"import secrets; print(secrets.token_urlsafe(48))\"\n"
                "and put it in your .env as SECRET_KEY=..."
            )
        if len(v) < 32:
            raise ValueError(
                f"SECRET_KEY is only {len(v)} characters. Use at least 32:\n"
                "  python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )
        return v

    class Config:
        env_file = env_path

settings = Settings()
