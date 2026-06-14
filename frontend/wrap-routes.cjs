const fs = require('fs');

const p = 'src/App.jsx';
let content = fs.readFileSync(p, 'utf8');

// Add imports
if (!content.includes('AnimatePresence')) {
  content = content.replace(
    /import \{ BrowserRouter.*?\n/,
    "import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'\nimport { AnimatePresence } from 'framer-motion'\nimport PageTransition from './components/PageTransition'\n"
  );
}

// Wrap <Routes> with <AnimatePresence mode="wait">
content = content.replace(/<Routes>/, '<AnimatePresence mode="wait">\n      <Routes>');
content = content.replace(/<\/Routes>/, '</Routes>\n      </AnimatePresence>');

// Replace elements with PageTransition wrapper
const routesToWrap = [
  'Login', 'Dashboard', 'StockDetail', 'IndexDetail', 
  'ETFDetail', 'Screener', 'Portfolio', 'News', 'Watchlist'
];

routesToWrap.forEach(comp => {
  const regex = new RegExp(`element=\\{<${comp} />\\}`, 'g');
  content = content.replace(regex, `element={<PageTransition><${comp} /></PageTransition>}`);
});

fs.writeFileSync(p, content);
console.log('App.jsx processed');
