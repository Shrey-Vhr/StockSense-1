import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import { Activity, BookOpen, BrainCircuit, Newspaper, TrendingUp, TrendingDown, Target, ShieldAlert, AlertTriangle, BellPlus, X } from 'lucide-react';
import api from '../utils/api';
import useStore from '../store/useStore';

const StockDetail = () => {
  const { symbol } = useParams();
  const cleanSymbol = symbol ? symbol.toUpperCase() : 'RELIANCE.NS';
  const { setLoading } = useStore();
  
  const [activeTab, setActiveTab] = useState('technical');
  const [quote, setQuote] = useState(null);
  const [quoteFlash, setQuoteFlash] = useState('');
  const [techData, setTechData] = useState(null);
  const [fundData, setFundData] = useState(null);
  const [news, setNews] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [isFundLoading, setIsFundLoading] = useState(false);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertType, setAlertType] = useState('price_above');
  const [alertValue, setAlertValue] = useState('');
  
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    // Reset state on symbol change
    setQuote(null); setTechData(null); setFundData(null); setNews([]); setAiAnalysis(null); setErrorMsg(null);
    setActiveTab('technical');
    fetchInitialData();
    
    // WebSocket Connection
    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'price_update') {
          const update = payload.data.find(i => i.symbol === cleanSymbol);
          if (update) {
            setQuote(prev => {
              if (!prev || prev.current_price === update.price) return prev;
              const flashClass = update.price > prev.current_price ? 'bg-[#00c853]/20' : 'bg-[#ff1744]/20';
              setQuoteFlash(flashClass);
              setTimeout(() => setQuoteFlash(''), 500);
              return { ...prev, current_price: update.price, change_percent: update.change_percent };
            });
          }
        }
      } catch (e) {}
    };
    
return () => ws.close();
  }, [cleanSymbol]);

  const fetchInitialData = async () => {
    try {
      const [qRes, tRes] = await Promise.all([
        api.get(`/stocks/quote/${cleanSymbol}`),
        api.get(`/analysis/technical/${cleanSymbol}`)
      ]);
      setQuote(qRes.data);
</></div>);};