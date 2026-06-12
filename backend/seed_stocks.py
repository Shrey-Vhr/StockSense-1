import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, init_db
from models.stock import StockCache

nse_top_200 = [
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries Limited", "sector": "Energy", "industry": "Oil & Gas"},
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services Limited", "sector": "Information Technology", "industry": "IT Services"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Limited", "sector": "Financials", "industry": "Banks"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Limited", "sector": "Financials", "industry": "Banks"},
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel Limited", "sector": "Communication Services", "industry": "Telecom Services"},
    {"symbol": "SBIN.NS", "name": "State Bank of India", "sector": "Financials", "industry": "Banks"},
    {"symbol": "INFY.NS", "name": "Infosys Limited", "sector": "Information Technology", "industry": "IT Services"},
    {"symbol": "LICI.NS", "name": "Life Insurance Corporation of India", "sector": "Financials", "industry": "Insurance"},
    {"symbol": "ITC.NS", "name": "ITC Limited", "sector": "Consumer Staples", "industry": "Tobacco"},
    {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever Limited", "sector": "Consumer Staples", "industry": "Personal Products"},
    {"symbol": "LT.NS", "name": "Larsen & Toubro Limited", "sector": "Industrials", "industry": "Construction & Engineering"},
    {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance Limited", "sector": "Financials", "industry": "Consumer Finance"},
    {"symbol": "HCLTECH.NS", "name": "HCL Technologies Limited", "sector": "Information Technology", "industry": "IT Services"},
    {"symbol": "MARUTI.NS", "name": "Maruti Suzuki India Limited", "sector": "Consumer Discretionary", "industry": "Automobiles"},
    {"symbol": "SUNPHARMA.NS", "name": "Sun Pharmaceutical Industries Limited", "sector": "Health Care", "industry": "Pharmaceuticals"},
    {"symbol": "TATAMOTORS.NS", "name": "Tata Motors Limited", "sector": "Consumer Discretionary", "industry": "Automobiles"},
    {"symbol": "M&M.NS", "name": "Mahindra & Mahindra Limited", "sector": "Consumer Discretionary", "industry": "Automobiles"},
    {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank Limited", "sector": "Financials", "industry": "Banks"},
    {"symbol": "NTPC.NS", "name": "NTPC Limited", "sector": "Utilities", "industry": "Power Generation"},
    {"symbol": "AXISBANK.NS", "name": "Axis Bank Limited", "sector": "Financials", "industry": "Banks"},
    # We add a subset of 20 top stocks here for brevity, 
    # but let's include more to get closer to a representative 200 list if we can,
    # or just fill it with some prominent ones.
]

# Adding more stocks to make a substantial list
extra_stocks = [
    ("TITAN.NS", "Titan Company Limited", "Consumer Discretionary", "Apparel & Accessories"),
    ("ONGC.NS", "Oil & Natural Gas Corporation Limited", "Energy", "Oil & Gas"),
    ("ULTRACEMCO.NS", "UltraTech Cement Limited", "Materials", "Construction Materials"),
    ("POWERGRID.NS", "Power Grid Corporation of India Limited", "Utilities", "Power Generation"),
    ("COALINDIA.NS", "Coal India Limited", "Energy", "Oil & Gas"),
    ("BAJAJFINSV.NS", "Bajaj Finserv Limited", "Financials", "Diversified Financial Services"),
    ("ASIANPAINT.NS", "Asian Paints Limited", "Materials", "Chemicals"),
    ("ADANIENT.NS", "Adani Enterprises Limited", "Industrials", "Industrial Conglomerates"),
    ("HAL.NS", "Hindustan Aeronautics Limited", "Industrials", "Aerospace & Defense"),
    ("JSWSTEEL.NS", "JSW Steel Limited", "Materials", "Metals & Mining"),
    ("WIPRO.NS", "Wipro Limited", "Information Technology", "IT Services"),
    ("SIEMENS.NS", "Siemens Limited", "Industrials", "Industrial Conglomerates"),
    ("TATASTEEL.NS", "Tata Steel Limited", "Materials", "Metals & Mining"),
    ("ADANIPORTS.NS", "Adani Ports and Special Economic Zone", "Industrials", "Transportation Infrastructure"),
    ("GRASIM.NS", "Grasim Industries Limited", "Materials", "Construction Materials"),
    ("HINDALCO.NS", "Hindalco Industries Limited", "Materials", "Metals & Mining"),
    ("VBL.NS", "Varun Beverages Limited", "Consumer Staples", "Beverages"),
    ("ZOMATO.NS", "Zomato Limited", "Consumer Discretionary", "Internet & Direct Marketing Retail"),
    ("NESTLEIND.NS", "Nestle India Limited", "Consumer Staples", "Food Products"),
    ("DRREDDY.NS", "Dr. Reddy's Laboratories", "Health Care", "Pharmaceuticals"),
    ("APOLLOHOSP.NS", "Apollo Hospitals Enterprise Limited", "Health Care", "Health Care Providers"),
    ("TECHM.NS", "Tech Mahindra Limited", "Information Technology", "IT Services"),
    ("CIPLA.NS", "Cipla Limited", "Health Care", "Pharmaceuticals"),
    ("BAJAJ-AUTO.NS", "Bajaj Auto Limited", "Consumer Discretionary", "Automobiles"),
    ("BRITANNIA.NS", "Britannia Industries Limited", "Consumer Staples", "Food Products"),
    ("TRENT.NS", "Trent Limited", "Consumer Discretionary", "Specialty Retail"),
    ("EICHERMOT.NS", "Eicher Motors Limited", "Consumer Discretionary", "Automobiles"),
    ("SBILIFE.NS", "SBI Life Insurance Company", "Financials", "Insurance"),
    ("HDFCLIFE.NS", "HDFC Life Insurance Company", "Financials", "Insurance"),
    ("DIVISLAB.NS", "Divi's Laboratories Limited", "Health Care", "Pharmaceuticals"),
    ("LTIM.NS", "LTIMindtree Limited", "Information Technology", "IT Services"),
    ("INDUSINDBK.NS", "IndusInd Bank Limited", "Financials", "Banks"),
    ("TVSMOTOR.NS", "TVS Motor Company Limited", "Consumer Discretionary", "Automobiles"),
    ("CHOLAFIN.NS", "Cholamandalam Investment", "Financials", "Consumer Finance"),
    ("HEROMOTOCO.NS", "Hero MotoCorp Limited", "Consumer Discretionary", "Automobiles"),
    ("BOSCHLTD.NS", "Bosch Limited", "Consumer Discretionary", "Auto Components"),
    ("SHREECEM.NS", "Shree Cement Limited", "Materials", "Construction Materials"),
    ("HAVELLS.NS", "Havells India Limited", "Industrials", "Electrical Equipment"),
    ("AMBUJACEM.NS", "Ambuja Cements Limited", "Materials", "Construction Materials"),
    ("ABB.NS", "ABB India Limited", "Industrials", "Electrical Equipment"),
    ("BEL.NS", "Bharat Electronics Limited", "Industrials", "Aerospace & Defense"),
    ("TORNTPHARM.NS", "Torrent Pharmaceuticals", "Health Care", "Pharmaceuticals"),
    ("BANKBARODA.NS", "Bank of Baroda", "Financials", "Banks"),
    ("GAIL.NS", "GAIL (India) Limited", "Energy", "Oil & Gas"),
    ("JINDALSTEL.NS", "Jindal Steel & Power Limited", "Materials", "Metals & Mining"),
    ("SRF.NS", "SRF Limited", "Materials", "Chemicals"),
    ("PIDILITIND.NS", "Pidilite Industries Limited", "Materials", "Chemicals"),
    ("GODREJCP.NS", "Godrej Consumer Products", "Consumer Staples", "Personal Products"),
    ("ICICIGI.NS", "ICICI Lombard General Insurance", "Financials", "Insurance"),
    ("CGPOWER.NS", "CG Power and Industrial", "Industrials", "Electrical Equipment"),
    ("M&MFIN.NS", "Mahindra & Mahindra Financial", "Financials", "Consumer Finance"),
    ("LODHA.NS", "Macrotech Developers", "Real Estate", "Real Estate Management"),
    ("CUMMINSIND.NS", "Cummins India Limited", "Industrials", "Machinery"),
    ("PIIND.NS", "PI Industries Limited", "Materials", "Chemicals"),
    ("PNB.NS", "Punjab National Bank", "Financials", "Banks"),
    ("TATACOMM.NS", "Tata Communications Limited", "Communication Services", "Telecom Services"),
    ("UPL.NS", "UPL Limited", "Materials", "Chemicals"),
    ("INDIGO.NS", "InterGlobe Aviation Limited", "Industrials", "Airlines"),
    ("YESBANK.NS", "Yes Bank Limited", "Financials", "Banks"),
    ("DLF.NS", "DLF Limited", "Real Estate", "Real Estate Management")
]

for s, n, sec, ind in extra_stocks:
    nse_top_200.append({"symbol": s, "name": n, "sector": sec, "industry": ind})

def seed_database():
    # Make sure tables exist
    init_db()
    
    db = SessionLocal()
    try:
        # Check if we already have stocks
        count = db.query(StockCache).count()
        if count > 0:
            print(f"Database already seeded with {count} stocks.")
            return

        print("Seeding database with top NSE stocks...")
        for stock_data in nse_top_200:
            stock = StockCache(**stock_data)
            db.add(stock)
        
        db.commit()
        print("Database seeding completed successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
