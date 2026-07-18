import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import Sparkline from '../Sparkline';

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
        
        // Fetch sparklines asynchronously
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

  if (loading) return (
    <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Flame size={18} className="text-orange-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          TRENDING NOW
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-surface-800 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );

  if (!stocks.length) return null;

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Flame size={18} className="text-orange-400 animate-pulse" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          TRENDING NOW
        </h2>
        <span className="text-xs text-gray-500 ml-1 mb-3">
          Most active in market right now
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {stocks.map((stock, i) => (
          <motion.div
            key={stock.symbol}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/stock/${stock.symbol}`)}
            className="flex items-center justify-between gap-3 w-full bg-surface-800/40 rounded-lg p-3 hover:bg-surface-700/50 transition-colors cursor-pointer"
          >
            <span className="font-semibold text-slate-100 flex-1">
              {stock.symbol.replace('.NS', '')}
            </span>
            <span className="text-slate-400 text-sm font-medium">
              ₹{(stock.current_price ?? stock.price ?? stock.ltp ?? stock.last_price)?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) ?? 'N/A'}
            </span>
            <div className="mx-2 shrink-0">
              <Sparkline data={sparklines[stock.symbol]} width={60} height={24} />
            </div>
            <div className="flex-1 flex justify-end">
              <span className={`text-sm font-semibold px-2 py-0.5 rounded ${stock.change_percent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent?.toFixed(2)}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TrendingSection;
