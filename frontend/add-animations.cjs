const fs = require('fs');

const p = 'src/pages/StockDetail.jsx';
let content = fs.readFileSync(p, 'utf8');

// 1. Add import
if (!content.includes('framer-motion')) {
  content = content.replace(
    /import \{ useState, useEffect, useRef \} from 'react';/,
    "import { useState, useEffect, useRef } from 'react';\nimport { motion, AnimatePresence } from 'framer-motion';"
  );
}

// 2. Stock Header
content = content.replace(
  /<div className="flex justify-between items-start px-6 py-4 bg-surface-850 border-b border-surface-800">/,
  `<motion.div\n          className="flex justify-between items-start px-6 py-4 bg-surface-850 border-b border-surface-800"\n          initial={{ opacity: 0, y: -10 }}\n          animate={{ opacity: 1, y: 0 }}\n          transition={{ duration: 0.3 }}\n        >`
);

content = content.replace(
  /<\/button>\n\s*<\/div>\n\s*<\/div>\n\s*\)\}/,
  `</button>\n          </div>\n        </motion.div>\n      )}`
);

// 3. Technical Snapshot
const metricsRegex = /<div className="grid grid-cols-2 md:grid-cols-5 gap-4">([\s\S]*?)<div className="grid grid-cols-1 md:grid-cols-2 gap-6">/;

const newMetricsStr = `<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Trend', value: techData.trend?.status, isGood: techData.trend?.status?.includes('Up'), customFormat: null },
                { label: 'RSI (14)', value: \`\${techData.momentum?.rsi?.value?.toFixed(1) || 'N/A'} \`, suffix: techData.momentum?.rsi?.signal ? \`(\${techData.momentum?.rsi?.signal})\` : '' },
                { label: 'MACD', value: techData.momentum?.macd?.crossover },
                { label: 'Volume', value: \`\${techData.volume?.relative_volume?.toFixed(1) || 'N/A'}x \`, suffix: 'Avg' },
                { label: 'News Sentiment', value: sentiment ? \`\${sentiment.overall_sentiment} (\${sentiment.score}/10)\` : 'N/A', isGood: sentiment?.overall_sentiment === 'Positive' ? true : sentiment?.overall_sentiment === 'Negative' ? false : null }
              ].map((metric, i) => (
                <motion.div
                  key={i}
                  className="bg-surface-900 border border-surface-800 rounded-xl p-4 hover:border-emerald-500/20 transition-colors"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: 0.1 + i * 0.07 
                  }}
                  whileHover={{ 
                    borderColor: 'rgba(16,185,129,0.2)',
                    y: -1
                  }}
                >
                  <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">{metric.label}</div>
                  <div className={\`text-sm font-semibold mt-1.5 \${metric.isGood === true ? 'text-emerald-400' : metric.isGood === false ? 'text-red-400' : 'text-gray-100'}\`}>
                    {metric.value} {metric.suffix && <span className="text-xs font-sans text-gray-500">{metric.suffix}</span>}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">`;

content = content.replace(metricsRegex, newMetricsStr);


// 4. Tab Content Switching
content = content.replace(
  /<div className="bg-surface-850 border border-surface-800 rounded-xl p-6 min-h-\[400px\]">/,
  `<div className="bg-surface-850 border border-surface-800 rounded-xl p-6 min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >`
);

content = content.replace(
  /<\/div>\n\s*<\/div>\n\s*\);\n\s*\};\n\nexport default StockDetail;/g,
  `          </motion.div>\n        </AnimatePresence>\n      </div>\n    </div>\n  );\n};\n\nexport default StockDetail;`
);

// 5. Trade setup
content = content.replace(
  /\{\/\* Trade Setup \*\/\}\n\s*<div>\n\s*<h3 className="text-lg font-bold text-white mb-4 flex items-center"><Target className="mr-2 text-\[#10b981\]" size=\{20\} \/> Proposed Swing Trade Setup<\/h3>/,
  `{/* Trade Setup */}
                <motion.div
                  className="bg-surface-850 border border-surface-800 p-6 rounded-xl mt-6"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Target className="mr-2 text-[#10b981]" size={20} /> Proposed Swing Trade Setup</h3>`
);

content = content.replace(
  /<\/div>\n\s*<\/div>\n\n\s*\{\/\* Deep Dive Grid \*\/\}/,
  `                    </div>\n                  </motion.div>\n\n                  {/* Deep Dive Grid */}`
);

fs.writeFileSync(p, content);

// 6. PatternAnalysis.jsx
const p2 = 'src/components/PatternAnalysis.jsx';
if (fs.existsSync(p2)) {
  let content2 = fs.readFileSync(p2, 'utf8');
  if (!content2.includes('framer-motion')) {
    content2 = content2.replace(
      /import \{ useState, useEffect \} from 'react';/,
      "import { useState, useEffect } from 'react';\nimport { motion } from 'framer-motion';"
    );
  }
  
  content2 = content2.replace(
    /\{patterns\.map\(\(pattern, i\) => \(\n\s*<div key=\{i\} className="flex justify-between items-center p-3 bg-surface-900 border border-surface-800 rounded-xl hover:border-emerald-500\/20 transition-colors">/,
    `{patterns.map((pattern, i) => (
            <motion.div
              key={i}
              className="flex justify-between items-center p-3 bg-surface-900 border border-surface-800 rounded-xl hover:border-emerald-500/20 transition-colors"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.25, 
                delay: i * 0.06 
              }}
            >`
  );
  
  content2 = content2.replace(
    /<\/div>\n\s*<\/div>\n\s*\)\)\}\n\s*<\/div>/,
    `</div>\n            </motion.div>\n          ))}\n        </div>`
  );

  fs.writeFileSync(p2, content2);
}

console.log('StockDetail & PatternAnalysis rebuilt successfully');
