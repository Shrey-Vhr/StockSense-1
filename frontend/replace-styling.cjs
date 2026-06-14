const fs = require('fs');

function replaceColors(content) {
    return content
        .replace(/bg-\[\#161b22\]/g, 'bg-surface-850')
        .replace(/bg-\[\#0d1117\]/g, 'bg-surface-900')
        .replace(/border-\[\#30363d\]/g, 'border-surface-800')
        .replace(/text-\[\#10b981\]/g, 'text-emerald-400');
}

function processIndexDetail() {
    try {
        const p = 'src/pages/IndexDetail.jsx';
        let content = fs.readFileSync(p, 'utf8');
        
        // 1. Symbol heading
        content = content.replace(
            /className="text-3xl font-bold text-white"/g,
            'className="text-3xl font-bold text-gray-100 tracking-tight font-mono"'
        );
        // 2. Subtitle
        content = content.replace(
            /className="text-gray-400">Index Analysis<\/p>/g,
            'className="text-gray-500 text-sm mt-0.5">Index Analysis</p>'
        );
        // 3. Metric cards
        content = content.replace(
            /className="bg-\[\#161b22\] p-4 rounded-xl border border-\[\#30363d\]"/g,
            'className="bg-surface-850 border border-surface-800 rounded-2xl p-4 hover:border-emerald-500/20 transition-colors"'
        );
        content = content.replace(
            /className="col-span-2 bg-\[\#161b22\] p-4 rounded-xl border border-\[\#30363d\]"/g,
            'className="col-span-2 bg-surface-850 border border-surface-800 rounded-2xl p-4 hover:border-emerald-500/20 transition-colors"'
        );
        content = content.replace(
            /className="col-span-2 md:col-span-4 bg-\[\#161b22\] p-4 rounded-xl border border-\[\#30363d\]"/g,
            'className="col-span-2 md:col-span-4 bg-surface-850 border border-surface-800 rounded-2xl p-4 hover:border-emerald-500/20 transition-colors"'
        );
        // 4. Metric labels
        content = content.replace(
            /className="text-gray-400 text-xs mb-1"/g,
            'className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1"'
        );
        content = content.replace(
            /className="text-gray-400 text-xs mb-1 flex justify-between"/g,
            'className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1 flex justify-between"'
        );
        content = content.replace(
            /className="text-gray-400 text-xs mb-2"/g,
            'className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2"'
        );
        // 5. Metric values
        content = content.replace(
            /className="text-white font-mono font-bold"/g,
            'className="text-gray-100 font-bold text-lg mt-1 font-mono"'
        );
        // 6. Market Verdict card
        // It has a dynamic class: className={`p-6 rounded-xl border border-${...} bg-[#161b22]`}
        content = content.replace(
            /className=\{`p-6 rounded-xl border border-\$\{data\.verdict_color === 'green' \? '\[\#00c853\]' : data\.verdict_color === 'red' \? '\[\#ff1744\]' : '\[\#10b981\]'\} bg-\[\#161b22\]`\}/g,
            'className="bg-surface-850 border border-emerald-500/20 rounded-2xl p-5"'
        );
        // 7. Market verdict heading
        content = content.replace(
            /className="text-xl font-bold text-white mb-2"/g,
            'className="text-base font-bold text-gray-100 mb-2"'
        );
        // 8. Global colors
        content = replaceColors(content);

        fs.writeFileSync(p, content);
        console.log('Processed IndexDetail.jsx');
    } catch(e) { console.error('Error IndexDetail:', e.message); }
}

function processETFDetail() {
    try {
        const p = 'src/pages/ETFDetail.jsx';
        let content = fs.readFileSync(p, 'utf8');

        // Lightbulb replace
        content = content.replace(/💡 /g, '');
        
        // ETF Verdict card: `className="p-6 rounded-xl border ... bg-[#161b22]"` -> wait ETF detail might be same as index detail
        content = content.replace(
            /className=\{`p-6 rounded-xl border border-\$\{etf\.verdict_color === 'green' \? '\[\#00c853\]' : etf\.verdict_color === 'red' \? '\[\#ff1744\]' : '\[\#10b981\]'\} bg-\[\#161b22\]`\}/g,
            'className="bg-surface-850 border border-emerald-500/20 rounded-2xl p-5"'
        );
        // Rolling Returns container
        content = content.replace(
            /className="bg-\[\#161b22\] p-4 rounded-xl border border-\[\#30363d\] overflow-x-auto"/g,
            'className="bg-surface-850 border border-surface-800 rounded-2xl p-5 mt-4 overflow-x-auto"'
        );
        
        // metric cards and labels
        content = content.replace(
            /className="bg-\[\#161b22\] p-4 rounded-xl border border-\[\#30363d\]"/g,
            'className="bg-surface-850 border border-surface-800 rounded-2xl p-4 hover:border-emerald-500/20 transition-colors"'
        );
        content = content.replace(
            /className="text-gray-400 text-xs mb-1"/g,
            'className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1"'
        );
        content = content.replace(
            /className="text-white font-mono font-bold"/g,
            'className="text-gray-100 font-bold text-lg mt-1 font-mono"'
        );
        
        content = replaceColors(content);
        fs.writeFileSync(p, content);
        console.log('Processed ETFDetail.jsx');
    } catch(e) { console.error('Error ETFDetail:', e.message); }
}

function processLogin() {
    try {
        const p = 'src/pages/Login.jsx';
        let content = fs.readFileSync(p, 'utf8');

        // imports
        if (!content.includes('LineChart')) {
            content = content.replace(/import \{.*?\} from 'lucide-react';/, match => match.replace('TrendingUp', 'TrendingUp, LineChart'));
        }

        // Entire background & Card wrapper
        const bgRegex = /<div className="min-h-screen flex flex-col md:flex-row bg-gray-950 text-gray-100 font-sans">[\s\S]*?(<form onSubmit=\{handleSubmit\})/m;
        const newWrapper = `<div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="bg-surface-850 border border-surface-800 rounded-2xl p-8 w-full max-w-md shadow-card">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <LineChart className="text-white w-6 h-6"/>
          </div>
          <h1 className="text-2xl font-bold text-gray-100">StockSense</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>
        $1`;
        content = content.replace(bgRegex, newWrapper);

        // form labels
        content = content.replace(
            /className="text-sm font-medium text-gray-300"/g,
            'className="text-gray-400 text-sm font-medium mb-1.5 block"'
        );
        // form inputs
        content = content.replace(
            /className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg outline-none text-white placeholder-gray-600 transition-all(\s*pr-12)?"/g,
            'className="w-full bg-surface-900 border border-surface-800 rounded-xl px-4 py-3 text-gray-100 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder-gray-600$1"'
        );
        // submit button
        content = content.replace(
            /className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-600 hover:to-emerald-600 text-white font-bold rounded-lg shadow-lg shadow-emerald-500\/20 transform transition-all active:scale-\[0\.98\] flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"/g,
            'className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-glow flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"'
        );
        // link text
        content = content.replace(
            /className="text-emerald-500 hover:text-emerald-400 font-bold transition-colors ml-1"/g,
            'className="text-emerald-400 hover:text-emerald-300 transition-colors ml-1"'
        );
        // closing tags
        content = content.replace(/<\/div>\n      <\/div>\n    <\/div>/, '</div>\n    </div>');

        fs.writeFileSync(p, content);
        console.log('Processed Login.jsx');
    } catch(e) { console.error('Error Login:', e.message); }
}

function processCss() {
    try {
        const p = 'src/index.css';
        let content = fs.readFileSync(p, 'utf8');
        if(!content.includes('.page-enter')) {
            const additions = `
/* Smooth page transitions */
.page-enter {
  opacity: 0;
  transform: translateY(8px);
}
.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 200ms ease-out, 
              transform 200ms ease-out;
}

/* Card hover lift */
.card-hover {
  transition: transform 150ms ease, 
              box-shadow 150ms ease;
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

/* Emerald glow on focus */
input:focus, select:focus, textarea:focus {
  box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
}

/* Fade in animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 200ms ease-out;
}
`;
            fs.appendFileSync(p, additions);
            console.log('Processed index.css');
        }
    } catch(e) { console.error('Error CSS:', e.message); }
}

processIndexDetail();
processETFDetail();
processLogin();
processCss();
