from dotenv import load_dotenv
from fastapi import FastAPI, Request, Depends, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io, os
from fastapi.responses import JSONResponse
from api.routes import feed
from api.routes import scans
from api.routes import recommendations
from api.routes import live_capture
from api.routes import auth
from api.dependencies.auth import get_current_user

load_dotenv()

app = FastAPI(
    title="LuSense AI Backend"
)

frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# GLOBAL ERROR HANDLER

@app.exception_handler(Exception)
async def global_exception_handler(
    request: Request,
    exc: Exception
):

    return JSONResponse(
        status_code=500,
        content={
            "error": "Execution Failed",
            "error_type": type(exc).__name__,
            "details": "Internal server error"
        }
    )

# ROOT

@app.get("/")
def home():

    return {
        "status": "LuSense AI is running"
    }

# ROUTES
app.include_router(feed.router, prefix="/feed", tags=["Feed"], )
app.include_router(scans.router, prefix="/scans", tags=["Scans & Detection"], )
app.include_router( recommendations.router, prefix="/recommendations", tags=["Recommendations"], )
app.include_router(live_capture.router, prefix="/live-capture", tags=["Live Capture"], )
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])

@app.post("/scans/upload")
async def upload_scan(file: UploadFile = File(...), authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    token = authorization[7:]
    try:
        get_current_user_token(token)
    except Exception:
        raise HTTPException(401, "Invalid session")
    from api.services.vision import analyze_image
    from api.services.pricing import get_market_price
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "Upload a JPEG, PNG or WebP image")
    data = await file.read(10 * 1024 * 1024 + 1)
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(413, "Maximum image size is 10 MB")
    try:
        image = Image.open(io.BytesIO(data)).convert("RGB")
        if image.width * image.height > 20_000_000:
            raise HTTPException(413, "Image dimensions are too large")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "Invalid image")
    result = analyze_image(image)
    items = []
    totals = {"min": 0, "typical": 0, "max": 0}
    for name, quantity in result["counts"].items():
        options = get_market_price(name, token) or []
        valid = [o for o in options if o.get("source") != "lusense_demo_sample" and all(o.get(k) is not None for k in ("min_price", "typical_price", "max_price"))]
        price = None
        if valid:
            price = {"min": min(float(o["min_price"]) for o in valid), "typical": round(sum(float(o["typical_price"]) for o in valid)/len(valid)), "max": max(float(o["max_price"]) for o in valid)}
            for key in totals: totals[key] += price[key] * quantity
        items.append({"object_name": name, "quantity": quantity, "price": price, "catalog_options": valid})
    return {**result, "items": items, "estimated_total": totals, "pricing_complete": all(i["price"] is not None for i in items)}

@app.post("/recommendations/upload")
async def recommend_uploaded(payload: dict, authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    token = authorization[7:]
    try: get_current_user_token(token)
    except Exception: raise HTTPException(401, "Invalid session")
    from api.services.recommendations_upload import recommend_upload
    try:
        return recommend_upload(payload, token)
    except ValueError as exc:
        raise HTTPException(422, str(exc))


def get_current_user_token(token: str):
    from api.services.supabase import supabase
    response = supabase.auth.get_user(token)
    if not response.user: raise ValueError("Invalid user")
    return response.user


@app.post("/scans/feed-image")
async def scan_existing_feed_image(payload: dict, authorization: str = Header(default="")):
    """Scan an existing public feed image. No user upload or database write."""
    from urllib.parse import urlsplit
    import httpx
    from api.services.vision import analyze_image
    from api.services.pricing import get_market_price

    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    token = authorization[7:]
    try:
        get_current_user_token(token)
    except Exception:
        raise HTTPException(401, "Invalid session")
    url = payload.get("image_url")
    if not isinstance(url, str):
        raise HTTPException(422, "Image URL required")
    parsed = urlsplit(url)
    # Restrict remote fetching to the known public image providers used by the feed.
    allowed = {"images.unsplash.com", "images.pexels.com", "res.cloudinary.com"}
    if parsed.scheme != "https" or parsed.hostname not in allowed or parsed.port not in (None, 443) or parsed.username or parsed.password:
        raise HTTPException(422, "Unsupported image host")
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=False) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                if not response.headers.get("content-type", "").lower().startswith("image/"):
                    raise HTTPException(415, "URL does not contain an image")
                chunks = bytearray()
                async for chunk in response.aiter_bytes():
                    chunks.extend(chunk)
                    if len(chunks) > 10 * 1024 * 1024:
                        raise HTTPException(413, "Image exceeds 10 MB")
        image = Image.open(io.BytesIO(chunks)).convert("RGB")
        if image.width * image.height > 20_000_000:
            raise HTTPException(413, "Image dimensions are too large")
    except HTTPException:
        raise
    except (httpx.HTTPError, OSError, ValueError) as exc:
        raise HTTPException(422, "Unable to retrieve or decode feed image") from exc

    result = analyze_image(image)
    items = []
    totals = {"min": 0, "typical": 0, "max": 0}
    complete = True
    for name, quantity in result["counts"].items():
        options = get_market_price(name, token) or []
        # Never present illustrative demo data as purchasable recommendations.
        valid = [o for o in options if o.get("source") != "lusense_demo_sample" and all(o.get(k) is not None for k in ("min_price", "typical_price", "max_price"))]
        price = None
        if valid:
            price = {"min": min(float(o["min_price"]) for o in valid), "typical": round(sum(float(o["typical_price"]) for o in valid) / len(valid)), "max": max(float(o["max_price"]) for o in valid)}
            for key in totals:
                totals[key] += price[key] * quantity
        else:
            complete = False
        items.append({"object_name": name, "quantity": quantity, "price": price, "catalog_options": valid})
    return {**result, "items": items, "estimated_total": totals, "pricing_complete": complete}


def _log_baseline_memory():
    import psutil

    rss_mb = psutil.Process().memory_info().rss / 1024 / 1024
    print(f"baseline RSS after startup: {rss_mb:.1f} MB", flush=True)


_log_baseline_memory()
