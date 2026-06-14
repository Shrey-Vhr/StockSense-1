import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LineChart, Eye, EyeOff, TrendingUp, 
         Shield, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'Invalid credentials'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 
                    flex">
      
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 
                      bg-surface-900 border-r 
                      border-surface-800 flex-col 
                      justify-between p-12 
                      relative overflow-hidden">
        
        {/* Background gradient orbs */}
        <div className="absolute top-0 left-0 
                        w-96 h-96 
                        bg-emerald-500/5 
                        rounded-full blur-3xl 
                        -translate-x-1/2 
                        -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 
                        w-96 h-96 
                        bg-emerald-500/5 
                        rounded-full blur-3xl 
                        translate-x-1/2 
                        translate-y-1/2" />
        
        {/* Logo */}
        <div className="flex items-center gap-3 
                        relative z-10">
          <div className="w-10 h-10 rounded-xl 
                          bg-gradient-to-br 
                          from-emerald-400 
                          to-emerald-600 
                          flex items-center 
                          justify-center 
                          shadow-glow">
            <LineChart className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold 
                           text-gray-100 
                           tracking-tight">
            StockSense
          </span>
        </div>

        {/* Main copy */}
        <motion.div 
          className="relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h1 className="text-4xl font-bold 
                         text-gray-50 
                         leading-tight mb-4">
            Intelligent Stock
            <br />
            <span className="bg-clip-text 
                             text-transparent 
                             bg-gradient-to-r 
                             from-emerald-300 
                             to-emerald-500">
              Analysis for India
            </span>
          </h1>
          <p className="text-gray-400 text-base 
                        leading-relaxed mb-10">
            AI-powered insights, real-time data, 
            and institutional-grade analysis 
            for the Indian stock market.
          </p>
          
          {/* Feature pills */}
          <div className="space-y-3">
            {[
              { 
                icon: TrendingUp, 
                text: '469 NSE stocks screened in real-time'
              },
              { 
                icon: Shield, 
                text: 'Pattern detection across 16 chart patterns'
              },
              { 
                icon: Zap, 
                text: 'AI-powered news sentiment analysis'
              },
            ].map((f, i) => (
              <motion.div key={i} 
                   className="flex items-center 
                              gap-3"
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ 
                     duration: 0.4, 
                     delay: 0.4 + i * 0.1 
                   }}
              >
                <div className="w-8 h-8 rounded-lg 
                                bg-emerald-500/10 
                                border 
                                border-emerald-500/20 
                                flex items-center 
                                justify-center 
                                flex-shrink-0">
                  <f.icon size={16} 
                          className="text-emerald-400" />
                </div>
                <span className="text-gray-400 
                                 text-sm">
                  {f.text}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom stats */}
        <div className="grid grid-cols-3 gap-4 
                        relative z-10">
          {[
            { value: '469+', label: 'Stocks' },
            { value: '35+', label: 'Indicators' },
            { value: '16', label: 'Patterns' },
          ].map((s, i) => (
            <motion.div key={i} 
                 className="bg-surface-850 border 
                            border-surface-800 
                            rounded-xl p-3 
                            text-center"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ 
                   duration: 0.4, 
                   delay: 0.6 + i * 0.1 
                 }}
            >
              <div className="text-xl font-bold 
                              text-emerald-400 
                              font-mono">
                {s.value}
              </div>
              <div className="text-gray-600 
                              text-xs mt-0.5">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full lg:w-1/2 flex 
                      items-center justify-center 
                      p-8">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          
          {/* Mobile logo */}
          <div className="flex items-center 
                          gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl 
                            bg-gradient-to-br 
                            from-emerald-400 
                            to-emerald-600 
                            flex items-center 
                            justify-center">
              <LineChart className="text-white 
                                   w-5 h-5" />
            </div>
            <span className="text-lg font-bold 
                             text-gray-100">
              StockSense
            </span>
          </div>

          {/* Form header */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold 
                           text-gray-50">
              Welcome back
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Sign in to your StockSense account
            </p>
          </motion.div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border 
                            border-red-500/30 
                            rounded-xl p-3 mb-5">
              <p className="text-red-400 text-sm">
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} 
                className="space-y-4">
            <div>
              <label className="text-gray-400 
                                text-sm 
                                font-medium 
                                mb-1.5 block">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full bg-surface-850 
                           border border-surface-800 
                           rounded-xl px-4 py-3 
                           text-gray-100 text-sm 
                           focus:border-emerald-500/50 
                           focus:ring-1 
                           focus:ring-emerald-500/20 
                           focus:outline-none 
                           transition-all 
                           placeholder-gray-600"
              />
            </div>

            <div>
              <label className="text-gray-400 
                                text-sm 
                                font-medium 
                                mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-surface-850 
                             border border-surface-800 
                             rounded-xl px-4 py-3 
                             text-gray-100 text-sm 
                             focus:border-emerald-500/50 
                             focus:ring-1 
                             focus:ring-emerald-500/20 
                             focus:outline-none 
                             transition-all 
                             placeholder-gray-600 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 
                             -translate-y-1/2 
                             text-gray-500 
                             hover:text-gray-300 
                             transition-colors p-1"
                >
                  {showPassword 
                    ? <EyeOff size={16} /> 
                    : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center 
                            justify-between">
              <label className="flex items-center 
                                gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="accent-emerald-500 
                             w-4 h-4 rounded" 
                />
                <span className="text-gray-400 
                                 text-sm">
                  Remember me
                </span>
              </label>
              <a href="#" 
                 className="text-emerald-400 
                            hover:text-emerald-300 
                            text-sm transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 
                         hover:bg-emerald-600 
                         disabled:opacity-50 
                         disabled:cursor-not-allowed
                         text-white font-semibold 
                         py-3 rounded-xl 
                         transition-colors text-sm 
                         shadow-glow mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-500 
                        text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" 
                  className="text-emerald-400 
                             hover:text-emerald-300 
                             font-medium 
                             transition-colors">
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
