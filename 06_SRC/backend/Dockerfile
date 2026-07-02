# Use an official Python slim base image
FROM python:3.11-slim-bookworm

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies required for WeasyPrint and static analysis compiling
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libffi-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    zlib1g-dev \
    shared-mime-info \
    libgirepository-1.0-1 \
    gobject-introspection \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy python dependencies (run from repo root context)
COPY 06_SRC/backend/requirements.txt /app/

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY 06_SRC/backend /app/

# Copy ml module
COPY 06_SRC/ml /app/ml

# Expose backend port
EXPOSE 8000

# Set Python path to find ml module correctly
ENV PYTHONPATH=/app

# Run uvicorn server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
