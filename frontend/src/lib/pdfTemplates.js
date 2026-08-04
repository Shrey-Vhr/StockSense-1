/**
 * Printable report templates for Stock Detail.
 *
 * These three HTML documents lived inline in StockDetail.jsx and accounted for
 * roughly 1,050 of its 3,006 lines — about a third of the file — which made the
 * component itself hard to find, let alone read. The markup is carried across
 * verbatim; only the surrounding function wrapper is new.
 *
 * They intentionally use their own light print palette rather than the app's
 * dark tokens: these render on paper, where the screen theme would be both
 * unreadable and wasteful of toner.
 */

/**
 * Opens an HTML string in a new tab and triggers the print dialog.
 * This block was duplicated identically in all three export handlers.
 */
export function openPrintWindow(content) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      URL.revokeObjectURL(url);
    }, 500);
  };
}

export function buildAiReportHtml(cleanSymbol, aiAnalysis) {
  return `
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
                <div class="reasoning">${data.reasoning || ''}</div>
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
}

export function buildTechnicalsReportHtml(cleanSymbol, techData) {
  return `
      <!DOCTYPE html>
      <html>
      <head>
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
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
          .metric-card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
          }
          .metric-label {
            font-size: 9px;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .metric-value {
            font-size: 14px;
            font-weight: 700;
            color: #1a1a1a;
          }
          .uptrend { color: #059669; }
          .downtrend { color: #dc2626; }
          .neutral { color: #d97706; }
          .score-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .score-number {
            font-size: 36px;
            font-weight: 800;
            color: #059669;
          }
          .two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .level-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 11px;
          }
          .support { color: #059669; font-weight: 700; }
          .resistance { color: #dc2626; font-weight: 700; }
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
          <h1>Technical Analysis — ${cleanSymbol.replace('.NS', '')}</h1>
          <p>Generated on ${new Date().toLocaleDateString('en-IN', { 
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}</p>
          <div class="badge">StockSense</div>
        </div>

        <!-- Score -->
        <div class="section">
          <div class="section-title">Technical Score</div>
          <div class="section-body">
            <div class="score-box">
              <div>
                <div style="font-size:13px;color:#374151;font-weight:600">
                  Overall Technical Score
                </div>
                <div style="font-size:11px;color:#6b7280;margin-top:4px">
                  Based on trend, momentum, volume and structure
                </div>
              </div>
              <div class="score-number">
                ${techData.overall_technical_score}/100
              </div>
            </div>
          </div>
        </div>

        <!-- Key Metrics -->
        <div class="section">
          <div class="section-title">Key Indicators</div>
          <div class="section-body">
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Trend</div>
                <div class="metric-value ${
                  techData.trend?.status?.includes('Up') ? 'uptrend' :
                  techData.trend?.status?.includes('Down') ? 'downtrend' : 'neutral'
                }">${techData.trend?.status || 'N/A'}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">RSI (14)</div>
                <div class="metric-value">
                  ${techData.momentum?.rsi?.value?.toFixed(1) || 'N/A'}
                  <span style="font-size:10px;color:#6b7280">
                    (${techData.momentum?.rsi?.signal || ''})
                  </span>
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-label">MACD</div>
                <div class="metric-value">
                  ${techData.momentum?.macd?.crossover || 'N/A'}
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-label">ADX</div>
                <div class="metric-value">
                  ${techData.momentum?.adx?.value?.toFixed(1) || 'N/A'}
                  <span style="font-size:10px;color:#6b7280">
                    (${techData.momentum?.adx?.strength || ''})
                  </span>
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Volume</div>
                <div class="metric-value">
                  ${techData.volume?.current_volume 
                    ? (techData.volume.current_volume >= 10000000 ? (techData.volume.current_volume/10000000).toFixed(2) + 'Cr' : techData.volume.current_volume >= 100000 ? (techData.volume.current_volume/100000).toFixed(2) + 'L' : techData.volume.current_volume.toLocaleString('en-IN')) 
                    : 'N/A'}
                  <span style="font-size:10px;color:#6b7280;display:block;margin-top:2px;">
                    ${techData.volume?.relative_volume?.toFixed(1) || 'N/A'}x Avg
                  </span>
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Price vs EMA200</div>
                <div class="metric-value ${
                  techData.trend?.above_ema200 ? 'uptrend' : 'downtrend'
                }">
                  ${techData.trend?.above_ema200 ? 'Above' : 'Below'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- EMA Levels -->
        <div class="section">
          <div class="section-title">EMA Levels</div>
          <div class="section-body">
            <div class="two-col">
              <div>
                <div class="level-row">
                  <span style="color:#6b7280">EMA 20</span>
                  <span style="font-weight:600">
                    ₹${techData.trend?.emas?.ema20?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <div class="level-row">
                  <span style="color:#6b7280">EMA 50</span>
                  <span style="font-weight:600">
                    ₹${techData.trend?.emas?.ema50?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <div class="level-row">
                  <span style="color:#6b7280">EMA 200</span>
                  <span style="font-weight:600">
                    ₹${techData.trend?.emas?.ema200?.toFixed(2) || 'N/A'}
                  </span>
                </div>
              </div>
              <div>
                <div class="level-row">
                  <span style="color:#6b7280">Support</span>
                  <span class="support">
                    ₹${techData.structure?.support_resistance?.support?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <div class="level-row">
                  <span style="color:#6b7280">Resistance</span>
                  <span class="resistance">
                    ₹${techData.structure?.support_resistance?.resistance?.toFixed(2) || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="disclaimer">
          This technical analysis is generated by StockSense for educational purposes only 
          and does not constitute financial advice. StockSense | ${new Date().getFullYear()}
        </div>
      </body>
      </html>
  `;
}

export function buildFundamentalsReportHtml(cleanSymbol, fundData) {
  return `
      <!DOCTYPE html>
      <html>
      <head>
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
          .ratios-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }
          .ratio-card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
          }
          .ratio-label {
            font-size: 9px;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .ratio-value {
            font-size: 13px;
            font-weight: 700;
            color: #1a1a1a;
          }
          .good { color: #059669; }
          .bad { color: #dc2626; }
          .two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .data-row {
            display: flex;
            justify-content: space-between;
            padding: 7px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 11px;
          }
          .data-label { color: #6b7280; }
          .data-value { font-weight: 600; }
          .score-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .score-number {
            font-size: 36px;
            font-weight: 800;
            color: #059669;
          }
          .strength-item {
            font-size: 10px;
            color: #065f46;
            background: #d1fae5;
            padding: 4px 8px;
            border-radius: 4px;
            margin: 3px 0;
          }
          .weakness-item {
            font-size: 10px;
            color: #991b1b;
            background: #fee2e2;
            padding: 4px 8px;
            border-radius: 4px;
            margin: 3px 0;
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
          <h1>Fundamental Analysis — ${cleanSymbol.replace('.NS', '')}</h1>
          <p>Generated on ${new Date().toLocaleDateString('en-IN', { 
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })} | Data: Screener.in</p>
          <div class="badge">StockSense</div>
        </div>

        <!-- Score -->
        <div class="section">
          <div class="section-title">Fundamental Score</div>
          <div class="section-body">
            <div class="score-box">
              <div>
                <div style="font-size:13px;color:#374151;font-weight:600">
                  ${fundData.company_name || cleanSymbol.replace('.NS', '')}
                </div>
                <div style="font-size:11px;color:#6b7280;margin-top:4px">
                  Overall Fundamental Score
                </div>
              </div>
              <div class="score-number">
                ${fundData.fundamental_score}/100
              </div>
            </div>
          </div>
        </div>

        <!-- Key Ratios -->
        <div class="section">
          <div class="section-title">Key Ratios</div>
          <div class="section-body">
            <div class="ratios-grid">
              <div class="ratio-card">
                <div class="ratio-label">PE Ratio</div>
                <div class="ratio-value">
                  ${fundData.pe_ratio ? parseFloat(fundData.pe_ratio).toFixed(1) + 'x' : 'N/A'}
                </div>
              </div>
              <div class="ratio-card">
                <div class="ratio-label">PB Ratio</div>
                <div class="ratio-value">
                  ${fundData.pb_ratio ? parseFloat(fundData.pb_ratio).toFixed(1) + 'x' : 'N/A'}
                </div>
              </div>
              <div class="ratio-card">
                <div class="ratio-label">ROE</div>
                <div class="ratio-value ${fundData.roe > 0.15 ? 'good' : ''}">
                  ${fundData.roe ? (fundData.roe < 1 ? (fundData.roe * 100).toFixed(1) : parseFloat(fundData.roe).toFixed(1)) + '%' : 'N/A'}
                </div>
              </div>
              <div class="ratio-card">
                <div class="ratio-label">ROCE</div>
                <div class="ratio-value">
                  ${fundData.roce ? parseFloat(fundData.roce).toFixed(1) + '%' : 'N/A'}
                </div>
              </div>
              <div class="ratio-card">
                <div class="ratio-label">Debt/Equity</div>
                <div class="ratio-value ${fundData.debt_to_equity < 1 ? 'good' : 'bad'}">
                  ${fundData.debt_to_equity ? parseFloat(fundData.debt_to_equity).toFixed(2) + 'x' : 'N/A'}
                </div>
              </div>
              <div class="ratio-card">
                <div class="ratio-label">EPS</div>
                <div class="ratio-value">
                  ${fundData.eps ? '₹' + parseFloat(fundData.eps).toFixed(2) : 'N/A'}
                </div>
              </div>
              <div class="ratio-card">
                <div class="ratio-label">Book Value</div>
                <div class="ratio-value">
                  ${fundData.book_value ? '₹' + parseFloat(fundData.book_value).toFixed(2) : 'N/A'}
                </div>
              </div>
              <div class="ratio-card">
                <div class="ratio-label">Dividend Yield</div>
                <div class="ratio-value">
                  ${fundData.dividend_yield ? parseFloat(fundData.dividend_yield).toFixed(2) + '%' : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Growth & Shareholding -->
        <div class="section">
          <div class="section-title">Growth & Shareholding</div>
          <div class="section-body">
            <div class="two-col">
              <div>
                <div style="font-weight:700;margin-bottom:8px;font-size:11px">
                  Growth YoY
                </div>
                <div class="data-row">
                  <span class="data-label">Revenue Growth</span>
                  <span class="data-value ${fundData.revenue_growth_yoy > 10 ? 'good' : fundData.revenue_growth_yoy < 0 ? 'bad' : ''}">
                    ${fundData.revenue_growth_yoy ? fundData.revenue_growth_yoy + '%' : 'N/A'}
                  </span>
                </div>
                <div class="data-row">
                  <span class="data-label">Profit Growth</span>
                  <span class="data-value ${fundData.profit_growth_yoy > 10 ? 'good' : fundData.profit_growth_yoy < 0 ? 'bad' : ''}">
                    ${fundData.profit_growth_yoy ? fundData.profit_growth_yoy + '%' : 'N/A'}
                  </span>
                </div>
              </div>
              <div>
                <div style="font-weight:700;margin-bottom:8px;font-size:11px">
                  Shareholding Pattern
                </div>
                <div class="data-row">
                  <span class="data-label">Promoter</span>
                  <span class="data-value">
                    ${fundData.promoter_holding ? fundData.promoter_holding + '%' : 'N/A'}
                  </span>
                </div>
                <div class="data-row">
                  <span class="data-label">FII/FPI</span>
                  <span class="data-value">
                    ${fundData.fii_holding ? fundData.fii_holding + '%' : 'N/A'}
                  </span>
                </div>
                <div class="data-row">
                  <span class="data-label">DII</span>
                  <span class="data-value">
                    ${fundData.dii_holding ? fundData.dii_holding + '%' : 'N/A'}
                  </span>
                </div>
                <div class="data-row">
                  <span class="data-label">Promoter Pledge</span>
                  <span class="data-value ${fundData.promoter_pledge > 20 ? 'bad' : 'good'}">
                    ${fundData.promoter_pledge !== null ? fundData.promoter_pledge + '%' : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Strengths & Weaknesses -->
        <div class="section">
          <div class="section-title">Fundamental Score Card</div>
          <div class="section-body">
            <div class="two-col">
              <div>
                <div style="font-weight:700;margin-bottom:8px;
                            font-size:11px;color:#059669">
                  Strengths
                </div>
                ${(fundData.strengths || []).map(s => 
                  `<div class="strength-item">✓ ${s}</div>`
                ).join('') || `<div style="color:#6b7280;font-size:11px">N/A</div>`}
              </div>
              <div>
                <div style="font-weight:700;margin-bottom:8px;
                            font-size:11px;color:#dc2626">
                  Weaknesses
                </div>
                ${(fundData.weaknesses || []).map(w => 
                  `<div class="weakness-item">✗ ${w}</div>`
                ).join('') || `<div style="color:#6b7280;font-size:11px">N/A</div>`}
              </div>
            </div>
          </div>
        </div>

        <div class="disclaimer">
          Fundamental data sourced from Screener.in. This analysis is for educational 
          purposes only and does not constitute financial advice. 
          StockSense | ${new Date().getFullYear()}
        </div>
      </body>
      </html>
  `;
}
