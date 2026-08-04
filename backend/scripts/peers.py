import requests
from bs4 import BeautifulSoup

HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
}

url = "https://www.screener.in/company/RELIANCE/consolidated/"
r = requests.get(url, headers=HEADERS)
soup = BeautifulSoup(r.text, 'lxml')

company_div = soup.find(attrs={'data-company-id': True})
company_id = company_div['data-company-id']
peers_url = f"https://www.screener.in/api/company/{company_id}/peers/"
peers_resp = requests.get(peers_url, headers=HEADERS)
peers_soup = BeautifulSoup(peers_resp.text, 'lxml')

table = peers_soup.find('table')
print(f"📊 Peers table HTML preview:")
print(str(table)[:800])

thead = table.find('thead')
if thead:
    ths = thead.find_all('th')
    headers = [th.text.strip() for th in ths]
    print(f"📊 Peer headers: {headers}")

tbody = table.find('tbody') or table
rows = tbody.find_all('tr')
print(f"📊 Peer rows found: {len(rows)}")

for i, row in enumerate(rows[:3]):
    cells = row.find_all('td')
    print(f"Row {i}: {len(cells)} cells")
    for j, cell in enumerate(cells[:8]):
        print(f"  Cell {j}: '{cell.text.strip()}'")
