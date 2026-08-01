# Trigger uvicorn reload
import os
import json
import time
import re
import feedparser
import requests
import httpx
from datetime import datetime, timezone
import dateutil.parser
from email.utils import parsedate_to_datetime
import asyncio
from functools import wraps
import urllib.parse
import logging
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)

SENTIMENT_ENABLED = False
_groq_client = None

import sys
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def _initialize_groq():
  global SENTIMENT_ENABLED, _groq_client
  
  api_key = os.environ.get('GROQ_API_KEY', '').strip()
  
  if not api_key:
    try:
      from config import settings
      api_key = getattr(settings, 'GROQ_API_KEY', '').strip()
    except:
      pass
  
  if not api_key:
    try:
      env_path = os.path.join(
        os.path.dirname(__file__), '..', '.env'
      )
      with open(env_path, 'r') as f:
        for line in f:
          if line.startswith('GROQ_API_KEY='):
            api_key = line.split('=', 1)[1].strip()
            break
    except:
      pass
  
  if not api_key:
    print("❌ GROQ_API_KEY not found")
    return
  
  # Was printing the first 12 characters of the key on every startup. That is
  # enough to leak in a terminal screenshot, and knowing the prefix tells you
  # nothing you cannot get from "a key is configured".
  print("🔑 Groq key: configured")
  
  try:
    from groq import Groq
    client = Groq(api_key=api_key)
    test = client.chat.completions.create(
      model="llama-3.1-8b-instant",
      messages=[{"role":"user","content":"Say OK"}],
      max_tokens=5
    )
    if test.choices[0].message.content:
      _groq_client = client
      SENTIMENT_ENABLED = True
      print("✅ Groq sentiment ENABLED")
  except Exception as e:
    print(f"❌ Groq init failed: {e}")

_initialize_groq()
print(f"📊 Sentiment enabled: {SENTIMENT_ENABLED}")

# Cache: symbol -> (result, timestamp)
_sentiment_cache: Dict = {}
_sentiment_cache = {}
SENTIMENT_CACHE_HOURS = 0

def get_cached_sentiment(cache_key: str):
  if cache_key in _sentiment_cache:
    data, timestamp = _sentiment_cache[cache_key]
    age_hours = (time.time() - timestamp) / 3600
    if age_hours < SENTIMENT_CACHE_HOURS:
      logger.info(f"Cache hit for {cache_key} ({age_hours:.1f}h old)")
      return data
  return None

def set_cached_sentiment(cache_key: str, data):
  _sentiment_cache[cache_key] = (data, time.time())

def parse_news_date(date_str):
    if not date_str:
        return datetime.now(timezone.utc).isoformat()
    
    try:
        # Try RFC 2822 format (standard RSS format)
        dt = parsedate_to_datetime(date_str)
        return dt.isoformat()
    except:
        pass
        
    try:
        # Try dateutil parser (handles most formats)
        dt = dateutil.parser.parse(date_str)
        return dt.isoformat()
    except:
        pass
        
    # Last resort - return current time
    return datetime.now(timezone.utc).isoformat()

def ttl_cache(ttl_seconds):
    cache = {}
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = str(args) + str(kwargs)
            now = time.time()
            if key in cache:
                result, timestamp = cache[key]
                if now - timestamp < ttl_seconds:
                    return result
            result = await func(*args, **kwargs)
            cache[key] = (result, now)
            return result
        return wrapper
    return decorator

def safe_parse_groq(text):
    # Remove control characters that break JSON
    text = re.sub(r'[\x00-\x1f\x7f]', ' ', text)
    
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Try extracting JSON array from response
    try:
        match = re.search(r'\[.*?\]', text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except json.JSONDecodeError:
        pass
    
    # Try extracting JSON object
    try:
        match = re.search(r'\{.*?\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except json.JSONDecodeError:
        pass
    
    return None

def analyze_news_sentiment(articles, stock_name):
  
  if not SENTIMENT_ENABLED or not _groq_client:
    print("⚠️ Sentiment disabled")
    for article in articles:
      article['sentiment'] = 'Neutral'
      article['impact'] = 'Low'
      article['score'] = 5
      article['reason'] = ''
    return articles
  
  to_analyze = articles[:10]
  if not to_analyze:
    return articles
  
  print(f"🤖 Analyzing {len(to_analyze)} headlines "
        f"for {stock_name}...")
  
  headlines_text = ""
  for i, a in enumerate(to_analyze):
    headline = a.get('title', '')[:150]
    headlines_text += f"{i+1}. {headline}\n"
  
  prompt = f"""You are an expert Indian stock 
market analyst specializing in sentiment analysis
for retail investors on NSE/BSE.

Analyze these news headlines about {stock_name}.

Headlines:
{headlines_text}

Classification rules:
POSITIVE — Good for stock price/investors:
- Earnings beat, profit growth, revenue up
- New contracts, partnerships, expansions  
- Buy ratings, price target upgrades
- Dividend announcements, buybacks
- Market share gains, new products
- Stock price rising/rallying

NEGATIVE — Bad for stock price/investors:
- Stock falling, declining, crashing, tanking
- Earnings miss, profit down, revenue falling
- Investigations, legal issues, governance problems
- Downgrades, price target cuts
- CEO/chairman resignation (unexpected)
- 52-week low, multi-year low
- Debt concerns, credit rating cuts
- Regulatory penalties or bans

NEUTRAL — Factual/no clear impact:
- General market news mentioning the stock
- Analyst "what should investors do" articles
- Stock splits, bonus shares announcements
- Routine AGM/board meeting news
- Technical analysis articles
- Historical comparisons

IMPACT rules:
High — Price moved >2% or very significant news
Medium — Notable but moderate impact
Low — Minor or indirect impact

Respond with valid JSON only. 
Do not include any special characters,
quotes within strings must be escaped.
Keep all text fields under 100 characters.

Reply ONLY with valid JSON array, no markdown:
[{{"index":1,"sentiment":"Negative","impact":"High",
"score":2,"reason":"Stock tanked 9 percent"}}]

Analyze all {len(to_analyze)} headlines.
Be decisive — avoid over-classifying as Neutral.
When in doubt between Neutral and Negative/Positive,
pick the directional one."""

  try:
    response = _groq_client.chat.completions.create(
      model="llama-3.1-8b-instant",
      messages=[{"role":"user","content":prompt}],
      max_tokens=1000,
      temperature=0.1
    )
    text = response.choices[0].message.content.strip()
    print(f"📝 Groq: {text[:150]}...")
    
    if '```json' in text:
      text = text.split('```json')[1].split('```')[0].strip()
    elif '```' in text:
      text = text.split('```')[1].split('```')[0].strip()
    
    data = safe_parse_groq(text)
    if not data:
        raise ValueError("Failed to parse JSON")
    print(f"✅ Parsed {len(data)} sentiments")
    
    smap = {item['index']: item for item in data}
    
    for i, article in enumerate(articles):
      s = smap.get(i + 1, {}) if i < 10 else {}
      article['sentiment'] = s.get('sentiment', 'Neutral')
      article['impact'] = s.get('impact', 'Low')
      article['score'] = s.get('score', 5)
      article['reason'] = s.get('reason', '')
    
    return articles
    
  except Exception as e:
    print(f"❌ Groq error: {e}")
    for article in articles:
      article['sentiment'] = 'Neutral'
      article['impact'] = 'Low'
      article['score'] = 5
      article['reason'] = ''
    return articles

def calculate_overall_sentiment(articles: list) -> dict:
  if not articles:
    return {
      'overall_sentiment': 'Neutral',
      'score': 5.0,
      'positive_count': 0,
      'negative_count': 0,
      'neutral_count': 0,
      'summary': 'No news available'
    }
  
  scored = [a for a in articles if 'score' in a]
  
  positive = sum(
    1 for a in scored 
    if a.get('sentiment') == 'Positive'
  )
  negative = sum(
    1 for a in scored 
    if a.get('sentiment') == 'Negative'
  )
  neutral = sum(
    1 for a in scored 
    if a.get('sentiment') == 'Neutral'
  )
  
  if scored:
    avg_score = sum(
      a.get('score', 5) for a in scored
    ) / len(scored)
  else:
    avg_score = 5.0
  
  if avg_score >= 6.5:
    overall = 'Positive'
  elif avg_score <= 3.5:
    overall = 'Negative'
  else:
    overall = 'Neutral'
  
  return {
    'overall_sentiment': overall,
    'score': round(avg_score, 1),
    'positive_count': positive,
    'negative_count': negative,
    'neutral_count': neutral,
    'summary': (
      f"{positive} positive, "
      f"{negative} negative, "
      f"{neutral} neutral headlines"
    )
  }

async def get_stock_news(
  symbol: str, 
  company_name: str, 
  limit: int = 20
) -> dict:
  
  cache_key = f"news_{symbol}"
  
  # Check cache first
  cached = get_cached_sentiment(cache_key)
  if cached:
    return cached
  
  # Fetch news from all sources
  articles = []
  
  # Google News RSS
  try:
    search_query = urllib.parse.quote_plus(f"{company_name} NSE stock")
    google_url = (
      f"https://news.google.com/rss/search?"
      f"q={search_query}&"
      f"hl=en-IN&gl=IN&ceid=IN:en"
    )
    feed = feedparser.parse(google_url)
    for entry in feed.entries[:15]:
      articles.append({
        'title': entry.get('title', ''),
        'url': entry.get('link', ''),
        'source': 'Google News',
        'published_date': parse_news_date(
          entry.get('published', '')
        ),
        'sentiment': 'Neutral',
        'impact': 'Low',
        'score': 5,
        'reason': ''
      })
  except Exception as e:
    logger.error(f"Google News error: {e}")
  
  # Sort by date, take latest
  articles = sorted(
    articles,
    key=lambda x: x.get('published_date', ''),
    reverse=True
  )[:limit]
  
  # Format published display
  for a in articles:
    try:
      a['published_display'] = datetime.fromisoformat(a['published_date']).strftime("%b %d, %Y")
    except:
      a['published_display'] = "Recent"

  # Run sentiment analysis
  if articles:
    articles = analyze_news_sentiment(
      articles, company_name
    )
  
  # Calculate overall sentiment
  overall = calculate_overall_sentiment(articles)
  
  result = {
    'symbol': symbol,
    'company_name': company_name,
    'overall_sentiment': overall,
    'articles': articles
  }
  
  # Cache the result
  set_cached_sentiment(cache_key, result)
  
  return result

@ttl_cache(ttl_seconds=30*60)
async def get_market_news(limit: int = 15):
    NEWS_SOURCES = [
        {"name": "Economic Times", "url": "https://economictimes.indiatimes.com/markets/rss.cms"},
        {"name": "Economic Times Stocks", "url": "https://economictimes.indiatimes.com/markets/stocks/rss.cms"},
        {"name": "Livemint", "url": "https://www.livemint.com/rss/markets"},
        {"name": "Business Standard", "url": "https://www.business-standard.com/rss/markets-106.rss"},
        {"name": "Financial Express", "url": "https://www.financialexpress.com/market/feed/"}
    ]

    def fetch_rss_sync(source):
        try:
            feed = feedparser.parse(source['url'])
            articles = []
            for entry in feed.entries[:5]:
                articles.append({
                    "title": entry.get('title', ''),
                    "url": entry.get('link', ''),
                    "source": source['name'],
                    "published_date": parse_news_date(
                        entry.get('published', '') or 
                        entry.get('updated', '')
                    )
                })
            return articles
        except Exception as e:
            logger.error(f"Error fetching {source['name']}: {e}")
            return []

    results = await asyncio.gather(*[
        asyncio.to_thread(fetch_rss_sync, source)
        for source in NEWS_SOURCES
    ])
    
    all_articles = []
    for r in results:
        all_articles.extend(r)
        
    def is_recent(date_str):
        try:
            dt = dateutil.parser.parse(date_str)
            return dt.year >= 2024
        except:
            return True

    recent_articles = [a for a in all_articles if is_recent(a['published_date'])]
    
    def get_timestamp(date_str):
        try:
            if date_str:
                return datetime.fromisoformat(date_str).timestamp()
        except:
            pass
        return 0
        
    recent_articles.sort(key=lambda x: get_timestamp(x['published_date']), reverse=True)
    
    # Format published_display
    for a in recent_articles:
        try:
            a['published_display'] = datetime.fromisoformat(a['published_date']).strftime("%b %d, %Y")
        except:
            a['published_display'] = "Recent"

    articles = recent_articles[:limit]
    
    # Add AI sentiment analysis with cache (using 'market' as symbol)
    cached = get_cached_sentiment('news_market')
    if cached:
        return cached

    articles = analyze_news_sentiment(articles, "the overall Indian stock market")
    set_cached_sentiment('news_market', articles)

    return articles

@ttl_cache(ttl_seconds=30*60)
async def get_nse_filings(symbol: str):
    clean_symbol = symbol.replace('.NS', '').replace('.BO', '')
    url = f"https://www.nseindia.com/api/corporate-announcements?index=equities&symbol={clean_symbol}"
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
            # NSE requires a valid session cookie, fetch main page first
            await client.get("https://www.nseindia.com", headers=headers)
            resp = await client.get(url, headers=headers)
            
            if resp.status_code == 200:
                data = resp.json()
                filings = []
                for item in data:
                    an_dt = item.get('an_dt', '')
                    iso_date = parse_news_date(an_dt)
                    try:
                        pub_display = datetime.fromisoformat(iso_date).strftime("%b %d, %Y")
                    except:
                        pub_display = "Recent"

                    filings.append({
                        "subject": item.get('subject', ''),
                        "date": iso_date,
                        "date_display": pub_display,
                        "attachment": f"https://www.nseindia.com{item.get('attchmntText', '')}" if item.get('attchmntText') else ""
                    })
                return filings
    except Exception as e:
        logger.error(f"Error fetching NSE filings for {clean_symbol}: {e}")
    return []
