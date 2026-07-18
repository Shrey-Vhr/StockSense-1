import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, BarChart2, LineChart, PieChart, Newspaper, BrainCircuit, LogOut, X, TrendingUp, Eye, CandlestickChart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Screener', path: '/screener', icon: BarChart2 },
    { name: 'Stock Detail', path: '/stock/RELIANCE.NS', icon: LineChart },
    { name: 'Indices', path: '/index/IDX-NSEI', icon: BarChart2 },
    { name: 'ETFs', path: '/etf/NIFTYBEES.NS', icon: TrendingUp },
    { name: 'Portfolio', path: '/portfolio', icon: PieChart },
    { name: 'News', path: '/news', icon: Newspaper },
    { name: 'Watchlist', path: '/watchlist', icon: Eye },
    { name: 'AI Analysis', path: '/ai-analysis', icon: BrainCircuit },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div className={`
        fixed top-0 left-0 h-full w-56 bg-surface-900/95 border-r border-surface-800 z-50
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:relative md:h-screen
      `}>
        {/* Logo Area */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-800">
          <div className="flex items-center gap-2.5 px-2 py-1">
            {/* The Icon Box */}
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30">
              <CandlestickChart className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            {/* The Text */}
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold text-white tracking-tight">StockSense</span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">AI Terminal</span>
            </div>
          </div>
          <button className="md:hidden text-gray-400 hover:text-white" onClick={toggleSidebar}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: 0.05 + i * 0.05 
              }}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) => `
                  group flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-150
                  ${isActive
                    ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)]'
                    : 'text-gray-400 hover:bg-surface-800 hover:text-gray-100'}
                `}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.15 }}
                >
                  <item.icon
                    size={19}
                    className="transition-transform duration-150 group-hover:scale-110"
                  />
                </motion.div>
                <span className="font-medium text-sm">{item.name}</span>
              </NavLink>
            </motion.div>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="p-3 border-t border-surface-800">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-2.5 w-full rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-150"
          >
            <LogOut size={19} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
