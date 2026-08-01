import { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { Button } from '../ui';

const InstitutionalTab = ({ symbol, fundData }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const fetchData = async (refresh = false) => {
    setLoading(true);
    try {
      const result = await api.get(`/analysis/institutional/${symbol}${refresh ? '?refresh=true' : ''}`);
      setData(result.data || result);
    } catch (e) {
      console.error('Institutional fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [symbol]);
  
  if (loading && !data) return <div className="flex justify-center py-20 text-brand-400"><Activity className="animate-pulse" /></div>;
  if (!data) return <p className="text-gray-400 text-center py-10">No institutional data available.</p>;
  
  return (
    <div className="space-y-4 relative">
      {loading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10"><Activity className="animate-pulse text-brand-400" /></div>}
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-100 flex items-center">
          Institutional Activity
        </h2>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => fetchData(true)}>
          Refresh Data
        </Button>
      </div>

      {/* Smart Money Score */}
      <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-400 text-sm mb-1">
              Smart Money Score
            </p>
            <p className={`text-3xl font-bold font-mono ${
              data.smart_money_score >= 65 
                ? 'text-up'
              : data.smart_money_score <= 35
                ? 'text-down'
                : 'text-brand-400'
            }`}>
              {data.smart_money_score}/100
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
            data.smart_money_score >= 65
              ? 'bg-up/10 text-up border border-up/30'
            : data.smart_money_score <= 35
              ? 'bg-down/10 text-down border border-down/30'
              : 'bg-brand-500/10 text-brand-400 border border-brand-500/30'
          }`}>
            {data.institutional_verdict}
          </div>
        </div>
      </div>
      
      {/* Shareholding Breakdown */}
      <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
        <h3 className="text-gray-100 font-semibold mb-3">
          Shareholding Breakdown
        </h3>
        <div className="space-y-3">
          {/* Categorical, not directional. "FPI / FII" was emerald and "Retail"
              orange, which made a shareholding split look like a set of market
              signals. These are the same four series colours the chart overlays
              use. */}
          {[
            {
              label: 'Promoter',
              value: fundData?.promoter_holding,
              color: 'bg-series-2'
            },
            {
              label: 'FPI / FII',
              value: fundData?.fpi_holding,
              color: 'bg-series-1'
            },
            {
              label: 'DII',
              value: fundData?.dii_holding,
              color: 'bg-series-4'
            },
            {
              label: 'Retail (Public)',
              value: fundData?.shareholding?.public_holding,
              color: 'bg-series-3'
            },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">
                  {item.label}
                </span>
                <span className="font-mono tnum text-gray-100">
                  {item.value
                    ? `${item.value}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${item.color} rounded-full`}
                  style={{ 
                    width: `${Math.min(item.value || 0, 100)}%` 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-surface-800 flex justify-between text-sm">
          <span className="text-gray-400">Free Float</span>
          {/* A free-float share is a proportion, not a gain — it was green. */}
          <span className="text-gray-100 font-semibold font-mono tnum">
            {fundData?.free_float
              ? `${parseFloat(fundData.free_float).toFixed(2)}%`
              : 'N/A'}
          </span>
        </div>
      </div>

      {/* Promoter Activity */}
      <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
        <h3 className="text-gray-100 font-bold mb-3">
          Promoter Activity
        </h3>
        
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-lg font-bold ${
            data.promoter_activity?.trend === 'Increasing'
              ? 'text-up'
            : data.promoter_activity?.trend === 'Decreasing'
              ? 'text-down'
              : 'text-brand-400'
          }`}>
            {data.promoter_activity?.trend === 'Increasing'
              ? <span className="flex items-center gap-1">
                  <TrendingUp size={16} /> Increasing
                </span>
            : data.promoter_activity?.trend === 'Decreasing'
              ? <span className="flex items-center gap-1">
                  <TrendingDown size={16} /> Decreasing
                </span>
              : <span className="flex items-center gap-1">
                  <Minus size={16} /> Stable
                </span>}
          </span>
          {data.promoter_activity?.change_vs_last_quarter !== undefined && data.promoter_activity?.change_vs_last_quarter !== null && (
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
              {data.promoter_activity.change_vs_last_quarter > 0 ? '+' : ''}
              {data.promoter_activity.change_vs_last_quarter}% vs last quarter
            </span>
          )}
        </div>
        
        {/* Promoter holding trend bars */}
        {data.promoter_activity?.promoter_values && data.promoter_activity.promoter_values.length > 0 && (
          <div className="mt-2">
            <p className="text-gray-500 text-xs mb-3">
              Promoter Holding (Last {data.promoter_activity.promoter_values.length} Quarters)
            </p>
            <div className="flex items-end gap-3 h-20">
              {[...data.promoter_activity.promoter_values].slice(0,4).reverse().map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className="text-xs text-gray-400 font-mono">
                    {val}%
                  </span>
                  <div
                    className="w-full bg-series-2/60 rounded-t border-t border-series-2"
                    style={{ 
                      height: `${Math.max(10, (val/100)*60)}px` 
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Deals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bulk Deals */}
        <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
          <h3 className="text-gray-100 font-bold mb-3">
            Recent Bulk Deals
          </h3>
          {data.bulk_deals && data.bulk_deals.length > 0 ? (
            <div className="space-y-2">
              {data.bulk_deals.slice(0,5).map((deal, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-surface-850 border border-surface-800 rounded-lg">
                  <div className="overflow-hidden pr-2">
                    <p className="text-gray-100 text-sm font-medium truncate" title={deal.client}>
                      {deal.client}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {deal.date}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-2xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      deal.buy_sell?.toLowerCase().includes('buy')
                        ? 'bg-up/10 text-up border border-up/20'
                        : 'bg-down/10 text-down border border-down/20'
                    }`}>
                      {deal.buy_sell}
                    </span>
                    <p className="text-gray-400 text-xs mt-1 font-mono">
                      ₹{deal.price} <span className="text-gray-500">×</span> {Number(deal.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No recent bulk deals</p>
          )}
        </div>
        
        {/* Block Deals */}
        <div className="bg-surface-900 rounded-xl p-4 border border-surface-800">
          <h3 className="text-gray-100 font-bold mb-3">
            Recent Block Deals
          </h3>
          {data.block_deals && data.block_deals.length > 0 ? (
            <div className="space-y-2">
              {data.block_deals.slice(0,5).map((deal, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-surface-850 border border-surface-800 rounded-lg">
                  <div className="overflow-hidden pr-2">
                    <p className="text-gray-100 text-sm font-medium truncate" title={deal.client}>
                      {deal.client}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {deal.date}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-2xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      deal.buy_sell?.toLowerCase().includes('buy')
                        ? 'bg-up/10 text-up border border-up/20'
                        : 'bg-down/10 text-down border border-down/20'
                    }`}>
                      {deal.buy_sell}
                    </span>
                    {deal.value_cr && (
                      <p className="text-gray-400 text-xs mt-1 font-mono">
                        ₹{deal.value_cr} Cr
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No recent block deals</p>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default InstitutionalTab;
