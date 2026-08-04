import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import api from '../../utils/api';
import Sparkline from '../Sparkline';
import { SkeletonBox } from '../Skeleton';
import { Card, DeltaBadge, Table, TBody, Tr, Td } from '../ui';
import { formatCurrency, displaySymbol } from '../../lib/format';

/**
 * The heading is identical in the loading and loaded branches, so it lives in
 * one place rather than being kept in sync by hand.
 */
const TITLE = (
  <span className="flex items-center gap-1.5">
    <Flame size={12} className="text-warn" aria-hidden="true" /> Trending Now
  </span>
);

const TrendingSection = () => {
  const [stocks, setStocks] = useState([]);
  const [sparklines, setSparklines] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/stocks/trending?n=8');
        setStocks(res.data);
        setLoading(false);

        // Sparklines are fetched per row after the list lands, so the section
        // renders immediately rather than waiting on eight extra requests.
        res.data.forEach(async (stock) => {
          try {
            const histRes = await api.get(`/stocks/history/${stock.symbol}?period=7d&interval=1d`);
            if (histRes.data && histRes.data.history) {
               const closes = histRes.data.history.map(h => h.close || h.Close);
               setSparklines(prev => ({ ...prev, [stock.symbol]: closes }));
            }
          } catch(e) {
            console.error(`Failed to fetch history for ${stock.symbol}`);
          }
        });
      } catch(e) {
        console.error('Trending fetch error:', e);
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <Card title={TITLE} padding="sm">
        <div className="space-y-1.5">
          {[...Array(6)].map((_, i) => <SkeletonBox key={i} className="h-11 rounded-lg" />)}
        </div>
      </Card>
    );
  }

  if (!stocks.length) return null;

  return (
    <Card
      title={TITLE}
      subtitle="Most active in the market right now"
      padding="none"
      bodyClassName="px-1 pb-1"
    >
      <Table>
        <TBody divided={false}>
          {stocks.map((stock) => {
            const price = stock.current_price ?? stock.price ?? stock.ltp ?? stock.last_price;
            return (
              <Tr
                key={stock.symbol}
                interactive
                onClick={() => navigate(`/stock/${stock.symbol}`)}
                className="rounded-lg"
              >
                <Td className="font-medium text-gray-100 w-[35%]">
                  {displaySymbol(stock.symbol)}
                </Td>
                <Td numeric className="w-[25%] text-gray-300">
                  {formatCurrency(price)}
                </Td>
                <Td align="center" className="w-[20%]">
                  <div className="flex justify-center">
                    <Sparkline
                      data={sparklines[stock.symbol]}
                      isPositive={stock.change_percent >= 0}
                      width={64}
                      height={22}
                    />
                  </div>
                </Td>
                <Td align="right" className="w-[20%]">
                  <div className="flex justify-end">
                    <DeltaBadge value={stock.change_percent} />
                  </div>
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </Card>
  );
};

export default TrendingSection;
