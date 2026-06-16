import json
import os
import yfinance as yf
import time
import random

def backfill_sectors():
    json_path = os.path.join(
        os.path.dirname(__file__), 
        '..', 'data', 'nse_stocks.json'
    )
    
    with open(json_path, 'r') as f:
        stocks = json.load(f)
    
    targets = [s for s in stocks if s.get('sector', 'Unknown') == 'Unknown']
    print(f"Resuming backfill for {len(targets)} remaining stocks "
          f"(skipping {len(stocks) - len(targets)} already done)")
    
    consecutive_failures = 0
    
    for i, stock in enumerate(targets):
        symbol = stock.get('symbol', '')
        if not symbol:
            continue
        
        success = False
        for attempt in range(3):
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                sector = info.get('sector')
                if sector:
                    stock['sector'] = sector
                    success = True
                    consecutive_failures = 0
                break
            except Exception as e:
                wait = (2 ** attempt) + random.uniform(0, 1)
                print(f"  Retry {attempt+1} for {symbol} "
                      f"after {wait:.1f}s ({str(e)[:60]})")
                time.sleep(wait)
        
        if not success:
            consecutive_failures += 1
            stock['sector'] = stock.get('sector', 'Unknown')
        
        # If we hit 5 failures in a row, we're rate limited.
        # Stop and cool down for 60s before continuing.
        if consecutive_failures >= 5:
            print("5 consecutive failures detected — likely "
                  "rate limited. Cooling down 60s...")
            time.sleep(60)
            consecutive_failures = 0
        
        if i % 50 == 0:
            print(f"Progress: {i}/{len(targets)} | "
                  f"Last: {symbol} -> {stock.get('sector')}")
            with open(json_path, 'w') as f:
                json.dump(stocks, f, indent=2)
        
        time.sleep(random.uniform(0.5, 1.0))
    
    with open(json_path, 'w') as f:
        json.dump(stocks, f, indent=2)
    
    known = sum(1 for s in stocks if s.get('sector') != 'Unknown')
    print(f"Final: Sectors found for {known}/{len(stocks)}")

if __name__ == "__main__":
    backfill_sectors()
