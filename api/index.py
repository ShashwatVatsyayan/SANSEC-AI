import sys
import os
from pathlib import Path

# Add backend directory to Python sys.path so modules like app.services can be imported
backend_dir = Path(__file__).parent.parent / "06_SRC" / "backend"
sys.path.insert(0, str(backend_dir))

# Enable in-memory repository mode for serverless deployment
os.environ["SANSEC_USE_IN_MEMORY"] = "true"

from main import app
