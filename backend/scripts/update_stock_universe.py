import requests
import json
import pandas as pd
from io import StringIO
import os

def update_universe():
    print("Fetching NSE equity list...")
    
    url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://www.nseindia.com"
    }
    
    res = requests.get(url, headers=headers, timeout=30)
    res.raise_for_status()
    
    df = pd.read_csv(StringIO(res.text))
    print(f"Total NSE listed stocks: {len(df)}")
    print(f"Columns: {df.columns.tolist()}")
    
    # NSE CSV has columns: SYMBOL, NAME OF COMPANY, SERIES, etc.
    # Filter for EQ series only (excludes ETFs, bonds, SME)
    df = df[df[' SERIES'].str.strip() == 'EQ']
    print(f"EQ series stocks: {len(df)}")
    
    stocks = []
    for _, row in df.iterrows():
        symbol = row['SYMBOL'].strip()
        name = row['NAME OF COMPANY'].strip()
        stocks.append({
            "symbol": f"{symbol}.NS",
            "name": name,
            "sector": "Unknown"
        })
    
    print(f"Total stocks to write: {len(stocks)}")
    
    # Save to nse_stocks.json
    output_path = os.path.join(
        os.path.dirname(__file__), 
        '..', 'data', 'nse_stocks.json'
    )
    output_path = os.path.abspath(output_path)
    
    with open(output_path, 'w') as f:
        json.dump(stocks, f, indent=2)
    
    print(f"Saved {len(stocks)} stocks to {output_path}")
    return len(stocks)

if __name__ == "__main__":
    count = update_universe()
    print(f"Done. Universe expanded to {count} stocks.")
