# Smart Parking System

This repository contains a full-stack smart parking management system with an AI-powered FastAPI backend and a modern Next.js frontend.

## 🏗️ Project Structure

- `api/` — FastAPI backend (Python 3.12)
- `web/` — Next.js frontend (Node.js 20)

## 🚀 Quick Start (Docker Compose)

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd smart-parking
   ```

2. **Build and start all services:**

   ```bash
   docker compose up --build
   ```

3. **Access the apps:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## 🐳 Manual Docker Usage

### Backend (API)

```bash
cd api
# Build
docker build -t smart-parking-api .
# Run
docker run -d -p 8000:8000 \
  -v $(pwd)/ai_models:/app/ai_models \
  -v $(pwd)/parking_db.json:/app/parking_db.json \
  -v $(pwd)/parking_db_algorithm.json:/app/parking_db_algorithm.json \
  -v $(pwd)/parking_db_sequential.json:/app/parking_db_sequential.json \
  -v $(pwd)/parking_db_random.json:/app/parking_db_random.json \
  smart-parking-api
```

### Frontend (Web)

```bash
cd web
# Build
docker build -t smart-parking-web .
# Run
docker run -d -p 3000:3000 smart-parking-web
```

## 🛠️ Local Development

### Backend

```bash
cd api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
fastapi run app.py --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd web
pnpm install
pnpm dev
```

## 📄 API Reference

See [api/README.md](./api/README.md) for full API docs and usage.

---

**Note:**

- The `web` Dockerfile and build ignore TypeScript errors for production build.
- Make sure the `ai_models` directory and all required model/data files exist in `api/` before running.
