import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CandlestickChart, Eye, EyeOff, TrendingUp, Shield, Zap, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button, Field, Input } from '../components/ui';
import { fadeInUp, stagger, listItem } from '../lib/motion';

/**
 * Sign-up.
 *
 * `useAuth.register()` and POST /auth/register already existed and worked —
 * Login's "Sign up for free" link pointed at /register, which had no route, so
 * it fell through the catch-all straight back to Login. This is the missing
 * page, not new backend behaviour: it calls the existing hook, which registers
 * and then logs in exactly as it always did.
 *
 * Deliberately mirrors Login's layout so the two read as one flow.
 */

const FEATURES = [
  { icon: TrendingUp, text: '2,100+ NSE stocks screened in real time' },
  { icon: Shield, text: '16 chart patterns detected automatically' },
  { icon: Zap, text: 'AI news sentiment via Groq' },
];

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  // Checked here rather than server-side because the API takes a single
  // password field — there is nothing to compare against on the backend.
  const mismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    // Mirrors the backend rule in routers/auth.py so the user hears it before
    // a round trip.
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ok = await register(name, email, password);
      if (ok) {
        navigate('/');
      } else {
        // register() resolves false and stores the reason on the auth store.
        setError(useAuth.getState().error || 'Registration failed');
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Registration failed'
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
            Start trading
            <br />
            with an edge
          </motion.h1>

          <motion.p variants={listItem} className="text-sm text-gray-400 leading-relaxed mb-8 max-w-sm">
            Create an account to save watchlists, track a portfolio and run
            the screener across the Indian market.
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

        <div className="relative z-10 text-2xs text-gray-500">
          Free while StockSense is in development.
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────────────────── */}
      <main className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative">
        <div className="absolute w-96 h-96 bg-brand-500/[0.05] rounded-full blur-3xl pointer-events-none" />

        <motion.div
          className="w-full max-w-sm relative z-10"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-500">
              <CandlestickChart size={19} className="text-white" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <span className="text-base font-semibold text-gray-100">StockSense</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-semibold text-gray-50 tracking-tight">Create your account</h2>
            <p className="text-sm text-gray-500 mt-1.5">Takes less than a minute</p>
          </div>

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
            <Field label="Full name" required>
              {(p) => (
                <Input
                  size="lg"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  {...p}
                />
              )}
            </Field>

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
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
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

            <Field
              label="Confirm password"
              required
              error={mismatch ? 'Passwords do not match' : undefined}
            >
              {(p) => (
                <Input
                  size="lg"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  {...p}
                />
              )}
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading || mismatch}
              className="w-full mt-1"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-brand-400 transition-colors duration-fast hover:text-brand-300"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Register;
