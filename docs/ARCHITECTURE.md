# StockSense Architecture

This document describes the current code at main, reviewed 2026-09-01. It is
code-first: it records behavior, dependencies, and limitations actually found
in the repository rather than intended product behavior. File:line references
refer to the current working tree.

## 1. Scope and entry points

StockSense is a locally-run Indian-equity swing-trading application. A React/
Vite browser client calls a FastAPI/SQLAlchemy backend for NSE screening,
market/stock views, portfolios, watchlists, alerts, news, and Claude-backed
analysis. It does not place broker orders.

| Entry | Actual role |
|---|---|
| start.bat | Starts backend\\venv with uvicorn on 127.0.0.1:8000, waits using ping, starts Vite, opens Chrome. It assumes that venv and Chrome exist. |
| backend/main.py | Creates tables, builds FastAPI, mounts routers, starts broker/socket/scheduler/alert work. |
| frontend/src/main.jsx | React root under StrictMode. |
| frontend/src/App.jsx | Browser routes, protected shell, toasts, notifications, reduced-motion configuration. |
| backend/scripts | Manual maintenance/diagnostics, not tests. |
| backend/data/nse_stocks.json | Search and screener universe. It is read directly at runtime; live search does not query stock_cache. |

The supported Python range is 3.10-3.13 because pandas-ta pulls numba, which
did not have a Python 3.14 wheel when documented. The checked-in local venv
references Python 3.14, which is not proof that a clean 3.14 installation
works.

## 2. Component diagram

~~~mermaid
flowchart TB
  subgraph Browser["Browser: React 18 + Vite"]
    Routes["App.jsx + ProtectedRoute"]
    Pages["11 pages / shared components"]
    Store["Zustand cache"]
    Axios["Axios: Bearer interceptor"]
    SSE["fetch ReadableStream: screener SSE"]
    Routes --> Pages
    Pages <--> Store
    Pages --> Axios
    Pages --> SSE
  end
  subgraph API["FastAPI: backend/main.py"]
    Auth["auth router: bcrypt + JWT HS256"]
    Routers["stocks | analysis | screener | news | portfolio | watchlist | alerts | ai"]
    Runtime["lifespan: Angel login, socket service, scheduler, alert task"]
    Services["service layer"]
    DB[("SQLite / SQLAlchemy")]
    Auth --> DB
    Routers --> Services
    Routers --> DB
    Runtime --> Services
  end
  subgraph External["External systems used right now"]
    Angel["Angel One: login, quotes, token lookup, broker socket"]
    YF["yfinance: history, quotes, index/ETF, batch OHLC"]
    Screen["Screener.in: scraped fundamentals, peers, results"]
    NSE["NSE: institutional data, filings, equity CSV"]
    RSS["Google News + market RSS"]
    Claude["Anthropic Claude: reports"]
    Groq["Groq openai/gpt-oss-20b: sentiment"]
  end
  Axios -->|REST Authorization header| Auth
  Axios -->|REST Authorization header| Routers
  SSE -->|GET /api/screener/stream Authorization header| Routers
  Services --> Angel
  Services --> YF
  Services --> Screen
  Services --> NSE
  Services --> RSS
  Services --> Claude
  Services --> Groq
~~~

## 3. Startup, database, and auth

config.py:20-52 reads the repository .env. SECRET_KEY is required, rejects
known placeholders, and must be at least 32 characters. Other credentials
default to empty strings. Startup does not preflight Anthropic, Groq, or Angel
credentials; each capability fails or degrades on its own path.

database.py:6-29 uses synchronous SQLAlchemy with DATABASE_URL defaulting to
sqlite:///./stocksense.db and check_same_thread=False. It creates a
request-scoped session and calls Base.metadata.create_all(). There is no
migration tool; create_all creates absent tables but does not migrate an
existing schema.

main.py calls init_db twice: at import (line 18) and in lifespan (line 28).
This is redundant but usually harmless. Lifespan then attempts Angel login,
starts price services, configures APScheduler via
screener_service.setup_scheduler(), and creates start_alert_checker() with
asyncio.create_task (lines 26-47). It does not cancel/tear down that task,
scheduler, or broker socket on shutdown.

Authentication is email/password plus bcrypt and a seven-day HS256 JWT.
auth.py:110-133 stores email in sub. The client keeps the token in
localStorage; utils/api.js attaches it on Axios requests and redirects after
401. There is no refresh token, revocation list, server-side logout, secure
cookie, or CSRF model.

Protection is not a single global policy:

- main.py:82-88 gives stocks, analysis, news, and AI an auth dependency.
- Every screener route explicitly requires auth, including SSE
  (routers/screener.py:51-141). fetch is used rather than EventSource because
  EventSource cannot attach Authorization.
- Portfolio, watchlist, alerts, and selected auth endpoints inject
  current_user individually.
- Root / and /api/angel-one/status are public. The anonymous root /ws
  heartbeat was removed (ADR-012): nothing used it.

Therefore the historical statement that the whole API is behind auth is
overbroad.

## 4. External integrations

| System | Current use | Important limitation |
|---|---|---|
| Angel One SmartAPI | angel_one_service.py performs TOTP login, quote/token lookup; angel_one_websocket.py receives ticks. | Startup tries it and quote behavior falls back to yfinance. Vendor file logging is disabled at import because it once leaked credentials. |
| yfinance | market_data.py, technical/index/ETF services, screener bulk OHLC, portfolio prices, universe/sector scripts. | It is direct source for many paths, not merely an after-hours fallback. |
| Screener.in | screener_in_service.py scrapes ratios, peers, quarterly/annual data, shareholding. | HTML parsing and process-local caching are brittle. |
| NSE | institutional data, deals, filings, equity-universe CSV. | Browser-like headers/cookies; failure commonly becomes empty/fallback data. |
| RSS | Google News for stocks; Economic Times, Livemint, Business Standard, Financial Express market feeds. | No current NewsAPI call. NEWSAPI_KEY is settings-only. |
| Anthropic | ai_service.py structured reports. | Sonnet deep analysis; Haiku auxiliary calls. |
| Groq | news_service.py health check and batch sentiment. | Current model is openai/gpt-oss-20b, not llama-3.1-8b-instant. |
| Gemini | No runtime call found. | google-generativeai was removed from requirements; GEMINI_API_KEY stays in config only so older .env files still load. |

## 5. Frontend structure

App.jsx has public /login and /register. Protected Layout routes are Dashboard,
Screener, StockDetail, IndexDetail, ETFDetail, AIAnalysis, Portfolio, News, and
Watchlist. PatternScanner.jsx is rendered from the stock detail surface, not a
route.

useStore.js holds in-memory cached dashboard, screener, portfolio, and market
news state; only user state starts from localStorage. Pages own most request,
loading, and error state. components/ui contains controls; lib contains
formatting, chart configuration, animation values, class joining, and
browser-print templates. There is no normalized client cache or invalidation
protocol.

## 6. Major data flows

### Dashboard, search, and price streaming

1. Dashboard calls authenticated stock/news routes for overview, sectors,
   movers, trending stocks, and market news.
2. market_data.py caches overview 60 seconds, sectors/movers 300 seconds,
   history 15 minutes, and fundamentals 24 hours.
3. stocks.py:53-162 derives trending stocks from most-active/gainers and may
   fetch a Google News RSS item per displayed stock as a best-effort reason.
   This is not Groq sentiment.
4. /stocks/search reads nse_stocks.json every request and appends static
   ETF/index lists (stocks.py:164-186); Stock quotes (`/stocks/quote/{symbol}`) are fetched on-demand by the frontend and then polled every 10 seconds via HTTP when the market is open.

### Technical, fundamental, patterns, indices, ETFs

1. /analysis/technical moves pandas/yfinance work to a thread and calls
   TechnicalAnalysisService.get_full_technical_snapshot(). analysis.py:6-20
   recursively converts NaN/infinite values to JSON null.
2. /analysis/fundamental delegates through fundamental_analysis.py to
   Screener.in. refresh=true deletes only that symbol's process-local cache.
3. /analysis/patterns fetches technical data again, extracts nested
   price/support/resistance/RSI/trend, then calls pattern_service.
4. /analysis/index and /analysis/etf call deterministic functions in
   index_etf_analysis.py. These verdicts are not Claude output.
5. Pattern scans use FastAPI BackgroundTasks and module-global
   _scan_status/_scan_results (analysis.py:15-18, 209-321): restart-lossy,
   not user-scoped, timestamp-second IDs, sequential 0.5-second work.

### Screener

1. Browser conditions are indicator/operator/value/value2; the catalogue comes
   from /screener/indicators.
2. ScreenerEngine separates technical, fundamental, and institutional
   conditions. It downloads one year of yfinance OHLC in 50-symbol chunks with
   threads=True, evaluates technical filters in memory, then calls
   Screener.in/NSE only for technical survivors.
3. Sync upstream work uses asyncio.to_thread and asyncio.gather so SSE can
   produce result/progress/summary frames. Screener.jsx buffers ReadableStream
   chunks because a network chunk can split an SSE frame.
4. This staged funnel is the verified optimization architecture. A benchmark executed in September 2026 confirmed that it processes a full universe load (2,107 stocks) in ~64.5s (with 1,338 passing the initial filter).
5. Saved screeners are per user: the model has a user_id and every
   saved-screener route filters on the requesting user (ADR-012).

### News and sentiment

1. Stock news queries Google News RSS using company name, sorts entries, and
   classifies at most ten titles. Market news concurrently fetches five feeds,
   discards pre-2024 entries, sorts, and has a 30-minute function cache.
2. news_service.py initializes Groq at import using
   SENTIMENT_MODEL = openai/gpt-oss-20b and max_tokens=200. It records reasons
   for no key/model/key/rate/empty startup failure in SENTIMENT_STATUS.
3. Classification sends an indexed JSON request with max_tokens=4000,
   temperature=0.1. Scores are directional: Positive >=7, Negative <=3,
   Neutral 4-6. Overall is Positive >=6.5, Negative <=3.5. (Fixed an earlier
   bug where undefined score scale meant the model inverted scoring by assuming
   score = impact magnitude).
4. Stock results have a four-hour symbol cache; refresh=true bypasses it.
   Market news deliberately has only its 30-minute cache, avoiding a
   four-hour frozen headline list.
5. Disabled/error sentiment stamps every article Neutral/Low/5 so news still
   renders. sentiment_available warns about startup failure only. An inference
   failure after a successful health check does not update SENTIMENT_STATUS, so
   the UI can stay green while synthetic neutral results display.

### Claude analysis and reports

1. AIAnalysis and StockDetail gather technical/fundamental data then POST a
   bundle plus analysis_type to /ai/analyze/{symbol}.
2. routers/ai.py:13-40 separately gets institutional data. AIService enriches
   prompts with institutional trend, quarterly trajectory, and peer comparison.
3. generate_stock_analysis branches into trade_setup, risk, fundamental, and
   full (ai_service.py:81-579). They differ in persona/input emphasis but
   request one JSON response shape for a shared UI.
4. Claude Sonnet uses max_tokens=8000 and temperature=0.2. Markdown fences are
   stripped; stop_reason=max_tokens is rejected before JSON parsing. This is a
   controlled truncation error, not repair/retry.
5. Prompt rules ask Swing to be Wait/Avoid when ADX < 20 or relative strength
   versus Nifty is negative. Risk/full also request the tighter of
   Entry - 1.5*ATR and recent swing low with at least 1:2 risk/reward. These are
   model instructions, not numerical enforcement.
6. setup_type is normalized to Pullback to EMA 20/50, Breakout with Volume, or
   Range Bound; off-enum values are dropped. This checks vocabulary only, not
   market facts.
7. Portfolio review, screener insights, and indicator explanation use Haiku.
   Printable reports are browser-print HTML in lib/pdfTemplates.js, not backend
   PDF generation.

### Persistence, portfolios, watchlists, alerts

Portfolio routes lazily create the current user's first My Portfolio and scope
holdings/trades through it. POST /portfolio/trade always records pnl=0; it
neither reconciles holdings nor executes an order. Watchlists/alerts scope
queries to user ownership. The alert background loop marks rows triggered and
notified; the browser polls triggered alerts and owns desktop notification
delivery. There is no email/push provider, durable delivery queue, or retry.

## 7. Module responsibilities

| Module/group | Responsibility | Dependencies/caveat |
|---|---|---|
| routers/auth.py | Registration, login, profile, JWT. | bcrypt, PyJWT, user models; inactive users are refused; login/register are IP rate-limited. |
| routers/stocks.py | Dashboard, search, quote/history/fundamentals. | yfinance/Angel; behind router-level auth. The price socket was removed. |
| routers/analysis.py | Analysis APIs and pattern scans. | Services; in-memory scans with random ids, owner checks, one running scan per user, 1h eviction. |
| routers/screener.py | Catalogue, batch/SSE screen, saved configurations. | ScreenerEngine/auth; saved data global. |
| routers/news.py | News and filings. | Import-error fallback hides service import failure as empty data. |
| routers/ai.py | Claude stock/portfolio/indicator APIs. | Adds institutional data. |
| routers/portfolio.py | Portfolio/holdings/trades/performance/review. | yfinance/AI; no realized P&L. |
| routers/watchlist.py, alerts.py | User-scoped CRUD and notification polling. | SQLAlchemy/auth. |
| market_data.py | yfinance data and TTL cache decorator. | All cache state process-local. |
| technical_analysis.py | Indicators and technical score. | pandas/pandas-ta/yfinance; sync computation. |
| screener_service.py | 40 indicators, staged screen, SSE, scheduler. | No durable jobs. |
| screener_in_service.py | Scraped fundamentals/peers/score. | HTML/caching fragility. |
| institutional_service.py | NSE flows/deals/promoter data/smart-money score. | NSE session availability. |
| pattern_service.py | 16 patterns and rule-based setup. | Separate fixed 4% stop fallback. |
| index_etf_analysis.py | Deterministic index/ETF metrics/verdicts. | Not Claude analysis. |
| news_service.py | RSS/filings/Groq/cache. | Import-time health state, neutral fallback. |
| ai_service.py | Prompting/parsing/setup label validation/helpers. | Most model fields unvalidated. |
| alert_checker.py | Periodic DB threshold evaluation. | Browser performs final delivery. |

## 8. Database schema

All 12 tables are registered by database.init_db(). Ownership is enforced by
router query convention, not a global tenant layer.

| Table | Columns and actual purpose |
|---|---|
| users | id PK, unique indexed email, password_hash, optional name, created_at, is_active. Inactive users cannot log in and their tokens are rejected. |
| user_preferences | user_id PK/FK, default_watchlist, JSON notification_settings, theme. Model default light; registration writes dark. |
| stock_cache | symbol PK, name, sector, industry, market_cap, last_updated. Reference/cache table. |
| price_history | composite symbol/date PK, OHLC, volume. No reviewed runtime writer. |
| technical_snapshots | composite symbol/timestamp PK, RSI/MACD/EMAs/ADX/ATR/VWAP/OBV. No reviewed runtime writer. |
| portfolios | id, user_id FK, name, created_at. Current code uses first portfolio only. |
| holdings | id, portfolio_id FK, symbol FK, quantity, avg_buy_price, buy_date, notes. |
| trades | id, portfolio_id FK, symbol FK, type, quantity, price, date, pnl. Sale path writes zero P&L. |
| watchlists | id, user_id FK, name. |
| watchlist_stocks | id, watchlist_id FK, plain string symbol, added_at, notes. |
| alerts | id, user_id FK, symbol FK, type, string condition, value, triggered/notified flags, created_at. |
| saved_screeners | id, name, description, JSON-text conditions, sorting, timestamps, user_id FK. Scoped per user; init_db adds the column to older databases, where pre-existing rows stay NULL and invisible. |

## 9. Architectural debt

1. Automated tests cover the security layer only (backend/tests, run in CI);
   market-data, screener and AI logic are untested. No migration system,
   structured observability, job queue, or durable cache; scripts use live
   services.
2. SQLite, synchronous sessions, globals, in-memory caches/jobs, and
   background tasks make this single-process/local. Multiple workers would
   disagree about state and duplicate background work.
3. Scraped/best-effort external services and broad exception handling can turn
   upstream failure into empty/default data.
4. LocalStorage JWTs are exposed to same-origin XSS and cannot be revoked;
   rate limits are per process. Acceptable locally, see SECURITY.md.
5. price_history and technical_snapshots have no evident writer.
6. LLM trade fields are not financially validated. Rule-based pattern setup has
   a 4% fallback while risk/full prompts use ATR-based guidance.
7. News sentiment has a known post-startup degradation blind spot.
8. NEWSAPI_KEY and GEMINI_API_KEY remain in config only for .env
   compatibility; neither integration exists.
