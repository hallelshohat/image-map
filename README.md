# Image Map

Full-stack playground with a FastAPI backend that serves cropped sections of a static, high-resolution world map and a React + TypeScript frontend to visualize arbitrary selections.

## Backend

1. Create a virtual environment and install dependencies:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Start the API server (defaults to `http://localhost:8000`):
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Crop endpoint
- **Route:** `GET /api/crop`
- **Query params:**
  - `x0`, `x1`, `y0`, `y1` (integers, 0 ≤ value ≤ image bounds, x1 > x0, y1 > y0)
  - `layer` (1–6; defaults to 6). Layer 6 returns every pixel while each step down reduces detail by a factor of 4 (simple nearest-neighbor subsampling).
- **Response:** `image/png` payload containing the selected region of `app/static/base-world.jpg` (21600×10800 Blue Marble world map sourced from NASA Visible Earth).

Example request:
```bash
curl "http://localhost:8000/api/crop?x0=0&x1=1200&y0=0&y1=600" --output crop.png
```

## Frontend

1. Install dependencies the first time:
   ```bash
   cd frontend
   npm install
   ```
2. Run the development server (Vite):
   ```bash
   npm run dev
   ```
3. (Optional) Specify a custom API origin via `.env`:
   ```bash
   echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
   ```

The React app renders the entire world map in a coarse preview and progressively sharpens tiles as you interact:
- **Drag (left mouse/touch):** Pan across the world.
- **Scroll wheel / trackpad pinch:** Zoom in/out centered on your pointer.
- **Right-drag:** Stretch along the X and/or Y axes for directional zooming. When you stretch, higher layers are requested automatically.

Tile requests are computed from the current viewport and the app selects the most appropriate backend `layer`, so the server only delivers the pixels you need.

During development the Vite dev server proxies `/api` to `http://localhost:8000` (override the proxy target with `VITE_BACKEND_URL=http://host:port npm run dev`). Production builds still honor `VITE_API_BASE_URL` if you need a non-relative API origin.
