import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from './CommandPalette';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // The mobile drawer used to stay open after tapping a nav item, leaving the
  // new page hidden behind the overlay until you dismissed it by hand.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <div className="flex h-screen bg-transparent text-gray-100 font-sans overflow-hidden relative z-10">
      {/* First tab stop on every page. The app had no way to skip the nav. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200]
                   focus:px-3 focus:py-2 focus:rounded-lg focus:bg-brand-500 focus:text-white
                   focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header toggleSidebar={toggleSidebar} onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent relative z-10 outline-none"
        >
          <Outlet />
        </main>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
};

export default Layout;
