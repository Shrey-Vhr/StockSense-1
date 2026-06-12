import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import StockDetail from './pages/StockDetail'
import Screener from './pages/Screener'
import Portfolio from './pages/Portfolio'
import News from './pages/News'
import Watchlist from './pages/Watchlist'
import Login from './pages/Login'
import IndexDetail from './pages/IndexDetail'
import ETFDetail from './pages/ETFDetail'
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/Layout/ProtectedRoute'
import SplashScreen from './components/SplashScreen'
import { useState, useEffect } from 'react'
import { useNotifications } from "./hooks/useNotifications";

function NotificationManager() {
  useNotifications();
  return null;
}

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
      {showSplash && <SplashScreen />}
      <NotificationManager />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="stock/:symbol" element={<StockDetail />} />
            <Route path="index/:symbol" element={<IndexDetail />} />
            <Route path="etf/:symbol" element={<ETFDetail />} />
            <Route path="screener" element={<Screener />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="news" element={<News />} />
            <Route path="watchlist" element={<Watchlist />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
