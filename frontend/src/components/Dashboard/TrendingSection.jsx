import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../utils/api';

const TrendingSection = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/stocks/trending?n=8');
        setStocks(res.data);
      } catch(e) {
        console.error('Trending fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="bg-surface-850 border border-surface-800 
                    rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Flame size={18} className="text-orange-400" />
        <h2 className="text-lg font-bold text-white">
          Trending Now
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} 
               className="min-w-[160px] h-24 
                          bg-surface-900 rounded-xl 
                          animate-pulse border 
                          border-surface-800" />
        ))}
      </div>
    </div>
  );

  if (!stocks.length) return null;

  return (
    <div className="bg-surface-850 border border-surface-800 
                    rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Flame size={18} className="text-orange-400 
                                    animate-pulse" />
        <h2 className="text-lg font-bold text-white">
          Trending Now
        </h2>
        <span className="text-xs text-gray-500 ml-1">
          Most active in market right now
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto 
                      pb-2 scrollbar-hide">
        {stocks.map((stock, i) => (
          <motion.div
            key={stock.symbol}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(
              `/stock/${stock.symbol}`
            )}
            className="min-w-[175px] bg-surface-900 
                       border border-surface-800 
                       rounded-xl p-4 cursor-pointer 
                       hover:border-emerald-500/30 
                       hover:bg-surface-800 
                       transition-all flex-shrink-0"
          >
            <div className="flex justify-between 
                           items-start mb-2">
              <span className="text-white font-bold 
                               text-sm">
                {stock.symbol.replace('.NS', '')}
              </span>
              <span className={`flex items-center 
                               text-xs font-bold 
                               font-mono ${
                stock.is_positive 
                  ? 'text-emerald-400' 
                  : 'text-red-400'
              }`}>
                {stock.is_positive 
                  ? <TrendingUp size={12} 
                       className="mr-0.5" /> 
                  : <TrendingDown size={12} 
                       className="mr-0.5" />}
                {stock.is_positive ? '+' : ''}
                {stock.change_percent}%
              </span>
            </div>

            <div className="text-gray-200 font-mono 
                           font-semibold text-sm mb-2">
              ₹{stock.price?.toLocaleString('en-IN', {
                maximumFractionDigits: 2
              })}
            </div>

            <div className="text-xs text-gray-400 
                           leading-tight line-clamp-2 
                           border-t border-surface-800 
                           pt-2 mt-1">
              {stock.reason}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TrendingSection;
