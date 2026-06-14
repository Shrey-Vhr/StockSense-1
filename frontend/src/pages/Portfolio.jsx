import { useState, useEffect } from 'react';
import { PieChart as PieChartIcon, Plus, TrendingUp, TrendingDown, DollarSign, BrainCircuit, ShieldAlert } from 'lucide-react';
import useStore from '../store/useStore';
import api from '../utils/api';

const Portfolio = () => {
  const { portfolioHoldings, setPortfolioHoldings, addHolding, removeHolding } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  
  const [aiReview, setAiReview] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [performance, setPerformance] = useState(null);
  
  // Real-time prices map to avoid constant fetching
  const [currentPrices, setCurrentPrices] = useState({});

  // Fetch holdings from backend
  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const res = await api.get('/portfolio')
        setPortfolioHoldings(res.data)
      } catch (e) {
        console.error('Failed to fetch holdings', e)
      }
    }
    fetchHoldings()
  }, [])

  // Refresh holdings every 60s
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await api.get('/portfolio')
      setPortfolioHoldings(res.data)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Fetch performance metrics
  useEffect(() => {
    const fetchPerf = async () => {
      try {
        const res = await api.get('/portfolio/performance')
        setPerformance(res.data)
      } catch(e) {}
    }
    fetchPerf()
  }, [portfolioHoldings])

  const handleRemove = async (id) => {
    try {
      await api.delete(`/portfolio/remove/${id}`)
      setPortfolioHoldings(portfolioHoldings.filter(h => h.id !== id))
    } catch (e) {
      alert('Failed to remove holding')
    }
  }

  const handleAddHolding = async (e) => {
    e.preventDefault();
    if (!symbol || !quantity || !buyPrice) return;
    
    let cleanSymbol = symbol.toUpperCase();
    if (!cleanSymbol.includes('.NS')) cleanSymbol += '.NS';

    try {
      await api.post('/portfolio/add', {
        symbol: cleanSymbol,
        quantity: Number(quantity),
        avg_buy_price: Number(buyPrice)
      })
      const res = await api.get('/portfolio')
      setPortfolioHoldings(res.data)
    } catch (e) {
      alert('Failed to add holding')
      return
    }
    
    setSymbol('');
    setQuantity('');
    setBuyPrice('');
    setShowAddForm(false);
  };



  const handleAIReview = async () => {
    setIsAiLoading(true);
    try {
      // Create payload matching what backend expects
      const payload = portfolioHoldings.map(h => ({
        symbol: h.symbol,
        quantity: h.quantity,
        avg_price: h.avg_buy_price,
        current_price: h.current_price || h.avg_buy_price
      }));
      const res = await api.post('/ai/portfolio-review', payload);
      setAiReview(res.data.portfolio_review);
    } catch (e) {
      console.error(e);
      alert("AI Review failed. Check console.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <PieChartIcon className="mr-2 text-[#10b981]" /> My Portfolio
        </h1>
        <div className="flex space-x-3">
          <button 
            onClick={handleAIReview}
            disabled={isAiLoading || portfolioHoldings.length === 0}
            className="bg-[#161b22] border border-[#10b981]/50 hover:bg-[#10b981]/10 text-[#10b981] px-4 py-2 rounded-lg flex items-center transition-colors disabled:opacity-50"
          >
            {isAiLoading ? <BrainCircuit className="animate-pulse mr-1" size={18}/> : <BrainCircuit className="mr-1" size={18} />}
            AI Review
          </button>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-[#161b22] border border-[#30363d] hover:border-[#10b981] text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Plus size={18} className="mr-1 text-[#10b981]" /> Add Holding
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddHolding} className="bg-[#161b22] border border-[#10b981]/50 rounded-xl p-5 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-400 mb-1">Symbol</label>
            <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="e.g. INFOSYS" className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white" required />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs text-gray-400 mb-1">Quantity</label>
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white" required min="1" />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs text-gray-400 mb-1">Buy Price</label>
            <input type="number" step="0.05" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="0.00" className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white" required min="0" />
          </div>
          <button type="submit" className="bg-[#10b981] text-black font-bold py-2 px-6 rounded hover:bg-amber-500 transition-colors">
            Save
          </button>
        </form>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-1 flex items-center">
            <DollarSign size={16} className="mr-1"/> Current Value
          </div>
          <div className="text-3xl font-bold font-mono text-white">₹{(performance?.current_value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>
        
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-1">Total Invested</div>
          <div className="text-3xl font-bold font-mono text-gray-300">₹{(performance?.total_invested ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>
        
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
          <div className="text-gray-400 text-sm mb-1">Overall P&L</div>
          <div className={`text-3xl font-bold font-mono flex items-center ${(performance?.total_pnl ?? 0) >= 0 ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
            {(performance?.total_pnl ?? 0) >= 0 ? '+' : ''}₹{Math.abs(performance?.total_pnl ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            <span className="text-sm ml-3 bg-[#0d1117] px-2 py-1 rounded-full border border-current">
              {(performance?.total_pnl_percent ?? 0) >= 0 ? '+' : ''}{(performance?.total_pnl_percent ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* AI Review Section */}
      {aiReview && (
        <div className="bg-[#161b22] border border-[#10b981]/50 rounded-xl p-6 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b981] opacity-5 rounded-bl-full pointer-events-none" />
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <BrainCircuit className="mr-2 text-[#10b981]" /> Claude Portfolio Assessment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 bg-[#0d1117] p-4 rounded-lg border border-[#30363d] text-center">
              <div className="text-4xl font-bold text-white font-mono">{aiReview.health_score}</div>
              <div className="text-sm text-gray-400 mt-1">Health Score</div>
              <div className={`mt-4 inline-block px-3 py-1 rounded text-xs font-bold ${aiReview.concentration_risk === 'High' ? 'bg-[#ff1744]/20 text-[#ff1744]' : 'bg-[#00c853]/20 text-[#00c853]'}`}>
                {aiReview.concentration_risk} Risk
              </div>
            </div>
            <div className="md:col-span-3 space-y-4">
              <p className="text-gray-300 leading-relaxed">{aiReview.summary}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[#00c853] font-bold text-sm mb-2">Strengths</h4>
                  <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                    {aiReview.strengths?.map((s,i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[#ff1744] font-bold text-sm mb-2">Weaknesses</h4>
                  <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                    {aiReview.weaknesses?.map((w,i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
              <div className="bg-[#0d1117] p-4 rounded border border-[#10b981]/30 mt-4">
                <h4 className="text-[#10b981] font-bold text-sm mb-2">Actionable Rebalancing Suggestions</h4>
                <ul className="list-decimal list-inside text-sm text-gray-300 space-y-2">
                  {aiReview.rebalancing_suggestions?.map((r,i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings Table */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#30363d]">
            <h2 className="text-lg font-bold text-white">Current Holdings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0d1117] text-gray-400 text-xs uppercase tracking-wider border-b border-[#30363d]">
                  <th className="p-4">Symbol</th>
                  <th className="p-4 text-right">Qty</th>
                  <th className="p-4 text-right">Avg Price</th>
                  <th className="p-4 text-right">CMP</th>
                  <th className="p-4 text-right">P&L</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {portfolioHoldings.map(h => {
                  const cp = h.current_price || h.avg_buy_price;
                  const pnl = h.pnl || 0;
                  const pnlPct = h.avg_buy_price > 0 ? ((cp - h.avg_buy_price) / h.avg_buy_price) * 100 : 0;
                  const isProfit = pnl >= 0;

                  return (
                    <tr key={h.id} className="hover:bg-[#30363d]/30 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white">{h.symbol.replace('.NS', '')}</div>
                        <div className="text-xs text-gray-500">{h.sector}</div>
                      </td>
                      <td className="p-4 text-right font-mono text-gray-300">{h.quantity}</td>
                      <td className="p-4 text-right font-mono text-gray-300">₹{(h.avg_buy_price || 0).toFixed(2)}</td>
                      <td className="p-4 text-right font-mono text-white transition-all duration-500">₹{cp.toFixed(2)}</td>
                      <td className="p-4 text-right transition-all duration-500">
                        <div className={`font-mono font-bold ${isProfit ? 'text-[#00c853]' : 'text-[#ff1744]'}`}>
                          {isProfit ? '+' : ''}₹{Math.abs(pnl).toFixed(2)}
                        </div>
                        <div className={`text-xs font-mono mt-1 ${isProfit ? 'text-[#00c853]/70' : 'text-[#ff1744]/70'}`}>
                          {isProfit ? '+' : ''}{pnlPct.toFixed(2)}%
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => handleRemove(h.id)} className="text-gray-500 hover:text-red-400 text-xs uppercase font-bold tracking-wider">
                          Sell
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {portfolioHoldings.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">No holdings found. Add your first stock above.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sector Allocation */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4">Sector Allocation</h2>
          <div className="space-y-4">
            {Object.entries(performance?.sector_allocation || {}).sort((a,b) => b[1]-a[1]).map(([sector, val], idx) => {
              const pct = (val / (performance?.current_value || 1)) * 100;
              // Generate some consistent colors
              const colors = ['bg-[#10b981]', 'bg-[#00c853]', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'];
              const colorClass = colors[idx % colors.length];
              
              return (
                <div key={sector}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{sector}</span>
                    <span className="font-mono text-white">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#0d1117] rounded-full overflow-hidden">
                    <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
