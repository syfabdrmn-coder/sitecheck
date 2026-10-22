import os

from dotenv import load_dotenv

# Reads backend/.env when running locally. On a server, real environment variables are used instead.
load_dotenv()


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sitecheck")
    # Hosts like Render hand out "postgres://..." or "postgresql://...".
    # SQLAlchemy needs to be told to use the psycopg (version 3) driver.
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


DATABASE_URL = _database_url()

# Which frontend addresses may call this API (CORS). Comma-separated.
CLIENT_URLS = [
    origin.strip()
    for origin in os.getenv("CLIENT_URL", "http://localhost:5173").split(",")
    if origin.strip()
]
