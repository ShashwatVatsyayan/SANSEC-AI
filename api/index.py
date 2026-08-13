import sys
import os
from pathlib import Path

# Add backend directory to Python sys.path so modules like app.services can be imported
backend_dir = Path(__file__).parent.parent / "06_SRC" / "backend"
sys.path.insert(0, str(backend_dir))

# Set SANSEC_CORS_ORIGINS to allow Vercel deployment domain(s)
if not os.getenv("SANSEC_CORS_ORIGINS"):
    os.environ["SANSEC_CORS_ORIGINS"] = "*"

from main import app  # noqa: F401 – Vercel ASGI handler picks up `app`
