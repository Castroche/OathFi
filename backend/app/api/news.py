from fastapi import APIRouter, Query

from app.schemas.news import NewsEventsResponse, NewsLatestResponse
from app.services.news_service import NewsService

router = APIRouter(prefix="/news", tags=["news"])
service = NewsService()


@router.get("/events", response_model=NewsEventsResponse)
def get_news_events(language: str = Query(default="zh-CN"), limit: int = Query(default=20, ge=1, le=100)) -> NewsEventsResponse:
    return NewsEventsResponse(data=service.events(language=language, limit=limit))


@router.get("/latest", response_model=NewsLatestResponse)
def get_latest_news(language: str = Query(default="zh-CN"), limit: int = Query(default=10, ge=1, le=50)) -> NewsLatestResponse:
    return NewsLatestResponse(data=service.latest(language=language, limit=limit))
