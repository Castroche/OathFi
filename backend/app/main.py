from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    ai,
    agent,
    audit_reports,
    backtests,
    dashboard,
    ecosystem,
    health,
    hypotheses,
    market,
    news,
    paper_orders,
    risk,
    settings as settings_api,
)
from app.core.config import settings
from app.db.init_db import init_db
from app.websocket import market_stream


app = FastAPI(
    title="OathFi Backend",
    version=settings.app_version,
    description="Backend fact layer for OathFi demo workflows.",
    openapi_url="/openapi.json",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


app.include_router(health.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")
app.include_router(market.router, prefix="/api")
app.include_router(news.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(agent.router, prefix="/api")
app.include_router(hypotheses.router, prefix="/api")
app.include_router(backtests.router, prefix="/api")
app.include_router(risk.router, prefix="/api")
app.include_router(paper_orders.router, prefix="/api")
app.include_router(paper_orders.account_router, prefix="/api")
app.include_router(audit_reports.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(ecosystem.router, prefix="/api")
app.include_router(market_stream.router)
