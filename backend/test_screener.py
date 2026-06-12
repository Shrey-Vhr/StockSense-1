import sys
import codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

from services.screener_service import get_live_price_for_screener
from services.angel_one_service import angel_one
import time

if not angel_one.is_connected:
    angel_one.login()
    time.sleep(1)

get_live_price_for_screener("RELIANCE-EQ")
