const fs = require('fs');

const p = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(p, 'utf8');

// 1. Add import
if (!content.includes('framer-motion')) {
  content = "import { motion } from 'framer-motion';\n" + content;
}

// 2. Replace market overview cards
content = content.replace(
  /<div key=\{i\} className="bg-surface-850 border border-surface-800 rounded-2xl p-5 hover:border-emerald-500\/30 hover:shadow-glow transition-all duration-200 group">/,
  `<motion.div key={i} className="bg-surface-850 border border-surface-800 rounded-2xl p-5 hover:border-emerald-500/30 hover:shadow-glow transition-all duration-200 group" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }} whileHover={{ y: -2 }}>`
);
// replace its closing div: it's the div before {safeArray(marketOverview).slice(0, 3).map... Wait, that's hard to regex. Let's just do it string by string.
content = content.replace(
  /<\/div>\n        \}\)\}/,
  '</motion.div>\n        })}'
);

// 3. Top Gainers container
content = content.replace(
  /\{?\/\*\s*Top Gainers\s*\*\/\}?\n\s*<div className="bg-surface-850 border border-surface-800 rounded-2xl p-5">/,
  `{/* Top Gainers */}\n          <motion.div className="bg-surface-850 border border-surface-800 rounded-2xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>`
);

// 4. Top Losers container
content = content.replace(
  /\{?\/\*\s*Top Losers\s*\*\/\}?\n\s*<div className="bg-surface-850 border border-surface-800 rounded-2xl p-5">/,
  `{/* Top Losers */}\n          <motion.div className="bg-surface-850 border border-surface-800 rounded-2xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>`
);

// Close Top Gainers and Top Losers containers
// They end right before the next section
content = content.replace(
  /<\/div>\n\s*\{?\/\*\s*Top Losers\s*\*\/\}/,
  '</motion.div>\n\n          {/* Top Losers */}'
);
content = content.replace(
  /<\/div>\n\s*\{?\/\*\s*Indices & ETFs Quick Access\s*\*\/\}/,
  '</motion.div>\n          \n          {/* Indices & ETFs Quick Access */}'
);

// 5. Replace each gainer/loser stock card
content = content.replace(
  /<div \n\s*key=\{stock\.symbol\} \n\s*onClick=\{([^}]+)\}?\n\s*className="flex-shrink-0 bg-surface-850 border border-surface-800 rounded-xl p-4 min-w-\[140px\] hover:border-emerald-500\/30 hover:bg-surface-800 hover:-translate-y-0\.5 transition-all duration-200 cursor-pointer"\n\s*>/g,
  `<motion.div \n                    key={stock.symbol} \n                    onClick={$1}\n                    className="flex-shrink-0 bg-surface-850 border border-surface-800 rounded-xl p-4 min-w-[140px] hover:bg-surface-800 cursor-pointer"\n                    whileHover={{ y: -4, borderColor: 'rgba(16,185,129,0.4)' }}\n                    whileTap={{ scale: 0.97 }}\n                    transition={{ duration: 0.15 }}\n                  >`
);
content = content.replace(
  /<\/div>\n\s*\}\)\}/g,
  '</motion.div>\n                })}'
);

// 6. Replace Market News panel
content = content.replace(
  /\{?\/\*\s*Right Column - News\s*\*\/\}?\n\s*<div className="space-y-6">\n\s*<div className="bg-surface-850 border border-surface-800 rounded-2xl p-5 h-full">/,
  `{/* Right Column - News */}\n        <div className="space-y-6">\n          <motion.div className="bg-surface-850 border border-surface-800 rounded-2xl p-5 h-full" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>`
);
content = content.replace(
  /<\/a>\n\s*\}\)\}\n\s*<\/div>\n\s*<\/div>/,
  '</a>\n              ))}\n            </div>\n          </motion.div>'
);

fs.writeFileSync(p, content);
console.log('Dashboard.jsx processed');
