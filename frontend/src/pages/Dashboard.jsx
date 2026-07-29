import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SlidersHorizontal, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import useStore from '../store/useStore';
import SectorHeatmap from '../components/Dashboard/SectorHeatmap';
import TrendingSection from '../components/Dashboard/TrendingSection';
import useCountUp from '../hooks/useCountUp';
import { DashboardSkeleton } from '../components/Skeleton';
import {
  Card, PageHeader, Badge, DeltaBadge, EmptyState,
  Table, TBody, Tr, Td,
} from '../components/ui';
import { cn } from '../lib/cn';
import { formatNumber, formatCurrency, formatChange, direction, displaySymbol } from '../lib/format';

const AnimatedPrice = ({ value }) => {
  const animated = useCountUp(value, 800, 2);
  return <>{formatNumber(animated)}</>;
};

const safeArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data);
  return [];
};

const INDEX_LABELS = {
  '^NSEI': 'Nifty 50',
  '^NSEBANK': 'Bank Nifty',
  '^BSESN': 'Sensex',
};

const QUICK_LINKS = [
  { symbol: '^NSEI', name: 'Nifty 50', type: 'index' },
  { symbol: '^NSEBANK', name: 'Bank Nifty', type: 'index' },
  { symbol: '^CNXIT', name: 'Nifty IT', type: 'index' },
  { symbol: 'NIFTYBEES.NS', name: 'Nifty BeES', type: 'etf' },
  { symbol: 'GOLDBEES.NS', name: 'Gold BeES', type: 'etf' },
  { symbol: 'MON100.NS', name: 'NASDAQ 100', type: 'etf' },
];

/** Gainers and losers share this exact column template so the two cards line
 *  up column-for-column. Previously each used flex-1 thirds, which drifted
 *  apart as soon as one side had a longer symbol. */
const MoversTable = ({ stocks, onSelect }) => (
  <Table>
    <TBody divided={false}>
      {stocks.map((stock) => {
        const price = stock.current_price ?? stock.price ?? stock.ltp ?? stock.last_price;
        return (
          <Tr key={stock.symbol} interactive onClick={() => onSelect(stock.symbol)}>
            <Td className="w-[42%] font-medium text-gray-100">{displaySymbol(stock.symbol)}</Td>
            <Td numeric className="w-[33%] text-gray-300">{formatCurrency(price)}</Td>
            <Td align="right" className="w-[25%]">
              <div className="flex justify-end">
                <DeltaBadge value={stock.change_percent} />
              </div>
            </Td>
          </Tr>
        );
      })}
    </TBody>
  </Table>
);

const Dashboard = () => {
  const {
    marketOverview, setMarketOverview,
    topGainers, setTopGainers,
    topLosers, setTopLosers,
    marketNews, setMarketNews,
    sectorPerformance, setSectorPerformance,
    isLoading, setLoading
  } = useStore();

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading('dashboard', true);
      try {
        const [overview, gainers, losers, news, sectors] = await Promise.all([
          api.get('/stocks/market-overview'),
          api.get('/stocks/top-gainers?n=10'),
          api.get('/stocks/top-losers?n=10'),
          api.get('/news/market?limit=5'),
          api.get('/stocks/sector-performance')
        ]);

        if (overview.data) setMarketOverview(overview.data);
        if (gainers.data) setTopGainers(gainers.data);
        if (losers.data) setTopLosers(losers.data);
        if (news.data?.articles) setMarketNews(news.data.articles);
        if (sectors.data) setSectorPerformance(sectors.data);

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading('dashboard', false);
      }
    };

    // Fetch if we don't have data, or if it's explicitly requested
    if (!marketOverview) {
      fetchDashboardData();
    }
  }, []);

  useEffect(() => {
    const fetchSectorData = async () => {
      try {
        const res = await api.get('/stocks/sector-performance');
        if (res.data) setSectorPerformance(res.data);
      } catch (error) {
        console.error("Sector fetch error:", error);
      }
    };

    const fetchOverview = async () => {
      try {
        const overview = await api.get('/stocks/market-overview');
        if (overview.data) setMarketOverview(overview.data);
      } catch (error) {
        console.error("Overview fetch error:", error);
      }
    };

    const fetchMovers = async () => {
      try {
        const [gainers, losers] = await Promise.all([
          api.get('/stocks/top-gainers?n=10'),
          api.get('/stocks/top-losers?n=10')
        ]);
        if (gainers.data) setTopGainers(gainers.data);
        if (losers.data) setTopLosers(losers.data);
      } catch (error) {
        console.error("Movers fetch error:", error);
      }
    };

    // Auto-refresh sector data every 5 minutes
    const sectorInterval = setInterval(() => {
      fetchSectorData();
    }, 5 * 60 * 1000); // 300000

    // Auto-refresh market overview every 15 seconds
    const overviewInterval = setInterval(() => {
      fetchOverview();
    }, 15000);

    // Auto-refresh gainers/losers every 60 seconds
    const moversInterval = setInterval(() => {
      fetchMovers();
    }, 60000);

    return () => {
      clearInterval(sectorInterval);
      clearInterval(overviewInterval);
      clearInterval(moversInterval);
    };
  }, []);

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Recent';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Recent';
    }
  };

  if (isLoading.dashboard && !marketOverview) {
    return <DashboardSkeleton />;
  }

  const indices = safeArray(marketOverview).slice(0, 3);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5 relative z-10">
      <PageHeader title="Market Overview" />

      {/* ── Index strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {indices.map((idx) => {
          const price = idx.current_price ?? idx.price ?? 0;
          const change = idx.change ?? (price - price / (1 + (idx.change_percent ?? 0) / 100));
          const dir = direction(idx.change_percent);
          // Deliberately not clickable: these were static in the original, and
          // making them navigate would be adding behaviour, not restyling. The
          // Indices & ETFs table below already routes to the same pages.
          return (
            <Card key={idx.symbol} padding="md">
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
                  {INDEX_LABELS[idx.symbol] || idx.name || idx.symbol}
                </span>
                <DeltaBadge value={idx.change_percent} />
              </div>
              <div className="mt-2 text-2xl font-semibold text-gray-100 tracking-tight tnum">
                <AnimatedPrice value={price} />
              </div>
              <div className={cn(
                'mt-1 text-xs font-medium tnum',
                dir === 'up' ? 'text-up' : dir === 'down' ? 'text-down' : 'text-flat',
              )}>
                {formatChange(change)}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 space-y-5">
          <TrendingSection />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card title="Top Gainers" padding="none" bodyClassName="px-1 pb-1">
              {safeArray(topGainers).length > 0
                ? <MoversTable stocks={safeArray(topGainers)} onSelect={(s) => navigate(`/stock/${s}`)} />
                : <EmptyState size="sm" title="No gainers yet" description="Market movers appear once trading data is available." />}
            </Card>

            <Card title="Top Losers" padding="none" bodyClassName="px-1 pb-1">
              {safeArray(topLosers).length > 0
                ? <MoversTable stocks={safeArray(topLosers)} onSelect={(s) => navigate(`/stock/${s}`)} />
                : <EmptyState size="sm" title="No losers yet" description="Market movers appear once trading data is available." />}
            </Card>
          </div>

          <Card title="Indices & ETFs" padding="none" bodyClassName="px-1 pb-1">
            <Table>
              <TBody divided={false}>
                {QUICK_LINKS.map((item) => {
                  const data = safeArray(marketOverview).find(m => m.symbol === item.symbol);
                  const price = data?.current_price ?? data?.price;
                  const change = data?.change_percent;
                  return (
                    <Tr
                      key={item.symbol}
                      interactive
                      onClick={() => navigate(
                        item.type === 'index'
                          ? `/index/${item.symbol.replace('^', 'IDX-')}`
                          : `/etf/${item.symbol}`
                      )}
                    >
                      <Td className="w-[45%]">
                        <span className="font-medium text-gray-200">{item.name}</span>
                        <Badge variant="neutral" className="ml-2 uppercase">
                          {item.type}
                        </Badge>
                      </Td>
                      <Td numeric className="w-[30%] text-gray-300">
                        {price !== undefined ? formatCurrency(price) : '—'}
                      </Td>
                      <Td align="right" className="w-[25%]">
                        <div className="flex justify-end">
                          {change !== undefined
                            ? <DeltaBadge value={change} />
                            : <span className="text-xs text-gray-600">—</span>}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </Card>

          <Card title="Sector Performance" subtitle="Click a sector to screen it">
            <SectorHeatmap sectors={sectorPerformance} isLoading={isLoading.dashboard} />
          </Card>
        </div>

        {/* ── Right rail ────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-5">
          <Card title="Market News" padding="none" bodyClassName="px-4 pb-4">
            {safeArray(marketNews).length === 0 ? (
              <EmptyState size="sm" title="No news yet" description="Market headlines will appear here." />
            ) : (
              <ul className="divide-y divide-surface-800">
                {safeArray(marketNews).map((news, i) => {
                  // The API is inconsistent about sentiment casing ("POSITIVE"
                  // on some responses, "Positive" on others).
                  const sentiment = (news.sentiment || '').toUpperCase();
                  const variant = sentiment === 'POSITIVE' ? 'up'
                    : sentiment === 'NEGATIVE' ? 'down'
                    : sentiment === 'NEUTRAL' ? 'neutral' : null;
                  const short = sentiment === 'POSITIVE' ? 'POS'
                    : sentiment === 'NEGATIVE' ? 'NEG' : 'NEU';
                  return (
                    <li key={i} className="py-3 first:pt-0 last:pb-0">
                      <a
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block"
                      >
                        <div className="flex items-start gap-2">
                          {variant && <Badge variant={variant} className="mt-0.5 shrink-0">{short}</Badge>}
                          <h3 className="text-sm text-gray-300 leading-snug transition-colors duration-fast group-hover:text-brand-400">
                            {news.title}
                          </h3>
                        </div>
                        <div className="text-2xs text-gray-600 mt-1.5">
                          {news.source} · {news.published_display || formatDate(news.published_date)}
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Deliberately not a Card: this is a call to action, and when it
              looked like every other panel it read as data. */}
          <Link
            to="/screener"
            className="block rounded-xl border border-brand-500/30 bg-brand-500/[0.07] p-5
                       transition-colors duration-fast hover:border-brand-500/50 hover:bg-brand-500/10"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500/15 text-brand-400">
                <SlidersHorizontal size={16} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-gray-100">Build your own screen</span>
            </div>
            <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
              Filter 2,100+ NSE stocks across 35+ technical and fundamental indicators.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-brand-400">
              Launch screener
              <ArrowRight size={13} aria-hidden="true" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
