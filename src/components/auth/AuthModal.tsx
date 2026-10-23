import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { BrandLogo } from '../common/BrandLogo';
import { X, Eye, EyeOff, Mail, User as UserIcon, Phone, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'forgot';
  onLoginSuccess?: (role: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onLoginSuccess,
}) => {
  const { login, register } = useAuth();
  const { t } = useTranslation();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both email and password.');
        }
        const logged = await login(email, password);
        if (onLoginSuccess && logged?.role) {
          onLoginSuccess(logged.role);
        }
        onClose();
      } else if (mode === 'register') {
        if (!name.trim() || !email.trim() || !password) {
          throw new Error('Please fill in name, email, and password.');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        await register(name, email, password, phone);
        onClose();
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('Please enter your email to receive recovery instructions.');
        }
        // Simulate password reset link
        await new Promise((resolve) => setTimeout(resolve, 600));
        setForgotSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pt-7 text-center bg-slate-50 border-b border-slate-100">
          <div className="flex justify-center mb-3">
            <BrandLogo size="md" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {mode === 'login' && t('auth.welcomeBack')}
            {mode === 'register' && t('auth.createAccount')}
            {mode === 'forgot' && t('auth.resetPassword')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'login' && t('auth.loginDesc')}
            {mode === 'register' && t('auth.registerDesc')}
            {mode === 'forgot' && t('auth.forgotDesc')}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          {forgotSuccess ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t('auth.recoverySentTitle')}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {t('auth.recoverySentDesc', { email })}
              </p>
              <button
                onClick={() => {
                  setForgotSuccess(false);
                  setMode('login');
                }}
                className="mt-5 w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                {t('auth.backToLogin')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">{t('auth.fullName')}</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Sharma"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">{t('auth.phoneNumber')}</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">{t('auth.emailAddress')}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">{t('auth.password')}</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg('');
                          setMode('forgot');
                        }}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium cursor-pointer"
                      >
                        {t('auth.forgotPassword')}
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
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-orange-600 border-slate-300 focus:ring-orange-500"
                    />
                    <span>{t('auth.rememberMe')}</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-[#E84A27] hover:bg-[#d63f1f] text-white font-bold rounded-xl shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block animate-spin">⟳</span>
                ) : (
                  <>
                    <span>
                      {mode === 'login' && t('auth.signInBtn')}
                      {mode === 'register' && t('auth.registerBtn')}
                      {mode === 'forgot' && t('auth.sendResetBtn')}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Admin Access Option */}
          {mode === 'login' && (
            <div className="mt-4 p-3 rounded-xl bg-blue-50/80 border border-blue-200/70 flex items-center justify-between gap-3 text-xs animate-fade-in">
              <div className="flex items-center gap-2.5 text-slate-700 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 leading-tight truncate">Store Administrator</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">admin@inbox.com</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@inbox.com');
                  setPassword('AdminSecure2026!');
                  setErrorMsg('');
                }}
                className="px-3 py-1.5 rounded-lg bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 hover:border-blue-300 border border-blue-200 shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                Fill Admin Credentials
              </button>
            </div>
          )}

          {/* Switch mode links */}
          <div className="mt-5 text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
            {mode === 'login' ? (
              <p>
                {t('auth.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setMode('register');
                  }}
                  className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                >
                  {t('auth.createOne')}
                </button>
              </p>
            ) : (
              <p>
                {t('auth.alreadyHaveAccount')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setMode('login');
                  }}
                  className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                >
                  {t('auth.signInLink')}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
