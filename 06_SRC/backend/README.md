# ⚙️ SANSEC AI — BACKEND DEVELOPMENT ENVIRONMENT

This directory houses the FastAPI backend server, static heuristic dissection engines, and AI translation interfaces.

## 🛠️ Prerequisites
- **Python**: version `3.13.x` (or newer)
- **Pip**: version `24.x` (or newer)

---

## 🚀 Environment Setup Guide

Follow these steps to establish your local development workspace:

### 1. Create a Python Virtual Environment
Navigate to this directory in your terminal and instantiate a virtual environment (`.venv`):
```bash
python3 -m venv .venv
```

### 2. Activate the Virtual Environment
Activate the environment context to isolate package installations:
- **Linux / macOS**:
  ```bash
  source .venv/bin/activate
  ```
- **Windows (Command Prompt)**:
  ```cmd
  .venv\Scripts\activate.bat
  ```
- **Windows (PowerShell)**:
  ```powershell
  .venv\Scripts\Activate.ps1
  ```

### 3. Install System Dependencies
Update the virtual environment package manager and install all parser dependencies listed in `requirements.txt`:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Running the Development Server
Launch the FastAPI gateway locally on port `8000` with hot-reloads enabled:
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
The interactive API documentation is available at `http://127.0.0.1:8000/docs`.
