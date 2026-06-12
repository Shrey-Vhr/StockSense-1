import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, LineChart, PieChart, Newspaper, BrainCircuit, LogOut, Menu, X, TrendingUp, Eye } from 'lucide-react';
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
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-[#0d1117] border-r border-[#30363d] z-50
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:relative md:h-screen
      `}>
        {/* Logo Area */}
        <div className="flex items-center justify-between p-6 border-b border-[#30363d]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#f0b429] to-amber-600 flex items-center justify-center">
              <LineChart className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#f0b429] to-amber-500">
              StockSense
            </span>
          </div>
          <button className="md:hidden text-gray-400 hover:text-white" onClick={toggleSidebar}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-[#161b22] text-[#f0b429] border border-[#30363d]' 
                  : 'text-gray-400 hover:bg-[#161b22] hover:text-white'}
              `}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#30363d]">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-gray-400 hover:bg-[#161b22] hover:text-[#ff1744] transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
