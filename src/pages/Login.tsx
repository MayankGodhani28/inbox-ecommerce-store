import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { BrandLogo } from '../components/common/BrandLogo';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Truck,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

interface LoginProps {
  onNavigate: (tab: string, param?: string) => void;
  redirectTarget?: string;
}

export const Login: React.FC<LoginProps> = ({ onNavigate, redirectTarget }) => {
  const { login, register } = useAuth();
  const { t } = useTranslation();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Resolve human-friendly redirect notice
  const getRedirectNotice = () => {
    if (!redirectTarget) return null;
    const cleanTarget = redirectTarget.split(':')[0];
    switch (cleanTarget) {
      case 'checkout':
        return {
          icon: <ShoppingBag className="w-4 h-4 text-orange-600" />,
          title: 'Checkout Authentication Required',
          message: 'Please sign in or create an account to finalize and place your order.',
        };
      case 'admin':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
          title: 'Store Admin Access Required',
          message: 'Please sign in with authorized store administrator credentials.',
        };
      case 'order-tracking':
        return {
          icon: <Truck className="w-4 h-4 text-indigo-600" />,
          title: 'Private Order Tracking',
          message: 'Sign in to access your package checkpoints and live delivery dispatch info.',
        };
      case 'orders':
        return {
          icon: <ShoppingBag className="w-4 h-4 text-blue-600" />,
          title: 'Order History Scoped to Your Account',
          message: 'Sign in to review your past orders, tracking IDs, and download tax invoices.',
        };
      case 'profile':
        return {
          icon: <UserIcon className="w-4 h-4 text-purple-600" />,
          title: 'Account Settings',
          message: 'Sign in to update your shipping addresses, contact details, and preferences.',
        };
      default:
        return {
          icon: <KeyRound className="w-4 h-4 text-slate-600" />,
          title: 'Authentication Required',
          message: 'Please sign in to proceed with your requested action.',
        };
    }
  };

  const redirectNotice = getRedirectNotice();

  const handlePostAuthRedirect = (role?: string) => {
    if (redirectTarget) {
      if (redirectTarget.includes(':')) {
        const [tab, param] = redirectTarget.split(':');
        onNavigate(tab, param);
        return;
      }
      onNavigate(redirectTarget);
      return;
    }

    if (role === 'admin') {
      onNavigate('admin');
    } else {
      onNavigate('home');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both your email address and password.');
        }
        const logged = await login(email.trim(), password);
        handlePostAuthRedirect(logged?.role);
      } else if (mode === 'register') {
        if (!name.trim() || !email.trim() || !password) {
          throw new Error('Please provide your full name, email address, and a secure password.');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        const newUser = await register(name.trim(), email.trim(), password, phone.trim());
        handlePostAuthRedirect(newUser?.role);
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('Please enter your email to receive recovery instructions.');
        }
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 600);
        });
        setForgotSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill demo helper
  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
    setMode('login');
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      {/* Return to Store Back Link */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <button
          onClick={() => (redirectTarget ? onNavigate(redirectTarget.split(':')[0]) : onNavigate('home'))}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{redirectTarget ? 'Back to previous page' : 'Return to Store'}</span>
        </button>

        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Secure Authentication
        </span>
      </div>

      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Card Header & Brand */}
          <div className="p-8 text-center bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100">
            <div className="flex justify-center mb-4">
              <BrandLogo size="lg" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'register' && 'Create your shopper account'}
              {mode === 'forgot' && 'Reset your password'}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {mode === 'login' && 'Manage your orders, fast-track checkout, and sync your wishlist across all devices.'}
              {mode === 'register' && 'Join thousands of satisfied shoppers enjoying lightning-fast delivery and verified reviews.'}
              {mode === 'forgot' && 'Enter your registered email address and we will send you password reset instructions.'}
            </p>
          </div>

          {/* Context Redirect Alert Banner if redirected from checkout/tracking/admin */}
          {redirectNotice && (
            <div className="mx-6 mt-6 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 flex items-start gap-3">
              <div className="p-1 rounded-lg bg-amber-100 shrink-0 mt-0.5">
                {redirectNotice.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-900">{redirectNotice.title}</p>
                <p className="text-[11px] text-amber-700 leading-snug mt-0.5">
                  {redirectNotice.message}
                </p>
              </div>
            </div>
          )}

          {/* Quick Demo Credentials Pills */}
          <div className="px-6 pt-5">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-orange-500" /> Quick Demo Sign-In
                </span>
                <span className="text-[10px] text-slate-400">1-Click Fill</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoFill('shopper@inbox.com', 'CustomerSecure2026!')}
                  className="px-2.5 py-1.5 bg-white hover:bg-orange-50 hover:border-orange-300 border border-slate-200 rounded-xl text-left text-xs transition-colors cursor-pointer"
                >
                  <p className="font-bold text-slate-800 text-[11px]">Shopper Account</p>
                  <p className="text-[10px] text-slate-400 truncate">shopper@inbox.com</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('admin@inbox.com', 'AdminSecure2026!')}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-left text-xs transition-colors cursor-pointer"
                >
                  <p className="font-bold text-slate-800 text-[11px]">Store Admin</p>
                  <p className="text-[10px] text-slate-400 truncate">admin@inbox.com</p>
                </button>
              </div>
            </div>
          </div>

          {/* Auth Tab Switcher (Sign In vs Register) */}
          <div className="px-6 pt-5">
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg('');
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            {forgotSuccess ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Check your inbox</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  We've dispatched recovery instructions to <strong className="text-slate-700">{email}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSuccess(false);
                    setMode('login');
                  }}
                  className="mt-5 px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name & Phone for registration */}
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Mayank Godhani"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#E84A27] focus:bg-white transition-colors"
                        />
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#E84A27] focus:bg-white transition-colors"
                        />
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      </div>
                    </div>
                  </>
                )}

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#E84A27] focus:bg-white transition-colors"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Password field */}
                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Password</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setMode('forgot')}
                          className="text-[11px] font-semibold text-[#E84A27] hover:underline cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#E84A27] focus:bg-white transition-colors"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-[#E84A27] hover:bg-[#d03d1c] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <span>Processing securely...</span>
                  ) : (
                    <>
                      <span>
                        {mode === 'login' && (redirectTarget ? `Sign In & Proceed to ${redirectTarget.split(':')[0]}` : 'Sign In')}
                        {mode === 'register' && 'Create Account & Continue'}
                        {mode === 'forgot' && 'Send Recovery Instructions'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {mode === 'forgot' && !forgotSuccess && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
