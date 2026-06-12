import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isLoading, error, isAuthenticated, clearError } = useAuth();
  
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
    // Clear error when switching modes
    clearError();
  }, [isAuthenticated, navigate, from, isLogin, clearError]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      await login(formData.email, formData.password);
    } else {
      await register(formData.name, formData.email, formData.password);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-950 text-gray-100 font-sans">
      {/* Left side - Decorative branding area */}
      <div className="hidden md:flex flex-col justify-between w-1/2 p-12 bg-gray-900 border-r border-gray-800 relative overflow-hidden">
        {/* Subtle decorative chart-like abstract lines in the background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg viewBox="0 0 800 800" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 600 L150 450 L300 500 L450 300 L600 350 L800 150" fill="none" stroke="url(#orange-grad)" strokeWidth="4" />
            <path d="M0 700 L200 550 L350 650 L550 400 L700 480 L800 250" fill="none" stroke="url(#gold-grad)" strokeWidth="2" opacity="0.6"/>
            <defs>
              <linearGradient id="orange-grad" x1="0" y1="0" x2="800" y2="0">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="gold-grad" x1="0" y1="0" x2="800" y2="0">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        <div className="z-10 mt-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-500 tracking-tight">
              StockSense
            </h1>
          </div>
          <h2 className="text-4xl font-extrabold leading-tight text-white mb-6">
            Master the Indian<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Stock Market
            </span>
          </h2>
          <p className="text-gray-400 max-w-md text-lg">
            Advanced analytics, real-time insights, and intelligent portfolio tracking designed for the modern investor.
          </p>
        </div>

        <div className="z-10">
          <p className="text-sm text-gray-500 font-medium">
            &copy; {new Date().getFullYear()} StockSense. Elevate your edge.
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 md:p-16 relative">
        {/* Mobile Logo */}
        <div className="md:hidden flex items-center space-x-2 mb-10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <TrendingUp className="text-white w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-white">StockSense</h1>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 transition-all duration-300">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-gray-400">
              {isLogin ? 'Enter your details to access your dashboard.' : 'Sign up to start tracking your investments.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg flex items-start space-x-3 animate-pulse text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Rahul Sharma"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg outline-none text-white placeholder-gray-600 transition-all"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg outline-none text-white placeholder-gray-600 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg outline-none text-white placeholder-gray-600 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input type="checkbox" className="rounded border-gray-700 bg-gray-900 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-950 w-4 h-4 cursor-pointer" />
                  <span className="text-gray-400 group-hover:text-gray-300 transition-colors">Remember me</span>
                </label>
                <a href="#" className="text-orange-500 hover:text-orange-400 font-medium transition-colors">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-lg shadow-lg shadow-orange-500/20 transform transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-orange-500 hover:text-orange-400 font-bold transition-colors ml-1"
            >
              {isLogin ? 'Sign up for free' : 'Log in here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
