from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, portfolio, stocks, trades
from app.core.config import settings

app = FastAPI(title="FinSim API", version="1.0.0", description="AI-powered paper trading platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(stocks.router)
app.include_router(trades.router)
app.include_router(portfolio.router)


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}
