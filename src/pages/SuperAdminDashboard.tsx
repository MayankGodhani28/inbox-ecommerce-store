import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { superAdminService, SuperAdminMetrics } from '../services/superAdminService';
import { SellerApplication, User } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  LogOut,
  Building2,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Tag,
  Calendar,
  Lock,
  Ban,
  ChevronRight,
  Database,
  Server,
  Layers,
  ArrowUpRight,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  ArrowRight,
} from 'lucide-react';

interface SuperAdminDashboardProps {
  onNavigate: (tab: string, param?: string) => void;
  onOpenAuthModal?: () => void;
}

type TabKey = 'applications' | 'admins' | 'architecture' | 'credentials';

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigate, onOpenAuthModal }) => {
  const { user, isSuperAdmin, login, logout, refreshUser } = useAuth();
  const { showToast } = useToast();

  // Standalone inline login state for private /super-admin portal
  const [masterEmail, setMasterEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isMasterLoggingIn, setIsMasterLoggingIn] = useState(false);
  const [masterLoginError, setMasterLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<TabKey>('applications');
  const [metrics, setMetrics] = useState<SuperAdminMetrics | null>(null);
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [appFilter, setAppFilter] = useState<'ALL' | SellerApplication['status']>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');

  // Rejection modal
  const [rejectModalApp, setRejectModalApp] = useState<SellerApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  // Credentials update state
  const [credOldPassword, setCredOldPassword] = useState('');
  const [credNewEmail, setCredNewEmail] = useState('');
  const [credNewPassword, setCredNewPassword] = useState('');
  const [credConfirmPassword, setCredConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);
  const [credError, setCredError] = useState('');
  const [credSuccess, setCredSuccess] = useState('');

  // Load initial data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [metricsRes, appsRes, adminsRes] = await Promise.all([
        superAdminService.getMetrics(),
        superAdminService.getApplications(),
        superAdminService.getAdmins(),
      ]);
      setMetrics(metricsRes.metrics);
      setApplications(appsRes.applications);
      setAdmins(adminsRes.admins);
    } catch (err: any) {
      showToast('Error loading Super Admin data', { message: err?.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      void loadData();
    } else {
      setIsLoading(false);
    }
  }, [isSuperAdmin]);

  // Handle Approve
  const handleApprove = async (appId: string) => {
    try {
      setIsProcessingAction(true);
      const res = await superAdminService.approveApplication(appId);
      showToast('Seller Approved!', {
        message: `${res.application.storeName} is now authorized with Store Admin privileges!`,
        type: 'success',
      });
      await loadData();
    } catch (err: any) {
      showToast('Approval Failed', { message: err?.message || 'Error approving', type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };


  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError('');
    setCredSuccess('');

    if (!credOldPassword) {
      setCredError('Current password is required to authorize changes.');
      return;
    }

    const trimmedEmail = credNewEmail.trim().toLowerCase();
    const trimmedPassword = credNewPassword.trim();
    const emailChanged = Boolean(trimmedEmail && trimmedEmail !== user?.email?.toLowerCase());
    const passwordChanged = trimmedPassword.length > 0;

    if (!emailChanged && !passwordChanged) {
      setCredError('Please specify a new email or password that differs from your current settings.');
      return;
    }

    if (passwordChanged) {
      if (trimmedPassword.length < 8) {
        setCredError('New password must be at least 8 characters long.');
        return;
      }
      if (trimmedPassword !== credConfirmPassword.trim()) {
        setCredError('New password and confirmation do not match.');
        return;
      }
    }

    try {
      setIsUpdatingCreds(true);
      const res = await superAdminService.updateCredentials({
        currentPassword: credOldPassword,
        newEmail: emailChanged ? trimmedEmail : undefined,
        newPassword: passwordChanged ? trimmedPassword : undefined,
      });

      showToast('Credentials Updated', {
        message: res.message || 'Super Admin credentials successfully updated.',
        type: 'success',
      });

      setCredOldPassword('');
      setCredNewPassword('');
      setCredConfirmPassword('');
      setCredError('');
      setCredSuccess('');
      if (refreshUser) {
        await refreshUser();
      }
      await loadData();
      // Redirect to Super Admin home page (applications tab)
      setActiveTab('applications');
    } catch (err: any) {
      setCredError(err?.message || 'Failed to update credentials. Please check your current password.');
      showToast('Update Failed', {
        message: err?.message || 'Could not update credentials.',
        type: 'error',
      });
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  // Handle Reject Submit
  const handleConfirmReject = async () => {
    if (!rejectModalApp) return;
    try {
      setIsProcessingAction(true);
      await superAdminService.rejectApplication(
        rejectModalApp.id,
        rejectReason.trim() || 'Application did not satisfy marketplace seller guidelines.'
      );
      showToast('Application Rejected', {
        message: `Notification logged for ${rejectModalApp.storeName}.`,
        type: 'info',
      });
      setRejectModalApp(null);
      setRejectReason('');
      await loadData();
    } catch (err: any) {
      showToast('Rejection Failed', { message: err?.message, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Suspend Application
  const handleSuspendApp = async (appId: string, storeName: string) => {
    try {
      setIsProcessingAction(true);
      await superAdminService.suspendApplication(appId);
      showToast('Store Suspended', {
        message: `Store "${storeName}" has been suspended. Storefront catalog items are paused.`,
        type: 'info',
      });
      await loadData();
    } catch (err: any) {
      showToast('Suspension Failed', { message: err?.message || 'Error suspending application', type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Unsuspend / Reinstate Application
  const handleUnsuspendApp = async (appId: string, storeName: string) => {
    try {
      setIsProcessingAction(true);
      await superAdminService.unsuspendApplication(appId);
      showToast('Store Reinstated!', {
        message: `Store "${storeName}" has been unsuspended and restored to Active status!`,
        type: 'success',
      });
      await loadData();
    } catch (err: any) {
      showToast('Unsuspension Failed', { message: err?.message || 'Error unsuspending application', type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Suspend/Reinstate Admin
  const handleToggleAdminStatus = async (targetUser: User) => {
    const isSuspended = targetUser.sellerStatus === 'SUSPENDED';
    const newStatus = isSuspended ? 'APPROVED' : 'SUSPENDED';
    try {
      await superAdminService.updateAdminStatus(targetUser.id, { sellerStatus: newStatus });
      showToast(isSuspended ? 'Admin Reinstated' : 'Admin Suspended', {
        message: `${targetUser.name} (${targetUser.email}) status set to ${newStatus}.`,
        type: 'info',
      });
      await loadData();
    } catch (err: any) {
      showToast('Action Failed', { message: err?.message, type: 'error' });
    }
  };

  // 1. Master Security Gate: Non-SuperAdmin Access requires authentication at /super-admin
  if (!isSuperAdmin) {
    const handleDirectMasterLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setMasterLoginError('');
      if (!masterEmail.trim() || !masterPassword.trim()) {
        setMasterLoginError('Please enter both Super Admin email and master password.');
        return;
      }
      try {
        setIsMasterLoggingIn(true);
        await login(masterEmail.trim(), masterPassword, 'superadmin');
        showToast('Super Admin Authenticated', {
          message: 'Welcome to the Platform Master Console.',
          type: 'success',
        });
        await loadData();
      } catch (err: any) {
        setMasterLoginError(err?.message || 'Invalid Super Admin credentials. Please verify your master login.');
      } finally {
        setIsMasterLoggingIn(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex items-center justify-center px-4 py-12">
        {/* Super Admin Direct Login Card */}
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-600 to-indigo-600" />

          <div className="size-14 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-200 shadow-inner">
            <Lock className="size-7" />
          </div>

          <div className="text-center mb-6">
            <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-[10px] font-extrabold uppercase tracking-widest border border-purple-200">
              Platform Master Console
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-2.5 mb-1 tracking-tight">
              Super Admin Sign In
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Restricted master terminal for platform owners. Enter your credentials to manage marketplace operations.
            </p>
          </div>

          {masterLoginError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-rose-600" />
              <span>{masterLoginError}</span>
            </div>
          )}

          <form onSubmit={handleDirectMasterLogin} className="space-y-4 text-left">
            <div>
              <label htmlFor="master-admin-email" className="block text-xs font-bold text-slate-700 mb-1">Super Admin Email</label>
              <div className="relative">
                <Mail className="size-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="master-admin-email"
                  type="email"
                  required
                  value={masterEmail}
                  onChange={(e) => setMasterEmail(e.target.value)}
                  placeholder="superadmin@gmail.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="master-admin-pass" className="block text-xs font-bold text-slate-700 mb-1">Master Password</label>
              <div className="relative">
                <Lock className="size-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="master-admin-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isMasterLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="size-4" />
              <span>{isMasterLoggingIn ? 'Verifying Super Admin...' : 'Sign In as Super Admin'}</span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center text-xs text-slate-500">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              ← Customer Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    const matchStatus = appFilter === 'ALL' || app.status === appFilter;
    const matchSearch =
      !searchTerm ||
      app.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Boolean(app.taxId?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      Boolean((app.email || app.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* ======================================================== */}
      {/* 1. TOP EXECUTIVE BAR (Light Mode)                        */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-600/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 tracking-tight">inBox Super Admin</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[10px] font-extrabold text-purple-700 uppercase tracking-wider">
                  Platform Master
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Master Governance & Merchant Verification Console</p>
            </div>
          </div>
        </div>

        {/* System Health Indicators & Action Shortcuts */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[10px]">PostgreSQL :5432</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-semibold">Multi-Vendor Active</span>
          </div>

          <button
            onClick={() => {
              setActiveTab('credentials');
              setCredError('');
              setCredSuccess('');
              if (!credNewEmail && user?.email) setCredNewEmail(user.email);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
              activeTab === 'credentials'
                ? 'bg-purple-50 border-purple-300 text-purple-700'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Change Super Admin Email & Password"
          >
            <KeyRound className="size-3.5 text-purple-600" />
            <span className="hidden sm:inline">Set Credentials</span>
          </button>
          <button
            onClick={async () => {
              await logout();
              onNavigate('home');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 shadow-xs"
            title="View customer storefront (redirects without login)"
          >
            <ArrowUpRight className="size-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Storefront</span>
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. PLATFORM METRICS RIBBON (Light Cards)                 */}
      {/* ======================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Pending Applications - highlighted */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Pending Verification
              </span>
              <Clock className="size-4 text-amber-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {metrics?.pendingApplications ?? 0}
            </p>
            <p className="text-[11px] text-amber-700 mt-1 font-medium">Requires Super Admin approval</p>
          </div>

          {/* Authorized Store Admins */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Store Admins / Sellers
              </span>
              <Store className="size-4 text-indigo-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {metrics?.totalAdmins ?? 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Authorized to list products</p>
          </div>

          {/* Total Applications Processed */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Applications
              </span>
              <FileText className="size-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {metrics?.totalApplications ?? 0}
            </p>
            <p className="text-[11px] text-emerald-700 mt-1 font-medium">
              {metrics?.approvedApplications ?? 0} approved, {metrics?.rejectedApplications ?? 0} rejected
            </p>
          </div>

          {/* Total Platform Users */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Platform Shoppers
              </span>
              <Users className="size-4 text-purple-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {metrics?.totalCustomers ?? 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{metrics?.totalOrders ?? 0} orders processed</p>
          </div>
        </div>

        {/* Tab Navigation in Light Style */}
        <div className="mt-8 flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'applications'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="size-3.5" />
              <span>Seller Verification Queue</span>
              {metrics && metrics.pendingApplications > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  {metrics.pendingApplications}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('admins')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'admins'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="size-3.5" />
              <span>Admin & Seller Directory</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                {admins.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'architecture'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="size-3.5" />
              <span>Marketplace Architecture</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('credentials');
                setCredError('');
                setCredSuccess('');
                if (!credNewEmail && user?.email) setCredNewEmail(user.email);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'credentials'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <KeyRound className="size-3.5" />
              <span>Credentials & Security</span>
            </button>

          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. TAB 1: SELLER APPLICATIONS QUEUE (Light Cards)        */}
      {/* ======================================================== */}
      {activeTab === 'applications' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
          {/* Controls: Search and Status Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED', 'ALL'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setAppFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    appFilter === status
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status === 'ALL' ? 'All Applications' : status}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search store, tax ID, email..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-xs"
              />
            </div>
          </div>

          {/* Applications List */}
          {filteredApps.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-xs">
              <CheckCircle2 className="size-12 text-emerald-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-900">No Applications Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No merchant applications match the selected filter. Any incoming submissions from <code className="text-indigo-600 font-bold">/sell</code> will populate here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 transition-all rounded-3xl p-6 shadow-xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left: Store & Business Details */}
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="size-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-100">
                          🏬
                        </span>
                        <h3 className="text-base font-black text-slate-900">{app.storeName}</h3>

                        {/* Status Badge */}
                        <span
                          className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            app.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : app.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : app.status === 'SUSPENDED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {app.status}
                        </span>

                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium">
                          {app.category}
                        </span>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="size-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            <span className="text-slate-400 font-medium">Legal: </span>
                            <span className="text-slate-800 font-semibold">{app.legalName}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 font-mono">
                          <FileText className="size-3.5 text-amber-600 shrink-0" />
                          <span>
                            <span className="text-slate-400 font-sans font-medium">Tax ID: </span>
                            <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              {app.taxId}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Mail className="size-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-800 font-mono text-[11px]">{app.email || 'Registered Seller'}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Phone className="size-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-800">{app.phone}</span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:col-span-2">
                          <MapPin className="size-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-700">{app.businessAddress}</span>
                        </div>
                      </div>

                      {/* Store Description / Pitch */}
                      {app.description && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                          "{app.description}"
                        </p>
                      )}

                      {/* Review Notes (if rejected or reviewed) */}
                      {app.rejectionReason && (
                        <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200">
                          <strong className="text-rose-900">Super Admin Note: </strong>
                          {app.rejectionReason}
                        </p>
                      )}

                      <div className="text-[10px] text-slate-400">
                        Submitted: {new Date(app.createdAt).toLocaleString()}
                        {app.reviewedAt && ` • Reviewed: ${new Date(app.reviewedAt).toLocaleString()}`}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      {app.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(app.id)}
                            disabled={isProcessingAction}
                            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="size-4" />
                            <span>Approve & Grant Admin</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectModalApp(app);
                              setRejectReason('');
                            }}
                            disabled={isProcessingAction}
                            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-rose-50 hover:text-rose-700 border border-slate-300 hover:border-rose-300 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="size-4" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {app.status === 'APPROVED' && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                            <CheckCircle2 className="size-4 text-emerald-600" />
                            <span>Active</span>
                          </div>
                          <button
                            onClick={() => handleSuspendApp(app.id, app.storeName)}
                            disabled={isProcessingAction}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 hover:text-rose-700 border border-slate-300 hover:border-rose-300 text-rose-600 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                            title="Suspend store catalog and merchant privileges"
                          >
                            <Ban className="size-3.5 text-rose-500" />
                            <span>Suspend Store</span>
                          </button>
                        </div>
                      )}

                      {app.status === 'SUSPENDED' && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                            <AlertTriangle className="size-4 text-rose-600" />
                            <span>Suspended</span>
                          </div>
                          <button
                            onClick={() => handleUnsuspendApp(app.id, app.storeName)}
                            disabled={isProcessingAction}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                            title="Reinstate store catalog and admin privileges"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>Unsuspend Store</span>
                          </button>
                        </div>
                      )}

                      {app.status === 'REJECTED' && (
                        <button
                          onClick={() => handleApprove(app.id)}
                          disabled={isProcessingAction}
                          className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Reconsider & Approve</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ======================================================== */}
      {/* 4. TAB 2: STORE ADMINS & SELLERS DIRECTORY (Light Table) */}
      {/* ======================================================== */}
      {activeTab === 'admins' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Authorized Store Administrators</h3>
                <p className="text-xs text-slate-500">
                  All accounts granted permission to manage products, process orders, and configure store catalogs.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                {admins.length} Active Accounts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Admin / Store</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Platform Role</th>
                    <th className="py-3 px-4">Seller Status</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Master Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admins.map((adm) => {
                    const isSuspended = adm.sellerStatus === 'SUSPENDED';
                    const isSuper = adm.role === 'superadmin';

                    return (
                      <tr key={adm.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-[#008060] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {adm.name?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{adm.name}</p>
                              <p className="text-[11px] text-indigo-600 leading-tight font-medium">
                                {adm.storeName || 'Primary Flagship Store'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          <p className="font-mono text-[11px] text-slate-900">{adm.email}</p>
                          <p className="text-[11px] text-slate-500">{adm.phone || 'No phone'}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              isSuper
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {adm.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isSuspended
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {adm.sellerStatus || 'APPROVED'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : 'Active'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isSuper ? (
                            <span className="text-[11px] text-slate-400 font-semibold italic">
                              Owner Account
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleAdminStatus(adm)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                                isSuspended
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  : 'bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-rose-600'
                              }`}
                            >
                              {isSuspended ? (
                                <>
                                  <CheckCircle2 className="size-3.5" />
                                  <span>Unsuspend Store</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="size-3.5" />
                                  <span>Suspend Store</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* ======================================================== */}
      {/* 5. TAB 3: REAL-WORLD BUSINESS ARCHITECTURE GUIDE         */}
      {/* ======================================================== */}
      {activeTab === 'architecture' && (
        <main className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6 text-left">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                Production Marketplace Blueprint
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                Why A Dedicated Onboarding URL Is The Industry Standard
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Comparing Amazon Seller Central, Enterprise Multi-Vendor, and marketplace architectures.
              </p>
            </div>

            {/* Architecture Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                  <Store className="size-4 text-indigo-600" />
                  <span>Public Onboarding Portal: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">/sell</code></span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Prospective merchants browse value propositions, seller commissions, and fill a structured KYC application (Store Name, Legal Entity, Tax ID / GSTIN / EIN, phone, and catalogue description).
                </p>
                <div className="text-[11px] text-slate-500">
                  Status: <strong className="text-slate-800">Publicly Accessible</strong>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
                  <ShieldCheck className="size-4 text-purple-600" />
                  <span>Super Admin Verification: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">/super-admin</code></span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Only the platform owner can access this terminal. Review pending merchant KYC, verify tax registration, check compliance, and with 1 click promote the applicant to <code className="text-purple-700 font-bold">ADMIN</code>.
                </p>
                <div className="text-[11px] text-slate-500">
                  Status: <strong className="text-slate-800">Strictly Guarded by RBAC</strong>
                </div>
              </div>
            </div>

            {/* Step-by-Step Flow */}
            <div className="border-t border-slate-100 pt-6 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                End-to-End Seller Lifecycle in inBox:
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 leading-relaxed">
                <li>
                  <strong className="text-slate-900">Merchant Applies:</strong> Seller navigates to <code>/sell</code> (or clicks "Become a Seller" in navigation), submits business details. Their account enters <code>PENDING</code> status.
                </li>
                <li>
                  <strong className="text-slate-900">Review by Super Admin:</strong> Master console notifies Super Admin. Super Admin opens <code>/super-admin</code>, inspects store name, legal entity, tax ID, and phone.
                </li>
                <li>
                  <strong className="text-slate-900">1-Click Approval:</strong> Super Admin clicks <em>"Approve & Grant Admin"</em>. The API atomically updates the user role to <code>ADMIN</code> and sets <code>sellerStatus: APPROVED</code>.
                </li>
                <li>
                  <strong className="text-slate-900">Merchant Admin Activated:</strong> The newly minted merchant logs in and now has access to the full merchant management portal at <code>/admin</code> to create listings, update stock, and fulfill orders!
                </li>
              </ol>
            </div>
          </div>
        </main>
      )}


      {/* ======================================================== */}
      {/* 5B. TAB 4: SUPER ADMIN SECURITY & CREDENTIALS MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'credentials' && (
        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6 text-left">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
                  Master Security Settings
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                  Super Admin Credentials Management
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Update the platform master email address and master password. Verification with your current password is required.
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 text-xs shrink-0">
                <ShieldCheck className="size-5 text-purple-600 shrink-0" />
                <div>
                  <div className="font-bold text-[11px]">Active Session: {user?.email}</div>
                  <div className="text-[10px] text-purple-700">Role: Platform Master (Super Admin)</div>
                </div>
              </div>
            </div>

            {credSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-3">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <div className="font-bold">Credentials Updated Successfully</div>
                  <div>{credSuccess}</div>
                </div>
              </div>
            )}

            {credError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-3">
                <AlertTriangle className="size-5 shrink-0 text-rose-600" />
                <div className="flex-1">
                  <div className="font-bold">Update Failed</div>
                  <div>{credError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleUpdateCredentials} className="space-y-5 max-w-2xl">
              {/* Current Password Field */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="superadmin-cur-pass" className="block text-xs font-black uppercase tracking-wider text-amber-900">
                    Current Password <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-amber-700 font-medium">Required for authorization</span>
                </div>
                <div className="relative">
                  <Lock className="size-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="superadmin-cur-pass"
                    type={showOldPass ? 'text' : 'password'}
                    required
                    value={credOldPassword}
                    onChange={(e) => setCredOldPassword(e.target.value)}
                    placeholder="Enter your current Super Admin password"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showOldPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* New Email */}
              <div className="space-y-1.5">
                <label htmlFor="superadmin-new-email" className="block text-xs font-bold text-slate-700">
                  New Super Admin Email
                </label>
                <div className="relative">
                  <Mail className="size-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="superadmin-new-email"
                    type="email"
                    value={credNewEmail}
                    onChange={(e) => setCredNewEmail(e.target.value)}
                    placeholder={user?.email || 'superadmin@gmail.com'}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Current email: <strong className="text-slate-800">{user?.email}</strong>. Default is <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">superadmin@gmail.com</code>.
                </p>
              </div>

              {/* New Password & Confirmation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="superadmin-new-pass" className="block text-xs font-bold text-slate-700">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="size-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="superadmin-new-pass"
                      type={showNewPass ? 'text' : 'password'}
                      value={credNewPassword}
                      onChange={(e) => setCredNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">Leave blank if keeping current password.</p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="superadmin-confirm-pass" className="block text-xs font-bold text-slate-700">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="size-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="superadmin-confirm-pass"
                      type={showNewPass ? 'text' : 'password'}
                      value={credConfirmPassword}
                      onChange={(e) => setCredConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Must match the new password above.</p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('applications')}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    ← Back to Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCredOldPassword('');
                      setCredNewPassword('');
                      setCredConfirmPassword('');
                      setCredNewEmail(user?.email || '');
                      setCredError('');
                      setCredSuccess('');
                    }}
                    className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Reset Form
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingCreds || !credOldPassword}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <KeyRound className="size-4" />
                  <span>{isUpdatingCreds ? 'Updating Credentials...' : 'Save New Credentials'}</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      )}

      {/* ======================================================== */}
      {/* 6. REJECTION REASON MODAL (Light Style)                  */}
      {/* ======================================================== */}
      {rejectModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="size-5" />
                <span>Reject Seller Application</span>
              </div>
              <button
                onClick={() => setRejectModalApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Provide feedback for <strong className="text-slate-900">{rejectModalApp.storeName}</strong>. The applicant will see this explanation so they can rectify and resubmit.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Tax identification number could not be verified with tax authority records. Please provide a valid GSTIN/EIN."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectModalApp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessingAction}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {isProcessingAction ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
