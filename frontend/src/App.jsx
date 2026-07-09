import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import PageTransition from './components/PageTransition'
import Dashboard from './pages/Dashboard'
import StockDetail from './pages/StockDetail'
import Screener from './pages/Screener'
import Portfolio from './pages/Portfolio'
import News from './pages/News'
import Watchlist from './pages/Watchlist'
import Login from './pages/Login'
import IndexDetail from './pages/IndexDetail'
import ETFDetail from './pages/ETFDetail'
import AIAnalysis from './pages/AIAnalysis'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/Layout/ProtectedRoute'
import SplashScreen from './components/SplashScreen'
import { useState, useEffect } from 'react'
import { useNotifications } from "./hooks/useNotifications";
import { Toaster } from 'react-hot-toast';

function NotificationManager() {
  useNotifications();
  return null;
}

const AppContent = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="stock/:symbol" element={<PageTransition><StockDetail /></PageTransition>} />
            <Route path="index/:symbol" element={<PageTransition><IndexDetail /></PageTransition>} />
            <Route path="etf/:symbol" element={<PageTransition><ETFDetail /></PageTransition>} />
            <Route path="screener" element={<PageTransition><Screener /></PageTransition>} />
            <Route path="portfolio" element={<PageTransition><Portfolio /></PageTransition>} />
            <Route path="news" element={<PageTransition><News /></PageTransition>} />
            <Route path="watchlist" element={<PageTransition><Watchlist /></PageTransition>} />
            <Route path="ai-analysis" element={<PageTransition><AIAnalysis /></PageTransition>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="fixed top-0 left-0 right-0 h-0.5 z-[9999] pointer-events-none"
           style={{
             background: 'linear-gradient(90deg, transparent 0%, #10b981 30%, #34d399 50%, #10b981 70%, transparent 100%)'
           }}
      />
      <div className="dot-grid" />
      {showSplash && <SplashScreen />}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: '!bg-surface-850 !text-gray-100 !border !border-surface-800 font-sans',
          style: {
            background: '#1A1D24', // surface-850 fallback
            color: '#F3F4F6', // text-gray-100
            border: '1px solid #2B303B' // border-surface-800
          },
          success: {
            iconTheme: {
              primary: '#34d399', // emerald-400
              secondary: '#1A1D24', // surface-850
            },
          },
        }}
      />
      <NotificationManager />
      <AppContent />
    </BrowserRouter>
  )
}

export default App
