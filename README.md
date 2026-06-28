# Stock Stimulation — AI-Powered Paper Trading Platform

Educational investment simulation. No real money is ever involved.

---

## Project Structure

```
fintech_app/
├── backend/          FastAPI + SQLAlchemy + PostgreSQL
└── frontend/         React + TypeScript + Vite + Tailwind CSS
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ running locally (or via Docker)
- Redis 7+ running locally (or via Docker)

---

## Backend Setup

```bash
cd backend

# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env
# Edit .env — fill in DATABASE_URL, JWT_SECRET_KEY, and ALPHA_VANTAGE_API_KEY

# 4. Create the database (psql example)
createdb fintech_app

# 5. Run migrations
alembic upgrade head

# 6. Start the dev server
uvicorn app.main:app --reload --port 8000
```

API docs available at http://localhost:8000/docs

### Start Redis (Docker)

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

---

## Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env if your backend runs on a different port

# 3. Start the dev server
npm run dev
```

Frontend available at http://localhost:5173

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET_KEY` | Yes | — | Secret for signing JWTs — use a long random string in production |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | Token lifetime |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Comma-separated allowed origins |
| `ALPHA_VANTAGE_API_KEY` | Yes | — | Free key at https://www.alphavantage.co/support/#api-key |
| `NEWS_API_KEY` | No | `""` | Free key at https://newsapi.org/register — news endpoints return empty when unset |
| `GEMINI_API_KEY` | No | `""` | Free key from https://aistudio.google.com (Google account, no credit card) — `/recommendation` returns 503 when unset |
| `GEMINI_MODEL` | No | `gemini-1.5-flash` | Override to `gemini-1.5-pro` for deeper reasoning |
| `REDIS_URL` | No | `redis://localhost:6379/0` | Redis connection URL |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | `http://localhost:8000` | Backend API base URL |

---

## API Reference

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | — | Register; creates user + $100,000 virtual portfolio |
| `POST` | `/api/auth/login` | — | Login; returns JWT |
| `GET` | `/api/auth/me` | Bearer | Current user info + cash balance |
| `POST` | `/api/auth/logout` | — | Client-side token discard (stub) |

### Stocks (`/api/stocks`) — all require Bearer JWT

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/stocks/search?q=AAPL` | Ticker/company search (Alpha Vantage SYMBOL_SEARCH) |
| `GET` | `/api/stocks/{ticker}/quote` | Current price, change, volume |
| `GET` | `/api/stocks/{ticker}/history?range=1Y` | OHLCV bars; range = 1M / 6M / 1Y / 5Y |
| `GET` | `/api/stocks/{ticker}/overview` | Name, market cap, 52W high/low, sector |
| `GET` | `/api/stocks/{ticker}/news?limit=20` | Recent news articles (NewsAPI, last ~30 days) |
| `GET` | `/api/stocks/{ticker}/events?range=1Y&threshold=5` | Significant price moves (≥threshold%) with attached headlines; older moves include an honest unavailability note |
| `GET` | `/api/stocks/{ticker}/recommendation?refresh=false` | AI-generated BUY/SELL/HOLD recommendation with rationale, key factors, and evidence summary; add `?refresh=true` to bypass cache |

**News data limitation:** NewsAPI free tier covers approximately the last 30 days. Significant moves detected outside that window are still returned, but their `news_available` field is `false` with a clear explanation. No headlines are fabricated.

---

## Caching Strategy

All market data is cached in Redis to handle Alpha Vantage's rate limits (5 req/min on the free tier).

| Endpoint | Primary TTL | Stale fallback TTL |
|---|---|---|
| Quote | 60 s | 24 h |
| History (full series) | 6 h | 12 days |
| Overview | 24 h | 48 days |
| Search | 1 h | 48 h |
| Recent news | 30 min | 24 h |
| News range (per event window) | 60 min | 48 h |
| AI recommendation (per user + position) | 30 min | — (no stale; stale rec + changed position = misleading) |

On a provider error (rate limit or network failure), the service serves stale cache if available and logs a warning, rather than returning a 503.

---

## Database Schema

```
users
  id              UUID  PK
  email           TEXT  unique, indexed
  hashed_password TEXT
  created_at      TIMESTAMP
  is_active       BOOLEAN

portfolios
  id              UUID  PK
  user_id         UUID  FK → users.id  (unique — one portfolio per user)
  cash_balance    NUMERIC(20,2)  default 100000.00
  created_at      TIMESTAMP

price_bars                        ← second-layer cache, wired in trading chunk
  ticker          VARCHAR(20)  PK (part)
  date            DATE         PK (part)
  open            NUMERIC(20,6)
  high            NUMERIC(20,6)
  low             NUMERIC(20,6)
  close           NUMERIC(20,6)
  volume          BIGINT
```

Money/price values are stored as `NUMERIC` — never floats.

---

## Running Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Roll back one step
alembic downgrade -1

# Auto-generate a new migration after model changes
alembic revision --autogenerate -m "describe your change"
```
