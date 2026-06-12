import { create } from 'zustand';

const useStore = create((set) => ({
  // User state
  user: JSON.parse(localStorage.getItem('user')) || null,
  setUser: (user) => set({ user }),
  
  // Market Data Cache
  marketOverview: null,
  setMarketOverview: (data) => set({ marketOverview: data }),
  topGainers: [],
  setTopGainers: (data) => set({ topGainers: data }),
  topLosers: [],
  setTopLosers: (data) => set({ topLosers: data }),
  sectorPerformance: null,
  setSectorPerformance: (data) => set({ sectorPerformance: data }),
  
  // Screener Results
  screenerResults: [],
  screenerSummary: null,
  setScreenerData: (data) => set({ 
    screenerResults: data?.results || [], 
    screenerSummary: data?.summary || null 
  }),
  setScreenerResults: (results) => set({ screenerResults: results }),
  
  // Saved Screeners
  savedScreeners: [],
  setSavedScreeners: (list) => set({ savedScreeners: list }),
  
  // Portfolio Holdings
  portfolioHoldings: [],
  setPortfolioHoldings: (holdings) => set({ portfolioHoldings: holdings }),
  addHolding: (holding) => set((state) => ({ 
    portfolioHoldings: [...state.portfolioHoldings, holding] 
  })),
  removeHolding: (id) => set((state) => ({
    portfolioHoldings: state.portfolioHoldings.filter(h => h.id !== id)
  })),
  
  // News Cache
  marketNews: [],
  setMarketNews: (news) => set({ marketNews: news }),
  
  // Global Loading States
  isLoading: {
    dashboard: false,
    screener: false,
    portfolio: false,
    stockDetail: false
  },
  setLoading: (key, value) => set((state) => ({
    isLoading: { ...state.isLoading, [key]: value }
  }))
}));

export default useStore;
