import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Search, Target, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import api from '../utils/api';

const AIAnalysis = () => {
  const [symbol, setSymbol] = useState('');
  const [cleanSymbol, setCleanSymbol] = useState('');
  const [analysisType, setAnalysisType] = useState('Full Stock Analysis');
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleExportPDF = () => {
    if (!aiAnalysis) return;
    
    const { jsPDF } = window.jspdf || {};
    
    // Build clean HTML for PDF
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #1a1a1a;
            font-size: 12px;
            line-height: 1.5;
          }
          .header {
            background: #0f4c35;
            color: white;
            padding: 20px 24px;
            margin-bottom: 20px;
          }
          .header h1 { font-size: 22px; font-weight: 700; }
          .header p { font-size: 11px; opacity: 0.8; margin-top: 4px; }
          .badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            margin-top: 8px;
          }
          .section {
            margin: 0 24px 16px 24px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          .section-title {
            background: #f9fafb;
            padding: 10px 16px;
            font-weight: 700;
            font-size: 12px;
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .section-body { padding: 14px 16px; }
          .verdict-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .verdict-text {
            font-size: 24px;
            font-weight: 800;
            color: #059669;
          }
          .confidence {
            font-size: 32px;
            font-weight: 800;
            color: #10b981;
          }
          .confidence-label {
            font-size: 10px;
            color: #6b7280;
            text-align: center;
          }
          .trade-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin-top: 8px;
          }
          .trade-cell {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
          }
          .trade-label {
            font-size: 9px;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .trade-value {
            font-size: 12px;
            font-weight: 700;
            color: #1a1a1a;
          }
          .trade-value.sl { color: #dc2626; }
          .trade-value.target { color: #059669; }
          .trade-value.rr { color: #10b981; }
          .timeframe-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .tf-card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px;
          }
          .tf-title {
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 6px;
            color: #374151;
          }
          .tf-verdict {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            margin-bottom: 6px;
          }
          .take { background: #d1fae5; color: #065f46; }
          .avoid { background: #fee2e2; color: #991b1b; }
          .wait { background: #fef3c7; color: #92400e; }
          .accumulate { background: #dbeafe; color: #1e40af; }
          .tf-conf { font-size: 10px; color: #6b7280; margin-bottom: 6px; }
          .tf-levels {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 4px;
            font-size: 10px;
          }
          .tf-level { text-align: center; }
          .tf-level-label { color: #6b7280; font-size: 9px; }
          .tf-level-val { font-weight: 600; }
          .tf-level-val.sl { color: #dc2626; }
          .tf-level-val.t { color: #059669; }
          .reasoning { font-size: 11px; color: #374151; margin-top: 6px; }
          .two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .bull { color: #059669; font-weight: 700; margin-bottom: 6px; }
          .bear { color: #dc2626; font-weight: 700; margin-bottom: 6px; }
          .red-flags {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 12px;
          }
          .red-flags-title {
            color: #dc2626;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .red-flag-item {
            font-size: 10px;
            color: #7f1d1d;
            margin-bottom: 4px;
            padding-left: 12px;
            position: relative;
          }
          .red-flag-item:before {
            content: "•";
            position: absolute;
            left: 0;
          }
          .key-levels {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
          }
          .level-tag {
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 10px;
            font-family: monospace;
          }
          .summary-box {
            background: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 6px;
            padding: 12px;
            font-size: 11px;
            color: #14532d;
            line-height: 1.6;
          }
          .disclaimer {
            margin: 16px 24px;
            font-size: 9px;
            color: #9ca3af;
            text-align: center;
            border-top: 1px solid #f3f4f6;
            padding-top: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>StockSense AI Analysis — ${cleanSymbol.replace('.NS', '')}</h1>
          <p>Generated on ${new Date().toLocaleDateString('en-IN', { 
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}</p>
          <div class="badge">Powered by Claude AI</div>
        </div>

        <!-- Verdict -->
        <div class="section">
          <div class="section-title">AI Verdict</div>
          <div class="section-body">
            <div class="verdict-row">
              <div>
                <div class="verdict-text">${aiAnalysis.verdict}</div>
                <div style="color:#6b7280;font-size:11px;margin-top:4px;">
                  Risk Level: ${aiAnalysis.risk_level || 'Medium'}
                </div>
              </div>
              <div style="text-align:center">
                <div class="confidence">${aiAnalysis.confidence}%</div>
                <div class="confidence-label">Confidence Score</div>
              </div>
            </div>
            <div class="summary-box">${aiAnalysis.summary}</div>
          </div>
        </div>

        <!-- Trade Setup -->
        <div class="section">
          <div class="section-title">Proposed Swing Trade Setup</div>
          <div class="section-body">
            <div class="trade-grid">
              <div class="trade-cell">
                <div class="trade-label">Entry Range</div>
                <div class="trade-value">${aiAnalysis.trade_setup?.entry || 'N/A'}</div>
              </div>
              <div class="trade-cell">
                <div class="trade-label">Stop Loss</div>
                <div class="trade-value sl">${aiAnalysis.trade_setup?.stop_loss || 'N/A'}</div>
              </div>
              <div class="trade-cell">
                <div class="trade-label">Target 1</div>
                <div class="trade-value target">${aiAnalysis.trade_setup?.target_1 || 'N/A'}</div>
              </div>
              <div class="trade-cell">
                <div class="trade-label">Target 2</div>
                <div class="trade-value target">${aiAnalysis.trade_setup?.target_2 || 'N/A'}</div>
              </div>
              <div class="trade-cell">
                <div class="trade-label">Risk / Reward</div>
                <div class="trade-value rr">${aiAnalysis.trade_setup?.risk_reward || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Timeframes -->
        ${aiAnalysis.timeframes ? `
        <div class="section">
          <div class="section-title">Analysis by Timeframe</div>
          <div class="section-body">
            <div class="timeframe-grid">
              ${Object.entries(aiAnalysis.timeframes).map(([tf, data]) => `
              <div class="tf-card">
                <div class="tf-title">${
                  tf === 'intraday' ? 'Intraday' :
                  tf === 'swing' ? 'Swing (Days)' :
                  tf === 'midterm' ? 'Midterm (Months)' :
                  'Long Term (Years)'
                }</div>
                <span class="tf-verdict ${
                  data.verdict?.toLowerCase().includes('take') || 
                  data.verdict?.toLowerCase().includes('buy') ? 'take' :
                  data.verdict?.toLowerCase().includes('avoid') ? 'avoid' :
                  data.verdict?.toLowerCase().includes('accum') ? 'accumulate' : 'wait'
                }">${data.verdict}</span>
                <div class="tf-conf">Confidence: ${data.confidence}%${
                  data.holding_period ? ` | Hold: ${data.holding_period}` : ''
                }</div>
                ${data.entry ? `
                <div class="tf-levels">
                  <div class="tf-level">
                    <div class="tf-level-label">Entry</div>
                    <div class="tf-level-val">${data.entry}</div>
                  </div>
                  <div class="tf-level">
                    <div class="tf-level-label">SL</div>
                    <div class="tf-level-val sl">${data.stop_loss}</div>
                  </div>
                  <div class="tf-level">
                    <div class="tf-level-label">T1</div>
                    <div class="tf-level-val t">${data.target_1}</div>
                  </div>
                </div>` : ''}
                <div class="reasoning">${(data.reasoning || '').substring(0, 200)}${
                  (data.reasoning || '').length > 200 ? '...' : ''
                }</div>
              </div>
              `).join('')}
            </div>
          </div>
        </div>` : ''}

        <!-- Bull & Bear -->
        <div class="section">
          <div class="section-title">Bull Case vs Bear Case</div>
          <div class="section-body">
            <div class="two-col">
              <div>
                <div class="bull">↑ The Bull Case</div>
                <div style="font-size:11px;color:#374151">
                  ${aiAnalysis.bull_case}
                </div>
              </div>
              <div>
                <div class="bear">↓ The Bear Case</div>
                <div style="font-size:11px;color:#374151">
                  ${aiAnalysis.bear_case}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Technical & Fundamental -->
        <div class="section">
          <div class="section-title">Detailed Analysis</div>
          <div class="section-body">
            <div style="margin-bottom:12px">
              <div style="font-weight:700;margin-bottom:4px;color:#374151">
                Technical Reasoning
              </div>
              <div style="font-size:11px;color:#4b5563">
                ${aiAnalysis.technical_reasoning}
              </div>
            </div>
            <div>
              <div style="font-weight:700;margin-bottom:4px;color:#374151">
                Fundamental Reasoning
              </div>
              <div style="font-size:11px;color:#4b5563">
                ${aiAnalysis.fundamental_reasoning}
              </div>
            </div>
          </div>
        </div>

        <!-- Red Flags & Key Levels -->
        <div class="section">
          <div class="section-title">Risk Factors & Key Levels</div>
          <div class="section-body">
            <div class="two-col">
              <div class="red-flags">
                <div class="red-flags-title">⚠ Red Flags to Watch</div>
                ${(aiAnalysis.red_flags || []).map(rf => 
                  `<div class="red-flag-item">${rf}</div>`
                ).join('')}
              </div>
              <div>
                <div style="font-weight:700;margin-bottom:8px;color:#374151">
                  Key Levels to Watch
                </div>
                <div class="key-levels">
                  ${(aiAnalysis.key_levels_to_watch || []).map(kl => 
                    `<div class="level-tag">${kl}</div>`
                  ).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="disclaimer">
          This analysis is generated by AI for educational purposes only and does not constitute 
          financial advice. Past performance is not indicative of future results. 
          Always do your own research before investing. StockSense | ${new Date().getFullYear()}
        </div>
      </body>
      </html>
    `;

    // Create blob and open in new tab for printing/saving as PDF
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(url);
      }, 500);
    };
  };

  const analysisTypes = [
    'Full Stock Analysis',
    'Quick Trade Setup',
    'Risk Assessment',
    'Fundamental Deep Dive'
  ];

  const handleSearch = async () => {
    if (!symbol.trim()) return;
    
    let formattedSymbol = symbol.trim().toUpperCase();
    if (!formattedSymbol.endsWith('.NS') && !formattedSymbol.endsWith('.BO')) {
      formattedSymbol += '.NS';
    }
    
    setCleanSymbol(formattedSymbol);
    setAiLoading(true);
    setErrorMsg(null);
    setAiAnalysis(null);

    try {
      // 1. Fetch Technical Data
      const techRes = await api.get(`/analysis/technical/${formattedSymbol}`);
      const techData = techRes.data;

      // 2. Fetch Fundamental Data
      const fundRes = await api.get(`/analysis/fundamental/${formattedSymbol}`);
      const fundData = fundRes.data;

      const typeMap = {
        'Full Stock Analysis': 'full',
        'Quick Trade Setup': 'trade_setup',
        'Risk Assessment': 'risk',
        'Fundamental Deep Dive': 'fundamental'
      };

      // 3. Request AI Analysis
      const payload = {
        quote: {}, 
        technical: techData,
        fundamental: fundData,
        news: [],
        market_regime: 'Neutral',
        sector_performance: 'Neutral',
        analysis_type: typeMap[analysisType] || 'full'
      };

      console.log('Sending analysis_type:', analysisType);
      const aiRes = await api.post(`/ai/analyze/${formattedSymbol}`, payload);
      setAiAnalysis(aiRes.data.analysis);
      
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to generate AI analysis. Check console or verify the symbol.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Search */}
      <div className="bg-surface-850 border border-surface-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <BrainCircuit className="text-emerald-400 w-8 h-8" />
          <h1 className="text-2xl font-bold text-white">Standalone AI Analysis</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={18} />
            </div>
            <input
              type="text"
              className="w-full bg-surface-900 border border-surface-700 text-white rounded-lg pl-10 pr-4 py-3 focus:border-emerald-500 focus:outline-none transition-colors"
              placeholder="Enter symbol (e.g. RELIANCE)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!symbol.trim() || aiLoading}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
          >
            Generate Analysis
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-3">Analysis Focus:</label>
          <div className="flex flex-wrap gap-3">
            {analysisTypes.map((type) => (
              <button
                key={type}
                onClick={() => setAnalysisType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  analysisType === type
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-surface-900 text-gray-400 border border-surface-700 hover:border-surface-600 hover:text-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg flex items-center">
          <AlertTriangle size={18} className="mr-2" /> {errorMsg}
        </div>
      )}

      {/* AI Analysis Result Area */}
      <div className="bg-surface-850 border border-surface-800 rounded-xl p-6 min-h-[400px]">
        {aiLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-emerald-400">
            <BrainCircuit className="animate-pulse w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Claude is analyzing market data for {cleanSymbol}...</p>
            <p className="text-sm text-gray-500 mt-2">Focus: {analysisType}</p>
          </div>
        ) : aiAnalysis ? (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-surface-900 border border-surface-800 text-gray-300 rounded-xl hover:bg-surface-800 hover:text-white transition-colors text-sm font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export PDF
              </button>
            </div>
            <div id="ai-analysis-content" className="space-y-8 animate-fade-in">
              {/* Top Hero Section */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] border border-[#10b981]/40 p-6 rounded-xl flex-1 w-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b981] opacity-5 rounded-bl-full pointer-events-none" />
                <h2 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">AI Verdict ({cleanSymbol})</h2>
                <div className="text-3xl font-bold text-white mb-4">{aiAnalysis.verdict}</div>
                <p className="text-gray-300 leading-relaxed">{aiAnalysis.summary}</p>
              </div>

              <div className="bg-surface-900 border border-surface-800 p-6 rounded-xl w-full md:w-64 flex flex-col items-center justify-center">
                <div className="relative w-24 h-24 mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-[#30363d]" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-[#10b981]" strokeDasharray={`${aiAnalysis.confidence}, 100`} strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-white font-mono">{aiAnalysis.confidence}%</span>
                  </div>
                </div>
                <div className="text-sm text-gray-400">Confidence Score</div>
              </div>
            </div>

            {/* Trade Setup */}
            {aiAnalysis.trade_setup && (
              <motion.div
                className="bg-surface-850 border border-surface-800 p-6 rounded-xl mt-6"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Target className="mr-2 text-[#10b981]" size={20} /> Proposed Swing Trade Setup</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-surface-900 border border-surface-800 p-4 rounded-lg text-center">
                    <div className="text-gray-500 text-xs mb-1">Entry Range</div>
                    <div className="text-white font-mono font-bold">{aiAnalysis.trade_setup.entry}</div>
                  </div>
                  <div className="bg-surface-900 border border-[#ff1744]/30 p-4 rounded-lg text-center">
                    <div className="text-gray-500 text-xs mb-1">Stop Loss</div>
                    <div className="text-[#ff1744] font-mono font-bold">{aiAnalysis.trade_setup.stop_loss}</div>
                    <div className="text-xs text-[#ff1744]/70 mt-1">({aiAnalysis.trade_setup.risk_percent} risk)</div>
                  </div>
                  <div className="bg-surface-900 border border-[#00c853]/30 p-4 rounded-lg text-center">
                    <div className="text-gray-500 text-xs mb-1">Target 1</div>
                    <div className="text-[#00c853] font-mono font-bold">{aiAnalysis.trade_setup.target_1}</div>
                  </div>
                  <div className="bg-surface-900 border border-[#00c853]/30 p-4 rounded-lg text-center">
                    <div className="text-gray-500 text-xs mb-1">Target 2</div>
                    <div className="text-[#00c853] font-mono font-bold">{aiAnalysis.trade_setup.target_2}</div>
                  </div>
                  <div className="bg-surface-900 border border-surface-800 p-4 rounded-lg text-center">
                    <div className="text-gray-500 text-xs mb-1">Risk / Reward</div>
                    <div className="text-[#10b981] font-mono font-bold">{aiAnalysis.trade_setup.risk_reward}</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Timeframes Grid */}
            {aiAnalysis.timeframes && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">
                  Analysis by Timeframe
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(aiAnalysis.timeframes).map(([tf, data]) => (
                    <div key={tf} className="bg-surface-900 border border-surface-800 rounded-xl p-5">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-white font-bold uppercase tracking-wider text-sm">
                          {tf === 'intraday' ? 'Intraday' :
                           tf === 'swing' ? 'Swing (Days)' :
                           tf === 'midterm' ? 'Midterm (Months)' :
                           'Long Term (Years)'}
                        </h4>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          data.verdict?.includes('Take') || 
                          data.verdict?.includes('Accumulate') ||
                          data.verdict?.includes('Buy')
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : data.verdict?.includes('Avoid')
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-gray-700 text-gray-300 border border-gray-600'
                        }`}>
                          {data.verdict}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        Confidence: <span className="text-emerald-400 font-mono font-bold">
                          {data.confidence}%
                        </span>
                        {data.holding_period && (
                          <span className="ml-3">
                            Hold: {data.holding_period}
                          </span>
                        )}
                      </div>
                      {data.entry && (
                        <div className="grid grid-cols-3 gap-2 mt-3 text-xs font-mono">
                          <div className="bg-surface-850 rounded p-2 text-center">
                            <div className="text-gray-500 mb-1">Entry</div>
                            <div className="text-white">{data.entry}</div>
                          </div>
                          <div className="bg-surface-850 rounded p-2 text-center">
                            <div className="text-gray-500 mb-1">SL</div>
                            <div className="text-red-400">{data.stop_loss}</div>
                          </div>
                          <div className="bg-surface-850 rounded p-2 text-center">
                            <div className="text-gray-500 mb-1">T1</div>
                            <div className="text-emerald-400">{data.target_1}</div>
                          </div>
                        </div>
                      )}
                      <p className="text-gray-400 text-xs mt-3 leading-relaxed">
                        {data.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deep Dive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-[#00c853] font-bold mb-2 flex items-center"><TrendingUp className="mr-2" size={16} /> The Bull Case</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{aiAnalysis.bull_case}</p>
                </div>
                <div>
                  <h4 className="text-gray-300 font-bold mb-2">Technical Reasoning</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{aiAnalysis.technical_reasoning}</p>
                </div>
                <div>
                  <h4 className="text-gray-300 font-bold mb-2">Fundamental Reasoning</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{aiAnalysis.fundamental_reasoning}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[#ff1744] font-bold mb-2 flex items-center"><TrendingDown className="mr-2" size={16} /> The Bear Case</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{aiAnalysis.bear_case}</p>
                </div>
                {aiAnalysis.red_flags && aiAnalysis.red_flags.length > 0 && (
                  <div className="bg-[#ff1744]/10 border border-[#ff1744]/30 rounded-lg p-4">
                    <h4 className="text-[#ff1744] font-bold mb-2 flex items-center"><AlertTriangle className="mr-2" size={16} /> Red Flags to Watch</h4>
                    <ul className="list-disc list-inside text-sm text-[#ff1744]/90 space-y-1">
                      {aiAnalysis.red_flags.map((rf, i) => <li key={i}>{rf}</li>)}
                    </ul>
                  </div>
                )}
                <div>
                  <h4 className="text-gray-300 font-bold mb-2">Key Levels to Watch</h4>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysis.key_levels_to_watch?.map((kl, i) => (
                      <span key={i} className="bg-surface-900 border border-surface-800 text-gray-300 text-xs px-2 py-1 rounded font-mono">{kl}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <BrainCircuit size={48} className="mb-4 opacity-20" />
            <p>Enter a symbol and click "Generate Analysis" to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysis;
