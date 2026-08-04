import requests
import time
import subprocess
import sys
import threading

def start_server():
    subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"])

def test_endpoints():
    print("Starting server...")
    t = threading.Thread(target=start_server)
    t.start()
    time.sleep(5) # wait for server to start
    
    endpoints = [
        "/api/stocks/quote/HDFCBANK.NS",
        "/api/stocks/history/RELIANCE.NS",
        "/api/analysis/technical/WIPRO.NS",
        "/api/news/stock/TCS.NS?company_name=TCS"
    ]
    
    success = True
    for ep in endpoints:
        try:
            url = f"http://127.0.0.1:8000{ep}"
            print(f"Testing {url}")
            r = requests.get(url)
            print(f"Result: {r.status_code}")
            if r.status_code != 200:
                print(f"Failed response: {r.text}")
                success = False
        except Exception as e:
            print(f"Exception testing {ep}: {e}")
            success = False
            
    if success:
        print("All tests passed! 200 OK.")
    else:
        print("Some tests failed.")

if __name__ == "__main__":
    test_endpoints()
