import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, TrendingUp, AlertCircle, Loader2, LineChart } from 'lucide-react';

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
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="bg-surface-850 border border-surface-800 rounded-2xl p-8 w-full max-w-md shadow-card">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <LineChart className="text-white w-6 h-6"/>
          </div>
          <h1 className="text-2xl font-bold text-gray-100">StockSense</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
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
                <label className="text-gray-400 text-sm font-medium mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Rahul Sharma"
                  className="w-full bg-surface-900 border border-surface-800 rounded-xl px-4 py-3 text-gray-100 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder-gray-600"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-gray-400 text-sm font-medium mb-1.5 block">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="name@example.com"
                className="w-full bg-surface-900 border border-surface-800 rounded-xl px-4 py-3 text-gray-100 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder-gray-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-400 text-sm font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  className="w-full bg-surface-900 border border-surface-800 rounded-xl px-4 py-3 text-gray-100 text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder-gray-600 pr-12"
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
                  <input type="checkbox" className="rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-950 w-4 h-4 cursor-pointer" />
                  <span className="text-gray-400 group-hover:text-gray-300 transition-colors">Remember me</span>
                </label>
                <a href="#" className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-glow flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
              className="text-emerald-400 hover:text-emerald-300 transition-colors ml-1"
            >
              {isLogin ? 'Sign up for free' : 'Log in here'}
            </button>
          </div>
      </div>
    </div>
  );
};

export default Login;
