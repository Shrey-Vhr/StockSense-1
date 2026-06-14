import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Eye, EyeOff, 
         TrendingUp, Shield, Zap 
       } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';


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
                    flex overflow-hidden">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 
                      flex-col justify-between 
                      p-12 relative overflow-hidden
                      bg-surface-900 border-r 
                      border-surface-800">

        {/* Animated background orbs */}
        <motion.div
          className="absolute w-[500px] h-[500px] 
                     rounded-full blur-3xl 
                     bg-emerald-500/8 
                     -top-32 -left-32 
                     pointer-events-none"
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] 
                     rounded-full blur-3xl 
                     bg-emerald-500/5 
                     bottom-0 right-0 
                     pointer-events-none"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1
          }}
        />

        {/* Grid background */}
        <div className="absolute inset-0 
                        pointer-events-none"
             style={{
               backgroundImage: `
                 linear-gradient(
                   rgba(16,185,129,0.03) 1px, 
                   transparent 1px
                 ),
                 linear-gradient(
                   90deg, 
                   rgba(16,185,129,0.03) 1px, 
                   transparent 1px
                 )`,
               backgroundSize: '40px 40px'
             }}
        />



        {/* Logo */}
        <motion.div
          className="flex items-center gap-3 
                     relative z-10"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-10 h-10 rounded-xl 
                          bg-gradient-to-br 
                          from-emerald-400 
                          to-emerald-600 
                          flex items-center 
                          justify-center 
                          shadow-glow">
            <LineChart className="text-white 
                                  w-5 h-5" />
          </div>
          <span className="text-xl font-bold 
                           text-gray-100 
                           tracking-tight">
            StockSense
          </span>
        </motion.div>

        {/* Main copy */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h1 className="text-5xl font-bold 
                         text-gray-50 
                         leading-tight mb-4">
            Intelligent
            <br />
            <span className="bg-clip-text 
                             text-transparent 
                             bg-gradient-to-r 
                             from-emerald-300 
                             via-emerald-400
                             to-emerald-600">
              Stock Analysis
            </span>
            <br />
            for India
          </h1>
          <p className="text-gray-400 text-base 
                        leading-relaxed mb-8 
                        max-w-sm">
            AI-powered insights, real-time data, 
            and institutional-grade analysis 
            for the Indian stock market.
          </p>



          {/* Feature pills */}
          <div className="space-y-3">
            {[
              { icon: TrendingUp, 
                text: '469 NSE stocks screened in real-time' },
              { icon: Shield, 
                text: '16 chart patterns detected automatically' },
              { icon: Zap, 
                text: 'AI news sentiment via Groq LLM' },
            ].map((f, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  duration: 0.4, 
                  delay: 0.5 + i * 0.1 
                }}
              >
                <div className="w-7 h-7 rounded-lg 
                                bg-emerald-500/10 
                                border 
                                border-emerald-500/20 
                                flex items-center 
                                justify-center 
                                flex-shrink-0">
                  <f.icon size={14} 
                          className="text-emerald-400"/>
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
        <div className="grid grid-cols-3 gap-3 
                        relative z-10">
          {[
            { value: '469+', label: 'Stocks' },
            { value: '35+', label: 'Indicators' },
            { value: '16', label: 'Patterns' },
          ].map((s, i) => (
            <motion.div
              key={i}
              className="bg-surface-850/80 
                         backdrop-blur-sm border 
                         border-surface-800 
                         rounded-xl p-3 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.4, 
                delay: 0.7 + i * 0.1 
              }}
              whileHover={{ 
                borderColor: 'rgba(16,185,129,0.3)',
                y: -2
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

      {/* RIGHT PANEL — Form */}
      <div className="w-full lg:w-1/2 flex 
                      items-center justify-center 
                      p-8 relative">

        {/* Subtle glow behind form */}
        <div className="absolute w-96 h-96 
                        bg-emerald-500/5 
                        rounded-full blur-3xl 
                        pointer-events-none" />

        <motion.div
          className="w-full max-w-md relative z-10"
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
            <h2 className="text-3xl font-bold 
                           text-gray-50">
              Welcome back
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Sign in to your StockSense account
            </p>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="bg-red-500/10 border 
                           border-red-500/30 
                           rounded-xl p-3 mb-5"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <p className="text-red-400 text-sm">
                  {error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div>
              <label className="text-gray-400 
                                text-sm font-medium 
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
                           rounded-xl px-4 py-3.5 
                           text-gray-100 text-sm 
                           focus:border-emerald-500/60 
                           focus:ring-2 
                           focus:ring-emerald-500/10 
                           focus:outline-none 
                           transition-all 
                           placeholder-gray-600"
              />
            </div>

            <div>
              <label className="text-gray-400 
                                text-sm font-medium 
                                mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(
                    e.target.value
                  )}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-surface-850 
                             border border-surface-800 
                             rounded-xl px-4 py-3.5 
                             text-gray-100 text-sm 
                             focus:border-emerald-500/60 
                             focus:ring-2 
                             focus:ring-emerald-500/10 
                             focus:outline-none 
                             transition-all 
                             placeholder-gray-600 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(
                    !showPassword
                  )}
                  className="absolute right-3 
                             top-1/2 -translate-y-1/2 
                             text-gray-500 
                             hover:text-gray-300 
                             transition-colors p-1"
                >
                  {showPassword 
                    ? <EyeOff size={16}/> 
                    : <Eye size={16}/>}
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
                             w-4 h-4"
                />
                <span className="text-gray-400 text-sm">
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

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 
                         hover:bg-emerald-600 
                         disabled:opacity-50 
                         disabled:cursor-not-allowed 
                         text-white font-semibold 
                         py-3.5 rounded-xl 
                         transition-colors text-sm 
                         shadow-glow mt-2 
                         relative overflow-hidden"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Shimmer effect on button */}
              <motion.div
                className="absolute inset-0 
                           bg-gradient-to-r 
                           from-transparent 
                           via-white/10 
                           to-transparent 
                           -skew-x-12"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity,
                  repeatDelay: 1.5
                }}
              />
              <span className="relative z-10">
                {loading ? (
                  <span className="flex items-center 
                                   justify-center gap-2">
                    <motion.div
                      className="w-4 h-4 border-2 
                                 border-white/30 
                                 border-t-white 
                                 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ 
                        duration: 0.8, 
                        repeat: Infinity,
                        ease: 'linear'
                      }}
                    />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </span>
            </motion.button>
          </motion.form>

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
