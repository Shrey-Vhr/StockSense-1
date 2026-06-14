const fs = require('fs');
const files = [
  'f:/StockSense/frontend/src/pages/StockDetail.jsx',
  'f:/StockSense/frontend/src/pages/News.jsx',
  'f:/StockSense/frontend/src/pages/Dashboard.jsx'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/bg-\[#161b22\]/g, 'bg-surface-850');
    content = content.replace(/border-\[#30363d\]/g, 'border-surface-800');
    content = content.replace(/bg-\[#0d1117\]/g, 'bg-surface-900');
    
    // Header text emojis
    content = content.replace(/🟢 Positive News/g, 'Positive News');
    content = content.replace(/🔴 Negative News/g, 'Negative News');
    content = content.replace(/⚪ Neutral News/g, 'Neutral News');
    
    // Emojis mapping
    content = content.replace(/'🟢'/g, "'↑'");
    content = content.replace(/'🔴'/g, "'↓'");
    content = content.replace(/'⚪'/g, "'—'");
    content = content.replace(/'🟢 '/g, "'↑ '");
    content = content.replace(/'🔴 '/g, "'↓ '");
    content = content.replace(/'⚪ '/g, "'— '");
    
    // Garbled emojis
    content = content.replace(/â Œ /g, '');
    
    fs.writeFileSync(f, content);
  }
});
console.log('Done');
