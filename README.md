# StockSense

**A swing trading terminal for the Indian stock market, built with React and FastAPI.**

StockSense screens 2,100+ NSE-listed stocks against technical and fundamental filters, pulls in live market data via Angel One SmartAPI, and uses LLM-powered analysis to generate actionable trade setups — complete with entry points, targets, and stop losses.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?logo=fastapi&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Demo

> **Add screenshots here.** Drop 2–3 screenshots of the running app into a `docs/` folder and reference them like:
>
> ```markdown
> ![Dashboard](docs/dashboard.png)
> ![AI Analysis](docs/ai-analysis.png)
> ```

---

## Features

- **Multi-Condition Screener** — Scans 2,100+ NSE stocks across 30+ indicators (EMA crossovers, RSI, MACD, ADX, Bollinger Bands, volume ratios) plus fundamental filters (P/E, P/B, ROE, debt-to-equity, revenue growth) and institutional activity (smart money score, promoter trends, bulk deals). Results stream in real-time via SSE with a live progress bar.
- **AI-Powered Analysis** — Aggregates technical, fundamental, and news data into a structured prompt sent to Claude / Gemini. Returns bull/bear cases, swing trade setups (entry, target, stop loss), risk factors, and multi-timeframe verdicts — all rendered in a formatted report.
- **Interactive Charts** — TradingView Lightweight Charts with candlestick data, EMA overlays, and AI-generated trade levels (entry/target/SL) drawn directly on the chart.
- **Live Market Data** — Angel One SmartAPI WebSocket connection for real-time prices during market hours, with automatic yfinance fallback for after-hours and weekends.
- **Sector Heatmap** — Visual grid of sector performance with color-coded gains/losses. Click any sector to jump to a pre-filtered screener view.
- **Chart Pattern Detection** — Scans recent candlesticks for 15+ patterns (Doji, Hammer, Engulfing, Morning/Evening Star, Three White Soldiers, etc.) with confidence scores and bullish/bearish classification.
- **Stock Deep Dive** — Dedicated detail page with tabs for Technical Snapshot (EMA levels, RSI, MACD, ADX, Stochastic RSI, ATR, OBV), Fundamental Analysis (key ratios, growth metrics, shareholding breakdown, score card), and full AI Analysis.
- **Portfolio Tracker** — Track holdings, monitor real-time P&L, and get AI-driven rebalancing suggestions.
- **Smart Alerts** — Set price-based alerts on any stock; a background checker polls prices and triggers desktop notifications via the browser Notification API.
- **Index & ETF Analysis** — Dedicated views for Nifty 50, Sensex, and major ETFs with FII/DII flow data, market breadth, P/E valuation, and AI-generated market verdicts.
- **News Feed with Sentiment** — Aggregates market news from RSS feeds and NewsAPI, with optional Groq-powered sentiment classification (bullish/bearish/neutral badges).
- **Command Palette** — `Ctrl+K` to fuzzy search across all 2,100+ stocks instantly.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Zustand, Tailwind CSS, Framer Motion, Lightweight Charts |
| **Backend** | FastAPI, SQLAlchemy (SQLite), APScheduler, Pandas |
| **Market Data** | Angel One SmartAPI (primary), yfinance (fallback) |
| **AI** | Anthropic Claude, Google Gemini, Groq (sentiment) |
| **Technical Analysis** | pandas-ta, custom pattern detection engine |
| **Data Sources** | NSE (institutional data, bulk deals), RSS feeds, NewsAPI |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                       │
│  Dashboard · Screener · Stock Detail · AI Analysis      │
│  Portfolio · Watchlist · News · Index/ETF · Alerts       │
└──────────────┬──────────────────────┬───────────────────┘
               │ REST + SSE           │ WebSocket
               ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│                   FastAPI Backend                        │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Screener │  │ AI Service   │  │ Market Data       │  │
│  │ Engine   │  │ (Claude /    │  │ (Angel One /      │  │
│  │ (2100+)  │  │  Gemini)     │  │  yfinance)        │  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Technical│  │ Pattern      │  │ News + Sentiment  │  │
│  │ Analysis │  │ Detection    │  │ (Groq / RSS)      │  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
│  ┌──────────┐  ┌──────────────┐                         │
│  │ Index/ETF│  │ Institutional│                         │
│  │ Analysis │  │ Data (NSE)   │                         │
│  └──────────┘  └──────────────┘                         │
│                                                         │
│                  SQLite (stocksense.db)                  │
└─────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- An Anthropic or Gemini API key (for AI analysis features)

### 1. Clone the repo

```bash
git clone https://github.com/Shrey-Vhr/StockSense.git
cd StockSense
```

### 2. Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure environment variables

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) below for what each key does.

### 4. Frontend setup

```bash
cd frontend
npm install
```

### 5. Run the app

**Option A — Start both servers manually:**

```bash
# Terminal 1 (backend)
cd backend
uvicorn main:app --reload

# Terminal 2 (frontend)
cd frontend
npm run dev
```

**Option B — Windows one-click:**

```bash
start.bat
```

The app will be running at **http://localhost:5173** with the API at **http://localhost:8000**.

---

## Environment Variables

Create a `.env` file in the project root (see `.env.example`):

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes* | Claude API key for AI analysis |
| `GEMINI_API_KEY` | Yes* | Gemini API key (alternative to Claude) |
| `GROQ_API_KEY` | No | Groq API key for news sentiment analysis |
| `ANGEL_ONE_API_KEY` | No | Angel One SmartAPI key for live market data |
| `ANGEL_ONE_CLIENT_ID` | No | Angel One client ID |
| `ANGEL_ONE_PASSWORD` | No | Angel One password |
| `ANGEL_ONE_TOTP_SECRET` | No | Angel One TOTP secret for auto-login |
| `NEWSAPI_KEY` | No | NewsAPI key for market news feed |
| `SECRET_KEY` | Yes | JWT signing secret (any random string) |
| `DATABASE_URL` | No | Database URL (defaults to SQLite) |

*At least one AI provider key is required for the analysis features to work.

---

## Project Structure

```
StockSense/
├── backend/
│   ├── main.py                    # FastAPI app entry point & WebSocket handler
│   ├── config.py                  # Pydantic settings & env loading
│   ├── database.py                # SQLAlchemy engine & session setup
│   ├── models/                    # DB models (User, Stock, Alert, Portfolio, etc.)
│   ├── routers/                   # API route handlers
│   │   ├── auth.py                # JWT authentication (register/login)
│   │   ├── stocks.py              # Stock data, gainers/losers, sector performance
│   │   ├── analysis.py            # Technical & fundamental analysis endpoints
│   │   ├── screener.py            # Multi-condition screener with SSE streaming
│   │   ├── portfolio.py           # Portfolio CRUD & P&L tracking
│   │   ├── ai.py                  # AI analysis generation endpoints
│   │   ├── alerts.py              # Price alert management
│   │   ├── watchlist.py           # Watchlist management
│   │   └── news.py                # Market news feed
│   ├── services/                  # Core business logic
│   │   ├── ai_service.py          # Claude/Gemini prompt engineering & response parsing
│   │   ├── screener_service.py    # 2,100+ stock screening engine (30+ indicators)
│   │   ├── technical_analysis.py  # EMA, RSI, MACD, ADX, Bollinger, ATR, OBV
│   │   ├── pattern_service.py     # Candlestick pattern detection (15+ patterns)
│   │   ├── market_data.py         # Price data fetching & caching
│   │   ├── institutional_service.py # NSE scraping for shareholding & bulk deals
│   │   ├── index_etf_analysis.py  # Index/ETF analysis with FII/DII flows
│   │   ├── news_service.py        # RSS + NewsAPI aggregation with Groq sentiment
│   │   ├── angel_one_service.py   # Angel One SmartAPI integration
│   │   ├── websocket_service.py   # Real-time price broadcasting
│   │   └── alert_checker.py       # Background alert monitoring loop
│   ├── data/
│   │   └── nse_stocks.json        # Universe of 2,100+ NSE stock symbols
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Router setup with animated page transitions
│   │   ├── pages/                 # Route-level components
│   │   │   ├── Dashboard.jsx      # Market overview, indices, heatmap, trending
│   │   │   ├── StockDetail.jsx    # Full stock analysis (technical/fundamental/AI)
│   │   │   ├── Screener.jsx       # Multi-condition stock screener UI
│   │   │   ├── AIAnalysis.jsx     # Standalone AI analysis page
│   │   │   ├── Portfolio.jsx      # Portfolio tracking & P&L
│   │   │   ├── IndexDetail.jsx    # Index analysis (Nifty 50, Sensex)
│   │   │   ├── ETFDetail.jsx      # ETF analysis
│   │   │   └── ...
│   │   ├── components/            # Reusable UI components
│   │   │   ├── Dashboard/         # SectorHeatmap, TrendingSection
│   │   │   └── Layout/            # Sidebar, Header, CommandPalette
│   │   ├── hooks/                 # useAuth, useDebounce, useCountUp, useNotifications
│   │   ├── store/                 # Zustand global state
│   │   └── utils/                 # Axios API client
│   └── package.json
├── .env.example                   # Environment variable template
├── start.bat                      # One-click launcher (Windows)
└── README.md
```

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
