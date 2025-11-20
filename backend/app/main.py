from __future__ import annotations

from io import BytesIO
from pathlib import Path
from threading import Lock

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

app = FastAPI(title="Image Map API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).resolve().parent / "static"
BASE_IMAGE_PATH = STATIC_DIR / "base-world.jpg"
_image_lock = Lock()
_base_image: Image.Image | None = None
MAX_LAYER = 6
MIN_LAYER = 1

def _load_base_image() -> Image.Image:
    if not BASE_IMAGE_PATH.exists():
        raise RuntimeError(f"Base image not found at {BASE_IMAGE_PATH}")
    with Image.open(BASE_IMAGE_PATH) as img:
        return img.convert("RGB")


def get_base_image() -> Image.Image:
    global _base_image
    if _base_image is None:
        _base_image = _load_base_image()
    return _base_image


@app.get("/api/crop")
def crop_image(
    x0: int = Query(..., ge=0),
    x1: int = Query(..., ge=0),
    y0: int = Query(..., ge=0),
    y1: int = Query(..., ge=0),
    layer: int = Query(6, ge=MIN_LAYER, le=MAX_LAYER, description="Higher layer -> more detail; 6 = full resolution"),
):
    """Return the cropped image bytes for the requested bounding box."""
    if x0 >= x1 or y0 >= y1:
        raise HTTPException(status_code=400, detail="x0/x1 and y0/y1 must define a positive area")

    base_img = get_base_image()
    width, height = base_img.size

    if x1 > width or y1 > height:
        raise HTTPException(status_code=400, detail=f"Requested region exceeds image bounds {width}x{height}")

    with _image_lock:
        region = base_img.crop((x0, y0, x1, y1))

    stride = 2 ** (MAX_LAYER - layer)
    if stride > 1:
        new_width = max(1, (region.width + stride - 1) // stride)
        new_height = max(1, (region.height + stride - 1) // stride)
        region = region.resize((new_width, new_height), Image.NEAREST)

    buf = BytesIO()
    region.save(buf, format="PNG")
    return Response(buf.getvalue(), media_type="image/png")
