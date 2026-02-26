"""
Minimal LMS – FastAPI application.
Phase 1: Skeleton with health check.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from datetime import datetime
from app.api import routes_auth, routes_courses

from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.core.database import init_db
    init_db()
    yield

app = FastAPI(
    title="Minimal LMS",
    version="0.1.0",
    description="Small LMS that sends events to EduMind Engagement Tracker",
    docs_url=None,
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_auth.router, prefix="/api")
app.include_router(routes_courses.router, prefix="/api")


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "service": "Minimal LMS",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    """Health check for monitoring."""
    return {
        "status": "healthy",
        "service": "minimal-lms",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/docs", response_class=HTMLResponse)
def docs_simple():
    """Simple docs page (no CDN). Use /redoc for full ReDoc or /openapi.json for spec."""
    return """
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Minimal LMS – API</title></head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 2rem auto; padding: 0 1rem;">
    <h1>Minimal LMS API</h1>
    <p>Version 0.1.0 – Phase 1</p>
    <h2>Endpoints</h2>
    <ul>
        <li><strong>GET /</strong> – Root (service info)</li>
        <li><strong>GET /health</strong> – Health check</li>
        <li><strong>GET /docs</strong> – This page</li>
        <li><strong>GET /redoc</strong> – <a href="/redoc">ReDoc UI</a> (needs CDN)</li>
        <li><strong>GET /openapi.json</strong> – <a href="/openapi.json">OpenAPI spec</a></li>
    </ul>
    <p>If /redoc stays blank (e.g. CDN blocked), use <a href="/openapi.json">/openapi.json</a> in Postman or another client.</p>
    </body>
    </html>
    """