import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, SlidersHorizontal, LineChart, PieChart, Newspaper,
  BrainCircuit, LogOut, X, TrendingUp, Eye, CandlestickChart, Activity,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/cn';
import { stagger, listItem } from '../../lib/motion';
import Button from '../ui/Button';

/**
 * Nine flat nav items with no grouping made the rail read as one undifferentiated
 * list. They fall naturally into three jobs, so they are labelled as such.
 *
 * Paths are unchanged, including the three that deep-link to a specific symbol
 * (RELIANCE.NS, IDX-NSEI, NIFTYBEES.NS) — those are entry points into the
 * detail pages and changing them would change behaviour.
 */
const NAV_GROUPS = [
  {
    label: 'Markets',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },
      { name: 'Indices', path: '/index/IDX-NSEI', icon: Activity },
      { name: 'ETFs', path: '/etf/NIFTYBEES.NS', icon: TrendingUp },
      { name: 'News', path: '/news', icon: Newspaper },
    ],
  },
  {
    label: 'Research',
    items: [
      { name: 'Screener', path: '/screener', icon: SlidersHorizontal },
      { name: 'Stock Detail', path: '/stock/RELIANCE.NS', icon: LineChart },
      { name: 'AI Analysis', path: '/ai-analysis', icon: BrainCircuit },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { name: 'Holdings', path: '/portfolio', icon: PieChart },
      { name: 'Watchlist', path: '/watchlist', icon: Eye },
    ],
  },
];

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Main navigation"
        className={cn(
          'fixed top-0 left-0 h-full w-60 z-50 flex flex-col',
          'bg-surface-900 border-r border-surface-800',
          'transform transition-transform duration-slow ease-out-expo',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'md:relative md:h-screen',
        )}
      >
        {/* ── Brand ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-surface-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 shrink-0">
              <CandlestickChart className="w-4.5 h-4.5 text-white" strokeWidth={2.25} size={18} />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-sm font-semibold text-gray-100 tracking-tight">StockSense</span>
              <span className="text-2xs font-medium text-gray-500 uppercase tracking-widest mt-1">
                AI Terminal
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon={X}
            aria-label="Close navigation"
            onClick={toggleSidebar}
            className="md:hidden -mr-1"
          />
        </div>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <motion.nav
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="flex-1 overflow-y-auto py-4 px-3 space-y-5"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-0.5">
              <p className="px-3 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-gray-500">
                {group.label}
              </p>
              {group.items.map((item) => (
                <motion.div key={item.name} variants={listItem}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'relative group flex items-center gap-3 px-3 py-2 rounded-lg',
                        'text-sm font-medium transition-colors duration-fast',
                        isActive
                          // Brand indigo, not green. An active nav item is chrome,
                          // not a market signal.
                          ? 'bg-brand-500/12 text-brand-400'
                          : 'text-gray-400 hover:bg-surface-800 hover:text-gray-100',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-400"
                            aria-hidden="true"
                          />
                        )}
                        <item.icon size={17} aria-hidden="true" className="shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                </motion.div>
              ))}
            </div>
          ))}
        </motion.nav>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="p-3 border-t border-surface-800 shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium
                       text-gray-400 transition-colors duration-fast
                       hover:bg-down/10 hover:text-down"
          >
            <LogOut size={17} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
