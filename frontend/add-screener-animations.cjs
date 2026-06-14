const fs = require('fs');

const p = 'src/pages/Screener.jsx';
let content = fs.readFileSync(p, 'utf8');

// 1. Add imports
if (!content.includes('framer-motion')) {
  content = content.replace(
    /import \{ useState, useEffect, useCallback \} from 'react';/,
    "import { useState, useEffect, useCallback } from 'react';\nimport { motion, AnimatePresence } from 'framer-motion';"
  );
}

// 2. Animate conditions
// finding: ) : (\n            conditions.map((cond, idx) => {
content = content.replace(
  /\) \: \(\n\s*conditions\.map\(\(cond, idx\) => \{/,
  `) : (\n            <AnimatePresence>\n              {conditions.map((cond, idx) => {`
);

content = content.replace(
  /className="px-5 py-3 flex flex-col md:flex-row items-start md:items-center gap-3 hover:bg-\[#1c2333\]\/40 transition-colors group"/,
  `initial={{ opacity: 0, height: 0 }}\n                  animate={{ opacity: 1, height: 'auto' }}\n                  exit={{ opacity: 0, height: 0 }}\n                  transition={{ duration: 0.2 }}\n                  className="px-5 py-3 flex flex-col md:flex-row items-start md:items-center gap-3 hover:bg-[#1c2333]/40 transition-colors group overflow-hidden"`
);

// replace opening div of condition
content = content.replace(
  /<div\n\s*key=\{idx\}\n\s*initial=/g,
  '<motion.div\n                  key={idx}\n                  initial='
);

// find end of conditions map
content = content.replace(
  /<\/button>\n\s*<\/div>\n\s*\);\n\s*\}\)\n\s*\)\}/,
  `</button>\n                </motion.div>\n              );\n            })}\n            </AnimatePresence>\n          )}`
);


// 3. Animate Results
// Find: <div className="divide-y divide-surface-800/50">\n              {screenerResults.length > 0 ? (
//   screenerResults.map((stock) => (
//     <div
//       key={stock.symbol}
content = content.replace(
  /<div className="divide-y divide-surface-800\/50">\n\s*\{screenerResults\.length > 0 \? \(\n\s*screenerResults\.map\(\(stock\) => \(\n\s*<div\n\s*key=\{stock\.symbol\}\n\s*onClick=\{([^}]+)\}\n\s*className="grid grid-cols-12 gap-4 px-4 py-3\.5 border-b border-surface-800 last:border-b-0 hover:bg-surface-800\/50 cursor-pointer transition-colors"/,
  `<div className="divide-y divide-surface-800/50">
              <AnimatePresence mode="wait">
                {screenerResults.length > 0 ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {screenerResults.map((stock, i) => (
                      <motion.div
                        key={stock.symbol}
                        onClick={$1}
                        className="grid grid-cols-12 gap-4 px-4 py-3.5 border-b border-surface-800 last:border-b-0 hover:bg-surface-800/50 cursor-pointer transition-colors"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.03 }}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}`
);

// Find end of single result row
content = content.replace(
  /<\/ChevronRight size=\{16\} className="text-gray-700 group-hover:text-\[#58a6ff\] transition-colors" \/>\n\s*<\/div>\n\s*<\/div>\n\s*\)\)\n\s*\) \: \(/,
  `<ChevronRight size={16} className="text-gray-700 group-hover:text-[#58a6ff] transition-colors" />\n                    </div>\n                  </motion.div>\n                ))}\n                </motion.div>\n              ) : (`
);
// Wait, my regex target is bad. Let's look exactly at the file:
//                       <ChevronRight size={16} className="text-gray-700 group-hover:text-[#58a6ff] transition-colors" />
//                     </div>
//                   </div>
//                 ))
//               ) : (
//                 !isLoading.screener && (
//                   <div className="py-16 text-center">
content = content.replace(
  /<ChevronRight size=\{16\} className="text-gray-700 group-hover:text-\[#58a6ff\] transition-colors" \/>\n\s*<\/div>\n\s*<\/div>\n\s*\)\)\n\s*\) \: \(\n\s*!isLoading\.screener && \(\n\s*<div className="py-16 text-center">/,
  `<ChevronRight size={16} className="text-gray-700 group-hover:text-[#58a6ff] transition-colors" />
                    </div>
                  </motion.div>
                ))}
                </motion.div>
              ) : (
                !isLoading.screener ? (
                  <motion.div
                    key="no-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="py-16 text-center"
                  >`
);

// End of no-results
//                 )
//               )}
//             </div>
content = content.replace(
  /<\/div>\n\s*\)\n\s*\)\}\n\s*<\/div>/,
  `</motion.div>\n                ) : null\n              )}\n              </AnimatePresence>\n            </div>`
);

fs.writeFileSync(p, content);
console.log('Screener.jsx processed');
