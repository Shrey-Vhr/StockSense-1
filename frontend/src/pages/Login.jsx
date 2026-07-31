import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CandlestickChart, Eye, EyeOff, TrendingUp, Shield, Zap, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button, Field, Input } from '../components/ui';
import { fadeInUp, stagger, listItem } from '../lib/motion';

const FEATURES = [
  { icon: TrendingUp, text: '2,100+ NSE stocks screened in real time' },
  { icon: Shield, text: '16 chart patterns detected automatically' },
  { icon: Zap, text: 'AI news sentiment via Groq' },
];

const STATS = [
  { value: '2,100+', label: 'Stocks' },
  { value: '35+', label: 'Indicators' },
  { value: '16', label: 'Patterns' },
];

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
    <div className="min-h-screen bg-surface-950 flex overflow-hidden">

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden
                      bg-surface-900 border-r border-surface-800">

        {/* Ambient orbs. Retuned from emerald to brand: on the one page where
            no market data exists, a green wash still set the wrong expectation
            for what green means everywhere else in the app. */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-3xl
                     bg-brand-500/[0.10] -top-32 -left-32 pointer-events-none"
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full blur-3xl
                     bg-brand-500/[0.07] bottom-0 right-0 pointer-events-none"
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgb(var(--brand-500) / 0.05) 1px, transparent 1px),
                              linear-gradient(90deg, rgb(var(--brand-500) / 0.05) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Brand */}
        <motion.div
          className="flex items-center gap-2.5 relative z-10"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-500">
            <CandlestickChart size={19} className="text-white" strokeWidth={2.25} aria-hidden="true" />
          </div>
          <span className="text-base font-semibold text-gray-100 tracking-tight">StockSense</span>
        </motion.div>

        {/* Copy */}
        <motion.div
          className="relative z-10"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            variants={listItem}
            className="text-4xl font-semibold text-gray-50 leading-[1.15] tracking-tight mb-4"
          >
            Intelligent stock
            <br />
            analysis for India
          </motion.h1>

          <motion.p variants={listItem} className="text-sm text-gray-400 leading-relaxed mb-8 max-w-sm">
            Screening, live market data and AI-backed trade setups for the
            Indian market — in one terminal.
          </motion.p>

          <div className="space-y-2.5">
            {FEATURES.map((f) => (
              <motion.div key={f.text} variants={listItem} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 shrink-0 rounded-lg
                                 bg-brand-500/12 border border-brand-500/20">
                  <f.icon size={13} className="text-brand-400" aria-hidden="true" />
                </span>
                <span className="text-sm text-gray-400">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-3 relative z-10"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={listItem}
              className="rounded-xl p-3 text-center bg-surface-850/80 backdrop-blur-sm border border-surface-800"
            >
              <div className="text-lg font-semibold text-gray-100 font-mono tnum">{s.value}</div>
              <div className="text-2xs uppercase tracking-wider text-gray-600 mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Right panel — form ──────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative">
        <div className="absolute w-96 h-96 bg-brand-500/[0.05] rounded-full blur-3xl pointer-events-none" />

        <motion.div
          className="w-full max-w-sm relative z-10"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-500">
              <CandlestickChart size={19} className="text-white" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <span className="text-base font-semibold text-gray-100">StockSense</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-semibold text-gray-50 tracking-tight">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1.5">Sign in to your StockSense account</p>
          </div>

          {/* aria-live so the failure is announced, not just shown. */}
          <div aria-live="polite">
            <AnimatePresence>
              {error && (
                <motion.div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-down/30 bg-down/10 px-3 py-2.5 mb-5"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-down" aria-hidden="true" />
                  <p className="text-sm text-down">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email address" required>
              {(p) => (
                <Input
                  size="lg"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  {...p}
                />
              )}
            </Field>

            <Field label="Password" required>
              {(p) => (
                <div className="relative">
                  <Input
                    size="lg"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="pr-11"
                    {...p}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-md
                               text-gray-500 transition-colors duration-fast hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              )}
            </Field>

            {/* Both of these are inert in the current build: the checkbox has
                no state or handler, and the link points at "#". Kept and
                restyled rather than removed — wiring them up would be new
                behaviour, and removing them is a product call, not mine.
                Flagged for you to decide. */}
            <div className="flex items-center justify-between pt-0.5">
              <label htmlFor="login-remember" className="flex items-center gap-2 cursor-pointer">
                <input
                  id="login-remember"
                  type="checkbox"
                  className="w-4 h-4 rounded accent-brand-500"
                />
                <span className="text-sm text-gray-400">Remember me</span>
              </label>
              <a
                href="#"
                className="text-sm text-brand-400 transition-colors duration-fast hover:text-brand-300"
              >
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading}
              className="w-full mt-1"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-brand-400 transition-colors duration-fast hover:text-brand-300"
            >
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
