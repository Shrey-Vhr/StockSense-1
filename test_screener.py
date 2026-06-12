import requests
from bs4 import BeautifulSoup
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf8')

url = 'https://www.screener.in/company/HDFCBANK/consolidated/'
soup = BeautifulSoup(requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}).text, 'lxml')
print(soup.find('ul', id='top-ratios'))
