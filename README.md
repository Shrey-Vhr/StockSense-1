# StockSense

StockSense is an AI-powered swing trading terminal for the Indian Stock Market (NSE). It combines quantitative technical filters, fundamental health scores, and real-time news sentiment, orchestrating them all through Anthropic's Claude 3.5 (Opus) to generate highly confident trade setups.

## Features

- **Automated Swing Screener**: Runs in the background (via APScheduler) filtering the top 200 NSE stocks against strict technical and fundamental criteria.
- **Claude AI Analysis**: Correlates technical data, fundamentals, and news sentiment to generate Bull/Bear cases and exact Entry/Target/Stop Loss setups.
- **Real-Time WebSockets**: Live prices and alerts streamed directly to the frontend.
- **Portfolio Tracker**: Monitors holdings, P&L, and provides AI-driven rebalancing advice.

---

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Backend Setup (FastAPI)

Navigate to the root directory and install Python dependencies:
```bash
# If using uv (recommended for speed)
uv pip install -r backend/requirements.txt

# Or using standard pip
pip install -r backend/requirements.txt
```

Create a `.env` file in the root directory with the following keys:
```env
# Required for AI Analysis
ANTHROPIC_API_KEY=your_claude_api_key_here
# Alternative/Fallback model
GEMINI_API_KEY=your_gemini_api_key_here

# JWT Secret for Auth
SECRET_KEY=your_super_secret_jwt_key

# Database
DATABASE_URL=sqlite:///./stocksense.db
```

Start the Backend Server:
```bash
cd backend
uvicorn main:app --reload
```
The API will be running at `http://localhost:8000`

### 2. Frontend Setup (React/Vite)

Navigate to the frontend directory:
```bash
cd frontend
npm install
```

Start the Frontend Dev Server:
```bash
npm run dev
```
The App will be running at `http://localhost:5173`

---

## 🏗️ Architecture

- **Backend**: FastAPI, SQLAlchemy (SQLite), APScheduler, TA-Lib, YFinance.
- **Frontend**: React (Vite), Zustand (State), Tailwind CSS, Lightweight Charts, Lucide React.
- **AI Brain**: Anthropic Python SDK (Claude Opus).

## 🚀 Usage Guide
1. Create an account via the Login page.
2. The **Dashboard** will load pre-cached data and run the screener.
3. Use the **Search Bar** to find any NSE stock (e.g., "HDFCBANK").
4. On the **Stock Detail** page, click the **AI Analysis** tab to generate a custom report.
5. Create **Alerts** by clicking the bell icon next to the stock price.
