import React, { useState, useEffect } from 'react';
import { Product, Order, OrderStatus, ProductCategory, SellerApplication } from '../types';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { superAdminService } from '../services/superAdminService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../context/LanguageContext';
import { CATEGORIES } from '../components/common/Navbar';
import { BrandLogo } from '../components/common/BrandLogo';
import { LanguageSelector } from '../components/common/LanguageSelector';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Eye,
  TrendingUp,
  Search,
  Filter,
  X,
  ChevronRight,
  ShieldCheck,
  Store,
  LogOut,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Home,
  BarChart3,
  Globe,
  Tag,
  Clock,
  ArrowUpRight,
  Building2,
  FileText,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  BadgeCheck,
  User as UserIcon,
  Lock,
  EyeOff,
  KeyRound,
  ChevronDown,
} from 'lucide-react';

interface AdminDashboardProps {
  onProductsUpdate: () => void;
  onNavigate: (tab: string, param?: string) => void;
  onOpenAuthModal?: () => void;
}

type AdminTab = 'overview' | 'orders' | 'products' | 'customers' | 'analytics';

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl?: string | null;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
}

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'Order Placed',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onProductsUpdate,
  onNavigate,
  onOpenAuthModal,
}) => {
  const { user, isAdmin, login, logout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const { t, tCategory, tStatus, tRole } = useTranslation();

  // Inline admin login modal state for standalone /admin portal
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [adminAuthEmail, setAdminAuthEmail] = useState('');
  const [adminAuthPassword, setAdminAuthPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');

  // Seller Onboarding Application state for new sellers on /admin
  const [isApplyFormOpen, setIsApplyFormOpen] = useState(false);
  const [existingApp, setExistingApp] = useState<SellerApplication | null>(null);
  const [isLoadingApp, setIsLoadingApp] = useState(false);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [isApprovalBannerDismissed, setIsApprovalBannerDismissed] = useState(false);

  // Application form fields
  const [storeName, setStoreName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [phone, setPhone] = useState(user?.phone || '');
  const [businessAddress, setBusinessAddress] = useState('');
  const [description, setDescription] = useState('');

  // Unauthenticated seller registration fields
  const [applicantName, setApplicantName] = useState(user?.name || '');
  const [applicantEmail, setApplicantEmail] = useState(user?.email || '');
  const [applicantPassword, setApplicantPassword] = useState('');

  // Load existing application if user is logged in
  useEffect(() => {
    let isMounted = true;
    if (user) {
      setIsLoadingApp(true);
      superAdminService
        .getMyApplication()
        .then(async (res) => {
          if (isMounted) {
            setExistingApp(res.application);
            setIsLoadingApp(false);
            // If the application was approved by Super Admin and user is not yet recognized as admin,
            // refresh user credentials so the admin panel and product add features unlock!
            if (res.application && res.application.status === 'APPROVED' && !isAdmin) {
              await refreshUser();
            }
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingApp(false);
        });
    } else {
      setExistingApp(null);
    }
    return () => {
      isMounted = false;
    };
  }, [user, isAdmin, refreshUser]);

  const checkApplicationStatus = async () => {
    try {
      setIsLoadingApp(true);
      const res = await superAdminService.getMyApplication();
      setExistingApp(res.application);
      if (res.application?.status === 'APPROVED') {
        await refreshUser();
        showToast('Application Approved!', {
          message: 'Super Admin has verified your seller application! Welcome to the Admin Dashboard.',
          type: 'success',
        });
      } else if (res.application?.status === 'PENDING') {
        showToast('Application Under Review', {
          message: 'Your registration is currently in the Super Admin verification queue.',
          type: 'info',
        });
      } else if (res.application?.status === 'REJECTED') {
        showToast('Application Not Approved', {
          message: res.application.rejectionReason || 'Please review Super Admin feedback and resubmit.',
          type: 'error',
        });
      } else {
        showToast('No Application Found', {
          message: 'You have not submitted a seller application yet.',
          type: 'info',
        });
      }
    } catch {
      showToast('Status Check Failed', {
        message: 'Could not fetch current application status. Please try again.',
        type: 'error',
      });
    } finally {
      setIsLoadingApp(false);
    }
  };

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [merchantProducts, setMerchantProducts] = useState<Product[]>([]);

  // Product CRUD modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form states
  const [pName, setPName] = useState('');
  const [pBrand, setPBrand] = useState('');
  const [pCategory, setPCategory] = useState<ProductCategory>('Electronics');
  const [pPrice, setPPrice] = useState('199.99');
  const [pOriginalPrice, setPOriginalPrice] = useState('249.99');
  const [pStock, setPStock] = useState('25');
  const [pImage, setPImage] = useState('');
  const [pDesc, setPDesc] = useState('');

  // Search & filter states
  const [globalAdminSearch, setGlobalAdminSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [customerSearch, setCustomerSearch] = useState('');

  const [metrics, setMetrics] = useState<{
    paidRevenue: number;
    totalOrders: number;
    pendingOrders: number;
    unpaidCodOrders: number;
    lowStockCount: number;
    totalCustomers: number;
  } | null>(null);

  const refreshAdminData = () => {
    productService.getAdminProducts().then(setMerchantProducts).catch(() => {});
    orderService.getAdminOrders().then(setOrders).catch(() => {});
    orderService.getAdminMetrics().then(setMetrics).catch(() => {});
    orderService.getAdminCustomers().then(setCustomers).catch(() => {});
  };

  useEffect(() => {
    if (isAdmin) {
      refreshAdminData();
    }
  }, [isAdmin]);

  // Strictly isolated to current merchant's catalog only
  const displayProducts = merchantProducts;

  // Compute authoritative analytics
  const totalSales = metrics
    ? metrics.paidRevenue
    : orders.filter((o) => o.paymentStatus === 'Paid').reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = metrics ? metrics.totalOrders : orders.length;
  const pendingOrdersCount = metrics
    ? metrics.pendingOrders
    : orders.filter((o) => ['Order Placed', 'Confirmed'].includes(o.status)).length;
  const lowStockCount = metrics ? metrics.lowStockCount : displayProducts.filter((p) => p.stock <= 10).length;
  const lowStockProducts = displayProducts.filter((p) => p.stock <= 10 && !p.isArchived);

  // Order status update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const updated = await orderService.updateOrderStatus(orderId, newStatus);
      if (updated) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        orderService.getAdminMetrics().then(setMetrics).catch(() => {});
        showToast(t('toast.orderStatusUpdated', { id: orderId, status: tStatus(newStatus) }), { type: 'success' });
      }
    } catch (err: any) {
      showToast('Could not update order status', { message: err?.message || 'Error', type: 'error' });
    }
  };

  // Collect payment for COD
  const handleCollectCodPayment = async (orderId: string) => {
    try {
      const updated = await orderService.collectCodPayment(orderId);
      if (updated) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        orderService.getAdminMetrics().then(setMetrics).catch(() => {});
        showToast('Payment collected', { message: `Payment for order ${orderId} marked as Paid.`, type: 'success' });
      }
    } catch (err: any) {
      showToast('Payment collection failed', { message: err?.message || 'Error', type: 'error' });
    }
  };

  // Open add product modal
  const handleOpenAddProduct = () => {
    if (user?.sellerStatus === 'SUSPENDED') {
      showToast('Store Suspended', {
        message: 'Your seller privileges are currently suspended by platform Super Admin. You cannot add products.',
        type: 'error',
      });
      return;
    }
    setEditingProductId(null);
    setPName('');
    setPBrand(user?.storeName || '');
    setPCategory('Electronics');
    setPPrice('199.99');
    setPOriginalPrice('249.99');
    setPStock('25');
    setPImage('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80');
    setPDesc('High quality product specifications and features.');
    setIsProductModalOpen(true);
  };

  // Open edit product modal
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setPName(prod.name);
    setPBrand(prod.brand);
    setPCategory(prod.category);
    setPPrice(prod.price.toString());
    setPOriginalPrice(prod.originalPrice.toString());
    setPStock(prod.stock.toString());
    setPImage(prod.images[0] || '');
    setPDesc(prod.description);
    setIsProductModalOpen(true);
  };

  // Save product (Add or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(pPrice);
    const origPriceNum = parseFloat(pOriginalPrice);
    const stockNum = parseInt(pStock, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Validation Error', { message: 'Price must be greater than 0', type: 'error' });
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      showToast('Validation Error', { message: 'Stock must be 0 or higher', type: 'error' });
      return;
    }

    try {
      if (editingProductId) {
        await productService.updateProduct(editingProductId, {
          name: pName,
          brand: pBrand || user?.storeName || 'Inbox',
          category: pCategory,
          price: priceNum,
          originalPrice: origPriceNum,
          stock: stockNum,
          images: [pImage],
          description: pDesc,
        });
        showToast(t('toast.productUpdated'), { type: 'success' });
      } else {
        const discountPct = origPriceNum > priceNum ? Math.round(((origPriceNum - priceNum) / origPriceNum) * 100) : 0;
        await productService.addProduct({
          name: pName,
          brand: pBrand || user?.storeName || 'Inbox',
          category: pCategory,
          price: priceNum,
          originalPrice: origPriceNum,
          discount: discountPct,
          stock: stockNum,
          rating: 5.0,
          reviewCount: 0,
          specifications: {},
          images: [pImage],
          description: pDesc,
        });
        showToast(t('toast.productCreated'), { type: 'success' });
      }

      setIsProductModalOpen(false);
      onProductsUpdate();
      refreshAdminData();
    } catch (err: any) {
      showToast('Product save failed', { message: err?.message || 'Unable to save product', type: 'error' });
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive this product? It will be safely removed from customer visibility while preserving historic orders.')) {
      return;
    }
    try {
      await productService.deleteProduct(id);
      showToast(t('toast.productDeleted'), { type: 'info' });
      onProductsUpdate();
      refreshAdminData();
    } catch (err: any) {
      showToast('Product deletion failed', { message: err?.message || 'Unable to delete product', type: 'error' });
    }
  };

  // Filtered lists
  const filteredProducts = displayProducts.filter((p) => {
    const query = (globalAdminSearch || productSearch).toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query);
    const matchesCategory =
      selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredOrders = orders.filter((o) => {
    const query = (globalAdminSearch || orderSearch).toLowerCase();
    const matchesSearch =
      o.id.toLowerCase().includes(query) ||
      o.customerName.toLowerCase().includes(query) ||
      o.customerEmail.toLowerCase().includes(query);
    const matchesStatus =
      orderStatusFilter === 'all' || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCustomers = customers.filter((c) => {
    const query = (globalAdminSearch || customerSearch).toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      c.role.toLowerCase().includes(query)
    );
  });

  // Security Gate & Onboarding Gateway on /admin
  if (!isAdmin) {
    const handleDirectAdminLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setAdminLoginError('');
      if (!adminAuthEmail.trim() || !adminAuthPassword.trim()) {
        setAdminLoginError('Please enter your admin email and password.');
        return;
      }
      try {
        setIsAdminLoggingIn(true);
        const loggedUser = await login(adminAuthEmail.trim(), adminAuthPassword);
        setIsAdminLoginModalOpen(false);

        if (loggedUser.role === 'admin' || loggedUser.role === 'superadmin') {
          showToast('Store Administrator Signed In', {
            message: 'Welcome to your verified merchant dashboard. You can now add and manage products.',
            type: 'success',
          });
        } else {
          // Check application status for customer
          const appRes = await superAdminService.getMyApplication().catch(() => ({ application: null }));
          setExistingApp(appRes.application);
          if (appRes.application?.status === 'APPROVED') {
            await refreshUser();
            showToast('Application Approved!', {
              message: 'Super Admin approved your account! You can now add products and manage your store.',
              type: 'success',
            });
          } else if (appRes.application?.status === 'PENDING') {
            showToast('Application Under Review', {
              message: 'Your seller application is currently pending Super Admin approval. Form status is displayed below.',
              type: 'info',
            });
          } else if (appRes.application?.status === 'REJECTED') {
            showToast('Application Needs Revision', {
              message: appRes.application.rejectionReason || 'Please review Super Admin feedback and resubmit.',
              type: 'error',
            });
          } else {
            showToast('Signed In', {
              message: 'Please complete the seller onboarding form below to request admin privileges.',
              type: 'info',
            });
          }
        }
      } catch (err: any) {
        setAdminLoginError(err?.message || 'Invalid administrator credentials');
      } finally {
        setIsAdminLoggingIn(false);
      }
    };

    const handleFillAdminDemo = () => {
      setAdminAuthEmail('admin@inbox.com');
      setAdminAuthPassword('Admin2026!');
      setAdminLoginError('');
    };

    const handleApplySellerSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!storeName.trim() || !legalName.trim() || !taxId.trim() || !businessAddress.trim() || !phone.trim()) {
        showToast('Missing details', { message: 'Please complete all required fields.', type: 'error' });
        return;
      }

      if (!user && (!applicantName.trim() || !applicantEmail.trim() || !applicantPassword.trim())) {
        showToast('Account credentials required', {
          message: 'Provide name, work email, and password to create your seller account.',
          type: 'error',
        });
        return;
      }

      try {
        setIsSubmittingApp(true);
        const res = await superAdminService.submitSellerApplication({
          storeName: storeName.trim(),
          legalName: legalName.trim(),
          taxId: taxId.trim(),
          category,
          phone: phone.trim(),
          businessAddress: businessAddress.trim(),
          description: description.trim(),
          email: !user ? applicantEmail.trim() : undefined,
          name: !user ? applicantName.trim() : undefined,
          password: !user ? applicantPassword.trim() : undefined,
        });

        setExistingApp(res.application);
        setIsApplyFormOpen(false);
        // Reset form inputs
        setStoreName('');
        setLegalName('');
        setTaxId('');
        setPhone('');
        setBusinessAddress('');
        setDescription('');
        setApplicantName('');
        setApplicantEmail('');
        setApplicantPassword('');

        showToast('Application Sent to Super Admin!', {
          message: 'Your application has entered the Super Admin review queue. You will receive admin access once verified.',
          type: 'success',
        });

        // Redirect to the default page (customer storefront home)
        onNavigate('home');
      } catch (err: any) {
        showToast('Submission Failed', {
          message: err?.message || 'Could not submit application.',
          type: 'error',
        });
      } finally {
        setIsSubmittingApp(false);
      }
    };

    const handleOpenSellerForm = () => {
      setIsApplyFormOpen(true);
      setTimeout(() => {
        document.getElementById('seller-application-form')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20 selection:bg-emerald-100 selection:text-emerald-900">
        {/* ======================================================== */}
        {/* 1. TOP HEADER (Real Merchant Portal Navigation)          */}
        {/* ======================================================== */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-[#008060] flex items-center justify-center text-white font-black text-sm shadow-xs">
              🏬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 leading-tight">inBox Sellers</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#008060] text-[10px] font-bold border border-emerald-200 uppercase tracking-wider">
                  Merchant Hub
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Official Multi-Vendor Merchant & Product Portal</p>
            </div>
          </div>

          {/* Top Right Action & Login Option */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="text-xs text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ← Customer Storefront
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-[11px] font-bold text-slate-900 leading-tight">{user.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono leading-tight">{user.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  title="Sign out of current account"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAdminLoginModalOpen(true)}
                className="px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
              >
                <KeyRound className="size-3.5" />
                <span>Admin Log In</span>
              </button>
            )}
          </div>
        </header>

        {/* ======================================================== */}
        {/* 2. HERO & ONBOARDING PROCESS (First Thing Admin Sees)     */}
        {/* ======================================================== */}
        <div className="max-w-5xl mx-auto px-4 pt-10 sm:pt-14">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-4 shadow-2xs">
              <Sparkles className="size-3.5 text-emerald-600" />
              <span>Verified Merchant Ecosystem</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Sell on inBox — Reach Millions of Verified Buyers
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
              Launch your official brand store, list your catalog, and grow your sales. To guarantee product authenticity, all new seller registrations are verified by the platform Super Admin (<code className="text-purple-700 font-mono text-xs font-semibold">s.admin</code>) before admin access is granted to add products.
            </p>
          </div>

          {/* The 4-Step Process Guide */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs mb-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  How to Become an Admin & Start Selling (4-Step Process)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Follow the standard marketplace onboarding lifecycle to get your store verified:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className={`p-4 rounded-2xl border text-left relative transition-all ${
                existingApp ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`size-7 rounded-full text-white flex items-center justify-center text-xs font-black ${
                    existingApp ? 'bg-emerald-600' : 'bg-indigo-600'
                  }`}>
                    {existingApp ? '✓' : '1'}
                  </span>
                  {existingApp && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      Completed
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-bold text-slate-900">Submit Application</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Provide your store name, business entity, tax ID (GSTIN/EIN), and address.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border text-left relative transition-all ${
                existingApp?.status === 'PENDING'
                  ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200/50 shadow-xs'
                  : existingApp?.status === 'APPROVED'
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`size-7 rounded-full text-white flex items-center justify-center text-xs font-black ${
                    existingApp?.status === 'APPROVED' ? 'bg-emerald-600' : 'bg-purple-600'
                  }`}>
                    {existingApp?.status === 'APPROVED' ? '✓' : '2'}
                  </span>
                  {existingApp?.status === 'PENDING' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-bold border border-amber-300 animate-pulse">
                      In Review
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-bold text-slate-900">Request Sent to S.Admin</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Your registration is routed to the Super Admin verification queue for KYC inspection.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border text-left relative transition-all ${
                existingApp?.status === 'APPROVED'
                  ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-200 shadow-xs'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`size-7 rounded-full text-white flex items-center justify-center text-xs font-black ${
                    existingApp?.status === 'APPROVED' ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}>
                    {existingApp?.status === 'APPROVED' ? '✓' : '3'}
                  </span>
                  {existingApp?.status === 'APPROVED' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      Approved!
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-bold text-slate-900">Super Admin Approves</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Platform Super Admin reviews credentials and promotes your account to Store Admin.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border text-left relative transition-all ${
                existingApp?.status === 'APPROVED' || isAdmin
                  ? 'bg-emerald-100/70 border-emerald-300 shadow-xs'
                  : 'bg-slate-50 border-slate-200 opacity-75'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="size-7 rounded-full bg-[#008060] text-white flex items-center justify-center text-xs font-black">
                    4
                  </span>
                  {(existingApp?.status === 'APPROVED' || isAdmin) && (
                    <span className="px-2 py-0.5 rounded-full bg-[#008060] text-white text-[10px] font-bold">
                      Unlocked
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-bold text-emerald-950">Admin Adds Items</h3>
                <p className="text-[11px] text-emerald-800 mt-1 leading-snug">
                  Log in to your merchant dashboard to add products, set pricing, and manage inventory!
                </p>
              </div>
            </div>

            {/* Prominent Action Bar Near The Process */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <ShieldCheck className="size-4 text-[#008060]" />
                <span>Zero upfront fees • Verified multi-vendor marketplace</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleOpenSellerForm}
                  className="flex-1 sm:flex-none px-6 py-3 bg-[#008060] hover:bg-[#006e52] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Store className="size-4" />
                  <span>{existingApp ? 'View Application Status' : 'Become a Seller — Apply Now'}</span>
                  <ChevronDown className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsAdminLoginModalOpen(true)}
                  className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Already an Admin? Log In</span>
                </button>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. SELLER APPLICATION FORM / STATUS SECTION              */}
          {/* ======================================================== */}
          {(isApplyFormOpen || existingApp) && (
            <div id="seller-application-form" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs mb-10 transition-all">
              {/* If existing application is PENDING */}
              {existingApp && existingApp.status === 'PENDING' ? (
                <div className="text-center py-6">
                  <div className="size-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 animate-pulse">
                    <Clock className="size-8" />
                  </div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider border border-amber-300 mb-2">
                    <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Form Status: Pending Super Admin Review</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    Application Under Review by Super Admin
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-2 mb-6">
                    We received your seller application for <strong className="text-slate-900">{existingApp.storeName}</strong>. The Super Admin must verify your business credentials before you are granted admin permissions to add items.
                  </p>

                  <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-2.5 mb-6 shadow-2xs">
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-500 font-medium">Store Name:</span>
                      <span className="text-slate-900 font-bold">{existingApp.storeName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-500 font-medium">Legal Entity:</span>
                      <span className="text-slate-900 font-semibold">{existingApp.legalName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-500 font-medium">Category:</span>
                      <span className="text-slate-800 font-medium">{existingApp.category}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-slate-500 font-medium">Tax ID / GSTIN:</span>
                      <span className="text-amber-800 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {existingApp.taxId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Submitted:</span>
                      <span className="text-slate-700">{new Date(existingApp.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={checkApplicationStatus}
                      disabled={isLoadingApp}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
                    >
                      <RefreshCw className={`size-3.5 ${isLoadingApp ? 'animate-spin' : ''}`} />
                      <span>{isLoadingApp ? 'Checking Status...' : 'Check For Approval'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-4">
                    Once approved by the Super Admin, log in or refresh your status to access the admin panel and add items.
                  </p>
                </div>
              ) : existingApp && existingApp.status === 'APPROVED' ? (
                <div className="text-center py-6">
                  <div className="size-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold uppercase tracking-wider border border-emerald-300 mb-2">
                    <span className="size-2 rounded-full bg-emerald-600" />
                    <span>Form Status: Approved by Super Admin</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    Application Approved! Welcome Store Admin
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-2 mb-6">
                    The platform Super Admin has verified your business credentials for <strong className="text-slate-900">{existingApp.storeName}</strong>. You now have full permission to add items and manage your store.
                  </p>
                  <button
                    onClick={async () => {
                      await refreshUser();
                    }}
                    className="px-6 py-3 bg-[#008060] hover:bg-[#006e52] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer inline-flex items-center gap-2"
                  >
                    <Plus className="size-4" />
                    <span>Enter Admin Dashboard & Add Products</span>
                  </button>
                </div>
              ) : existingApp && existingApp.status === 'SUSPENDED' ? (
                <div className="text-center py-6">
                  <div className="size-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
                    <AlertTriangle className="size-8" />
                  </div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-100 text-rose-900 text-xs font-bold uppercase tracking-wider border border-rose-300 mb-2">
                    <span className="size-2 rounded-full bg-rose-600 animate-ping" />
                    <span>Form Status: Store Suspended by Super Admin</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    Seller Account & Store Suspended
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-2 mb-6">
                    Your store <strong className="text-slate-900">{existingApp.storeName}</strong> has been temporarily suspended by the platform Super Admin. Your catalog items are currently hidden from buyers, and product creation is paused.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={checkApplicationStatus}
                      disabled={isLoadingApp}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
                    >
                      <RefreshCw className={`size-3.5 ${isLoadingApp ? 'animate-spin' : ''}`} />
                      <span>{isLoadingApp ? 'Checking Status...' : 'Check For Reinstatement'}</span>
                    </button>
                  </div>
                </div>
              ) : existingApp && existingApp.status === 'REJECTED' ? (
                <div className="text-center py-6">
                  <div className="size-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
                    <XCircle className="size-8" />
                  </div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-100 text-rose-900 text-xs font-bold uppercase tracking-wider border border-rose-300 mb-2">
                    <span>Form Status: Needs Revision / Rejected</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    Application Requires Attention
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-2 mb-4">
                    The Super Admin could not approve the application with the current credentials.
                  </p>
                  {existingApp.rejectionReason && (
                    <div className="max-w-md mx-auto bg-rose-50 border border-rose-200 rounded-2xl p-4 text-left text-xs text-rose-800 mb-6">
                      <strong className="block font-bold mb-1">Super Admin Note:</strong>
                      <span>{existingApp.rejectionReason}</span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setExistingApp(null);
                      setIsApplyFormOpen(true);
                    }}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Update & Resubmit Application</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div className="border-b border-slate-100 pb-5 mb-6">
                    <div className="flex items-center gap-2 text-[#008060] font-bold text-xs uppercase tracking-wider mb-1">
                      <Building2 className="size-4" />
                      <span>Step 1 • Merchant KYC Application</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900">
                      Seller Onboarding & KYC Registration
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Complete this application. It is sent directly to the Super Admin verification queue. Once verified, you will be granted access to add items.
                    </p>
                  </div>

                  <form onSubmit={handleApplySellerSubmit} className="space-y-5">
                    {/* Guest account creation fields if not logged in */}
                    {!user && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center gap-2 text-slate-900 text-xs font-bold">
                          <UserIcon className="size-4 text-[#008060]" />
                          <span>Account Owner Credentials</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name *</label>
                            <input
                              type="text"
                              required
                              value={applicantName}
                              onChange={(e) => setApplicantName(e.target.value)}
                              placeholder="Alex Morgan"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008060]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Work Email *</label>
                            <input
                              type="email"
                              required
                              value={applicantEmail}
                              onChange={(e) => setApplicantEmail(e.target.value)}
                              placeholder="seller@brand.com"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008060]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Account Password *</label>
                            <input
                              type="password"
                              required
                              value={applicantPassword}
                              onChange={(e) => setApplicantPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008060]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Store & Legal Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Store className="size-3.5 text-[#008060]" />
                          Public Store Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={storeName}
                          onChange={(e) => setStoreName(e.target.value)}
                          placeholder="e.g. Apex Tech Essentials"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008060]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Building2 className="size-3.5 text-[#008060]" />
                          Registered Legal Entity Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={legalName}
                          onChange={(e) => setLegalName(e.target.value)}
                          placeholder="e.g. Apex Logistics Technologies LLC"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008060]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <FileText className="size-3.5 text-[#008060]" />
                          Tax ID / GSTIN / EIN *
                        </label>
                        <input
                          type="text"
                          required
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          placeholder="27AABCA1234F1Z5"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008060] uppercase font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Phone className="size-3.5 text-[#008060]" />
                          Business Contact Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 234-5678"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008060]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Product Category *
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#008060] cursor-pointer"
                        >
                          <option value="Electronics">Electronics & Gadgets</option>
                          <option value="Fashion">Fashion & Apparel</option>
                          <option value="Home & Living">Home & Living</option>
                          <option value="Beauty">Beauty & Personal Care</option>
                          <option value="Sports">Sports & Outdoors</option>
                          <option value="General">General Merchandise</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-[#008060]" />
                        Registered Business Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        placeholder="Street Address, City, State/Province, Country"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008060]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Product Description & Catalog Pitch (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the items you intend to list, manufacturing details, or existing store volume..."
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008060]"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <ShieldCheck className="size-4 text-emerald-600" />
                        <span>Form goes directly to Super Admin verification queue.</span>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingApp}
                        className="w-full sm:w-auto px-8 py-3 bg-[#008060] hover:bg-[#006e52] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSubmittingApp ? (
                          <span>Sending to Super Admin...</span>
                        ) : (
                          <>
                            <span>Submit Application to Super Admin</span>
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 4. TOP RIGHT ADMIN LOGIN MODAL                           */}
        {/* ======================================================== */}
        {isAdminLoginModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-7 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsAdminLoginModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>

              <div className="size-12 bg-emerald-50 text-[#008060] rounded-2xl flex items-center justify-center mb-4 border border-emerald-200 shadow-inner">
                <Store className="size-6" />
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                Authorized Merchant Portal
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2.5 mb-1">Store Admin Sign In</h2>
              <p className="text-xs text-slate-500 mb-4">
                Access your merchant panel to manage product SKUs, adjust prices, and fulfill orders.
              </p>

              {/* Demo Helper Button */}
              <div className="mb-4 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-emerald-900">Demo Store Admin</p>
                  <p className="text-[10px] text-emerald-700 font-mono">admin@inbox.com</p>
                </div>
                <button
                  type="button"
                  onClick={handleFillAdminDemo}
                  className="px-2.5 py-1.5 bg-[#008060] hover:bg-[#006e52] text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Fill Credentials
                </button>
              </div>

              {adminLoginError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-rose-600" />
                  <span>{adminLoginError}</span>
                </div>
              )}

              <form onSubmit={handleDirectAdminLogin} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admin Email</label>
                  <div className="relative">
                    <Mail className="size-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={adminAuthEmail}
                      onChange={(e) => setAdminAuthEmail(e.target.value)}
                      placeholder="admin@inbox.com"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="size-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={adminAuthPassword}
                      onChange={(e) => setAdminAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showAdminPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAdminLoggingIn}
                  className="w-full py-3 bg-[#008060] hover:bg-[#006e52] disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="size-4" />
                  <span>{isAdminLoggingIn ? 'Verifying Admin Access...' : 'Sign In to Admin Panel'}</span>
                </button>

                <div className="pt-2 text-center">
                  <p className="text-xs text-slate-500">
                    Not an admin yet?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminLoginModalOpen(false);
                        handleOpenSellerForm();
                      }}
                      className="text-[#008060] font-bold hover:underline cursor-pointer"
                    >
                      Become a Seller — Apply Now →
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F6F6F7] text-[#202223] font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* ======================================================== */}
      {/* 1. MERCHANT POLARIS LEFT SIDEBAR (Desktop Light Mode)     */}
      {/* ======================================================== */}
      <aside className="hidden lg:flex w-64 bg-white text-slate-600 flex-col shrink-0 sticky top-0 h-screen select-none z-30 border-r border-slate-200">
        {/* Store Brand / Switcher */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[#008060] flex items-center justify-center text-white font-black text-xs shadow-inner">
                🏬
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {user?.storeName || existingApp?.storeName || 'inBox Emporium'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-emerald-600 font-medium">Verified by S.Admin</span>
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#008060] text-[10px] font-bold">
              Merchant
            </span>
          </div>
        </div>

        {/* Polaris Search Input inside Sidebar */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search or jump to..."
              value={globalAdminSearch}
              onChange={(e) => setGlobalAdminSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 rounded-lg border border-slate-200 focus:outline-none focus:border-[#008060]"
            />
          </div>
        </div>

        {/* Primary Navigation Links */}
        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
          {[
            { id: 'overview', label: 'Home', icon: Home, count: null },
            { id: 'orders', label: 'Orders', icon: ShoppingCart, count: orders.length },
            { id: 'products', label: 'Products', icon: Tag, count: displayProducts.length },
            { id: 'customers', label: 'Customers', icon: Users, count: customers.length },
            { id: 'analytics', label: 'Analytics', icon: BarChart3, count: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`size-4 ${isActive ? 'text-[#008060]' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== null && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isActive ? 'bg-[#008060] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Sales Channels Group */}
          <div className="pt-4 pb-1 px-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Sales Channels
            </span>
          </div>

          {/* Online Store link (Storefront preview) */}
          <button
            onClick={() => onNavigate('home')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-950 hover:bg-slate-50 group transition-colors cursor-pointer"
            title="Preview your live storefront as a customer"
          >
            <div className="flex items-center gap-2.5">
              <Globe className="size-4 text-slate-400 group-hover:text-emerald-600" />
              <span>Online Store</span>
            </div>
            <Eye className="size-3.5 text-slate-400 group-hover:text-emerald-600" />
          </button>
        </nav>

        {/* Sidebar Footer: Database Status & Admin Profile */}
        <div className="p-3 border-t border-slate-200 space-y-2.5 bg-slate-50/70">
          <div className="flex items-center justify-between px-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[10px]">PostgreSQL :5432</span>
            </span>
            <span className="text-[10px] text-emerald-700 font-bold">Connected</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-full bg-[#008060] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                  {user?.name || 'Store Administrator'}
                </p>
                <p className="text-[10px] text-slate-500 truncate leading-tight font-mono">
                  {user?.email || 'admin@inbox.com'}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sign out of Merchant Admin"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN ADMIN WORKSPACE AREA                             */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Merchant Top Header Bar */}
        <header className="h-14 bg-white border-b border-[#E1E3E5] px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <div onClick={() => onNavigate('home')} className="cursor-pointer">
                <BrandLogo size="sm" />
              </div>
              <span className="px-2 py-0.5 rounded bg-[#008060] text-white text-[10px] font-bold">
                Admin
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-neutral-500">
              <span>Merchant Admin</span>
              <ChevronRight className="size-3.5 text-neutral-400" />
              <span className="text-[#202223] font-bold text-xs capitalize">
                {activeTab === 'overview' && 'Home Overview'}
                {activeTab === 'orders' && 'Orders Fulfillment'}
                {activeTab === 'products' && 'Product Inventory'}
                {activeTab === 'customers' && 'Customer Accounts'}
                {activeTab === 'analytics' && 'Financial Analytics'}
              </span>
            </div>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-2.5">
            {/* Language Switcher */}
            <div className="hidden sm:block">
              <LanguageSelector variant="segmented" />
            </div>

            {/* Refresh Data */}
            <button
              onClick={refreshAdminData}
              className="p-1.5 text-neutral-500 hover:text-[#202223] hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh database records"
            >
              <RefreshCw className="size-4" />
            </button>

            {/* Primary Action Button */}
            <button
              onClick={handleOpenAddProduct}
              disabled={user?.sellerStatus === 'SUSPENDED'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-white text-xs font-bold rounded-lg shadow-xs transition-colors ${
                user?.sellerStatus === 'SUSPENDED'
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-[#008060] hover:bg-[#006e52] cursor-pointer'
              }`}
              title={user?.sellerStatus === 'SUSPENDED' ? 'Store is suspended by Super Admin' : 'Add product'}
            >
              <Plus className="size-3.5" />
              <span>Add product</span>
            </button>

            {/* Mobile Storefront Preview */}
            <button
              onClick={() => onNavigate('home')}
              className="lg:hidden p-1.5 text-neutral-600 hover:text-[#008060] hover:bg-neutral-100 rounded-lg cursor-pointer"
              title="View Storefront"
            >
              <Eye className="size-4" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Bar */}
        <div className="lg:hidden flex items-center gap-1 px-3 py-2 bg-[#1A1A1A] border-b border-[#2C2C2C] overflow-x-auto text-white">
          {[
            { id: 'overview', label: 'Home', icon: Home },
            { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingCart },
            { id: 'products', label: `Products (${displayProducts.length})`, icon: Tag },
            { id: 'customers', label: `Customers (${customers.length})`, icon: Users },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                  isActive ? 'bg-[#008060] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1500px] w-full mx-auto">
          {/* Suspended Alert Banner */}
          {user?.sellerStatus === 'SUSPENDED' && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5">
                <div className="size-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="size-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-rose-950">
                      Store Suspended by Platform Super Admin
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-extrabold uppercase tracking-wider">
                      Storefront Inactive
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 mt-1 max-w-2xl leading-relaxed">
                    Your seller privileges and catalog visibility have been temporarily suspended. Your existing items are paused and hidden from the customer storefront, and adding new products is restricted.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={async () => {
                    await refreshUser();
                    refreshAdminData();
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-rose-100 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Check Reinstatement</span>
                </button>
              </div>
            </div>
          )}
          {/* Super Admin Approval Confirmation Banner */}
          {!isApprovalBannerDismissed && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-white border border-emerald-300/80 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="size-10 rounded-xl bg-[#008060] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Seller Application Approved by Super Admin!
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#008060] text-[10px] font-extrabold border border-emerald-300 uppercase tracking-wider">
                      Verified Store
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Super Admin approved your merchant credentials for <strong className="text-slate-900">{user?.storeName || existingApp?.storeName || 'Your Store'}</strong>. Your admin access is fully active — you can now add items to your catalog, set pricing, and manage inventory.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2.5 bg-[#008060] hover:bg-[#006e52] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="size-4" />
                  <span>Add First Product</span>
                </button>
                <button
                  onClick={() => setIsApprovalBannerDismissed(true)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  title="Dismiss banner"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* Section Breadcrumb & Title Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E1E3E5] mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#202223] tracking-tight">
                {activeTab === 'overview' && 'Home'}
                {activeTab === 'orders' && 'Orders'}
                {activeTab === 'products' && 'Products & Inventory'}
                {activeTab === 'customers' && 'Customers'}
                {activeTab === 'analytics' && 'Financial Analytics & Trends'}
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Real-time synchronized PostgreSQL catalog and order fulfillment metrics.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshAdminData}
                className="px-3 py-1.5 bg-white border border-[#D2D5D8] hover:bg-neutral-50 text-[#202223] text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="size-3.5 text-neutral-500" />
                <span>Refresh</span>
              </button>
              {activeTab === 'products' && (
                <button
                  onClick={handleOpenAddProduct}
                  className="px-3.5 py-1.5 bg-[#008060] hover:bg-[#006e52] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>Add product</span>
                </button>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/* TAB 1: MERCHANT HOME / OVERVIEW                          */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              {/* Top KPI Cards (Merchant Metrics) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-[#E1E3E5] shadow-xs">
                  <div className="flex items-center justify-between text-neutral-500 mb-2">
                    <span className="text-xs font-semibold">Total Sales</span>
                    <DollarSign className="size-4 text-[#008060]" />
                  </div>
                  <div className="text-2xl font-black text-[#202223]">
                    ${totalSales.toFixed(2)}
                  </div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#E4F8F0] text-[#007A5A]">
                    Authoritative Paid Revenue
                  </span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-[#E1E3E5] shadow-xs">
                  <div className="flex items-center justify-between text-neutral-500 mb-2">
                    <span className="text-xs font-semibold">Total Orders</span>
                    <ShoppingCart className="size-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-[#202223]">
                    {totalOrdersCount}
                  </div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                    {pendingOrdersCount} Unfulfilled / Pending
                  </span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-[#E1E3E5] shadow-xs">
                  <div className="flex items-center justify-between text-neutral-500 mb-2">
                    <span className="text-xs font-semibold">Active SKUs</span>
                    <Tag className="size-4 text-orange-600" />
                  </div>
                  <div className="text-2xl font-black text-[#202223]">
                    {displayProducts.length}
                  </div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                    {CATEGORIES.length} Departments
                  </span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-[#E1E3E5] shadow-xs">
                  <div className="flex items-center justify-between text-neutral-500 mb-2">
                    <span className="text-xs font-semibold">Inventory Alerts</span>
                    <AlertTriangle className="size-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-600">
                    {lowStockCount}
                  </div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF4E5] text-[#A84A00]">
                    ≤ 10 Units Remaining
                  </span>
                </div>
              </div>

              {/* Low Stock Urgency Table */}
              {lowStockProducts.length > 0 && (
                <div className="bg-white rounded-xl border border-[#FED8B1] shadow-xs overflow-hidden">
                  <div className="px-5 py-3.5 bg-[#FFF9F2] border-b border-[#FED8B1] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#A84A00]">
                      <AlertTriangle className="size-4" />
                      <h3 className="text-xs font-bold">Items Requiring Immediate Inventory Replenishment</h3>
                    </div>
                    <span className="text-xs font-bold text-[#A84A00]">
                      {lowStockProducts.length} products
                    </span>
                  </div>
                  <div className="divide-y divide-[#E1E3E5]">
                    {lowStockProducts.slice(0, 5).map((p) => (
                      <div key={p.id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-[#FAFBFB] transition-colors">
                        <div className="flex items-center gap-3">
                          <img src={p.images[0]} alt={p.name} className="size-10 object-cover rounded-lg border border-[#E1E3E5]" />
                          <div>
                            <p className="font-bold text-[#202223]">{p.name}</p>
                            <p className="text-[11px] text-neutral-500">{p.brand} • {tCategory(p.category)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-full bg-[#FFF4E5] text-[#A84A00] font-black text-[11px]">
                            {p.stock} in stock
                          </span>
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="px-3 py-1 bg-[#202223] hover:bg-neutral-800 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            Edit SKU
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Orders Overview */}
              <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-xs overflow-hidden">
                <div className="p-5 border-b border-[#E1E3E5] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#202223]">Latest Customer Orders</h3>
                    <p className="text-xs text-neutral-500">Live order progression and COD collections</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[#008060] hover:underline cursor-pointer"
                  >
                    View all orders →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAFBFB] text-neutral-500 font-bold uppercase text-[10px] border-b border-[#E1E3E5]">
                        <th className="py-2.5 px-4">Order</th>
                        <th className="py-2.5 px-4">Customer</th>
                        <th className="py-2.5 px-4">Payment</th>
                        <th className="py-2.5 px-4">Fulfillment</th>
                        <th className="py-2.5 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E3E5]">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-neutral-400">
                            No orders placed yet for your store items.
                          </td>
                        </tr>
                      ) : (
                        orders.slice(0, 5).map((o) => (
                          <tr key={o.id} className="hover:bg-[#FAFBFB] transition-colors">
                            <td className="py-3 px-4 font-bold text-[#202223] font-mono">#{o.id}</td>
                            <td className="py-3 px-4 font-semibold text-neutral-700">{o.customerName}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  o.paymentStatus === 'Paid'
                                    ? 'bg-[#E4F8F0] text-[#007A5A]'
                                    : 'bg-[#FFF5EA] text-[#B95000]'
                                }`}
                              >
                                {o.paymentStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-neutral-700">{tStatus(o.status)}</td>
                            <td className="py-3 px-4 text-right font-black text-[#202223]">
                              ${o.total.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 2: ORDERS FULFILLMENT                                */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#E1E3E5] flex flex-col md:flex-row items-center justify-between gap-3 bg-[#FAFBFB]">
                <div className="relative w-full md:w-96">
                  <Search className="size-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter orders by ID, customer name, email..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[#D2D5D8] bg-white focus:outline-none focus:border-[#008060]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-[#D2D5D8] bg-white font-semibold text-neutral-700 cursor-pointer focus:outline-none focus:border-[#008060]"
                  >
                    <option value="all">All Fulfillment Statuses ({orders.length})</option>
                    {ORDER_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {tStatus(st)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAFBFB] text-neutral-500 font-bold uppercase text-[10px] border-b border-[#E1E3E5]">
                      <th className="py-3 px-4">Order ID & Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Fulfillment Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E3E5]">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-500">
                          <div className="max-w-sm mx-auto flex flex-col items-center gap-2">
                            <div className="size-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center">
                              <ShoppingCart className="size-6" />
                            </div>
                            <h4 className="text-sm font-bold text-neutral-800">No Orders Placed Yet</h4>
                            <p className="text-xs text-neutral-500">
                              When customers place orders for items from your store, they will appear here in real-time.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#FAFBFB] transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#202223] block">#{ord.id}</span>
                          <span className="text-[10px] text-neutral-400 block">{new Date(ord.date).toLocaleDateString()}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#202223] block">{ord.customerName}</span>
                          <span className="text-[11px] text-neutral-400 block font-mono">{ord.customerEmail}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-black text-[#202223]">${ord.total.toFixed(2)}</span>
                          <span className="text-[10px] text-neutral-400 block">{ord.paymentMethod}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                              ord.paymentStatus === 'Paid'
                                ? 'bg-[#E4F8F0] text-[#007A5A] border border-[#B7EBD7]'
                                : 'bg-[#FFF5EA] text-[#B95000] border border-[#FED8B1]'
                            }`}
                          >
                            {ord.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                            className="px-2.5 py-1 text-xs rounded-lg font-bold border border-[#D2D5D8] bg-white cursor-pointer focus:outline-none focus:border-[#008060]"
                          >
                            {ORDER_STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st}>
                                {tStatus(st)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {ord.paymentStatus === 'Pending' &&
                              (ord.paymentMethod?.toLowerCase().includes('cash') ||
                                ord.paymentMethod?.toLowerCase().includes('cod')) && (
                                <button
                                  onClick={() => handleCollectCodPayment(ord.id)}
                                  className="px-2.5 py-1 rounded-lg bg-[#008060] hover:bg-[#006e52] text-white font-bold text-[10px] cursor-pointer shadow-xs"
                                >
                                  Collect COD
                                </button>
                              )}
                            <button
                              onClick={() => onNavigate('order-tracking', ord.id)}
                              className="px-3 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-[11px] cursor-pointer"
                            >
                              Track
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 3: PRODUCTS & INVENTORY                             */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'products' && (
            <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#E1E3E5] flex flex-col md:flex-row items-center justify-between gap-3 bg-[#FAFBFB]">
                <div className="relative w-full md:w-96">
                  <Search className="size-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search products by title, brand, or department..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[#D2D5D8] bg-white focus:outline-none focus:border-[#008060]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg border border-[#D2D5D8] bg-white font-semibold text-neutral-700 cursor-pointer focus:outline-none focus:border-[#008060]"
                  >
                    <option value="all">All Departments ({displayProducts.length})</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {tCategory(c)}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleOpenAddProduct}
                    className="px-3.5 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="size-4" />
                    <span>Add product</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAFBFB] text-neutral-500 font-bold uppercase text-[10px] border-b border-[#E1E3E5]">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Inventory</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E3E5]">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-neutral-500">
                          <div className="max-w-sm mx-auto flex flex-col items-center gap-3">
                            <div className="size-12 rounded-full bg-emerald-50 text-[#008060] flex items-center justify-center">
                              <Tag className="size-6" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-neutral-800">No Products in Your Catalog Yet</h4>
                              <p className="text-xs text-neutral-500 mt-1">
                                {user?.storeName ? `Start adding items to ${user.storeName}'s catalog to begin selling.` : 'Add your first product to start selling.'}
                              </p>
                            </div>
                            <button
                              onClick={handleOpenAddProduct}
                              className="mt-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Plus className="size-4" />
                              <span>Add First Product</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAFBFB] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="size-10 object-cover rounded-lg border border-[#E1E3E5] shrink-0"
                            />
                            <div>
                              <span className="font-bold text-[#202223] block max-w-xs sm:max-w-md truncate">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-neutral-400 block">{p.brand}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-semibold text-[11px]">
                            {tCategory(p.category)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#202223]">${p.price.toFixed(2)}</span>
                          {p.originalPrice > p.price && (
                            <span className="text-[10px] text-neutral-400 line-through block">
                              ${p.originalPrice.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                              p.stock === 0
                                ? 'bg-rose-100 text-rose-800'
                                : p.stock <= 10
                                ? 'bg-[#FFF4E5] text-[#A84A00]'
                                : 'bg-[#E4F8F0] text-[#007A5A]'
                            }`}
                          >
                            {p.stock === 0 ? 'Out of Stock' : `${p.stock} in stock`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditProduct(p)}
                              className="p-1.5 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit SKU"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Archive SKU"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 4: CUSTOMERS DIRECTORY                              */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'customers' && (
            <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#E1E3E5] flex flex-col md:flex-row items-center justify-between gap-3 bg-[#FAFBFB]">
                <div className="relative w-full md:w-96">
                  <Search className="size-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search customers by name, email, phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[#D2D5D8] bg-white focus:outline-none focus:border-[#008060]"
                  />
                </div>
                <span className="text-xs text-neutral-500 font-semibold">
                  {filteredCustomers.length} registered customers
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAFBFB] text-neutral-500 font-bold uppercase text-[10px] border-b border-[#E1E3E5]">
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Orders</th>
                      <th className="py-3 px-4">Total Spent</th>
                      <th className="py-3 px-4 text-right">Customer Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E3E5]">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-500">
                          <div className="max-w-sm mx-auto flex flex-col items-center gap-2">
                            <div className="size-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center">
                              <Users className="size-6" />
                            </div>
                            <h4 className="text-sm font-bold text-neutral-800">No Customer Records Yet</h4>
                            <p className="text-xs text-neutral-500">
                              Customers who purchase items from your store will be listed here automatically.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-[#FAFBFB] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-neutral-100 border border-[#E1E3E5] flex items-center justify-center font-bold text-neutral-700">
                              {cust.avatarUrl ? (
                                <img src={cust.avatarUrl} alt={cust.name} className="size-full object-cover rounded-full" />
                              ) : (
                                cust.name.slice(0, 1).toUpperCase()
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-[#202223] block">{cust.name}</span>
                              <span className="text-[11px] text-neutral-400 block font-mono">{cust.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-neutral-600">{cust.phone || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              cust.role === 'admin'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-[#E4F8F0] text-[#007A5A] border border-[#B7EBD7]'
                            }`}
                          >
                            {tRole(cust.role)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-[#202223]">{cust.orderCount} orders</td>
                        <td className="py-3 px-4 font-black text-[#202223]">${cust.totalSpent.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-neutral-400">
                          {new Date(cust.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 5: FINANCIAL ANALYTICS & TRENDS                     */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-[#E1E3E5] shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#202223]">Revenue Performance Trends ($)</h3>
                      <p className="text-xs text-neutral-400">Quarterly growth simulation based on orders</p>
                    </div>
                    <span className="text-xs font-bold text-[#007A5A] bg-[#E4F8F0] px-2 py-0.5 rounded">
                      +24% YoY
                    </span>
                  </div>

                  <div className="h-52 w-full pt-4">
                    <div className="flex items-end justify-between h-40 gap-3 px-2 border-b border-neutral-100">
                      {[
                        { month: 'Nov', val: 3200, height: '40%' },
                        { month: 'Dec', val: 5800, height: '75%' },
                        { month: 'Jan', val: 4100, height: '52%' },
                        { month: 'Feb', val: 4900, height: '64%' },
                        { month: 'Mar', val: 7600, height: '95%' },
                        { month: 'Apr', val: 6800, height: '85%' },
                      ].map((d) => (
                        <div key={d.month} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="text-[10px] font-bold text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            ${d.val}
                          </div>
                          <div
                            className="w-full bg-[#008060] rounded-t-lg group-hover:bg-[#006e52] transition-all duration-300"
                            style={{ height: d.height }}
                          />
                          <span className="text-[11px] font-semibold text-neutral-500">{d.month}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-[#E1E3E5] shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#202223]">Department Share Distribution</h3>
                      <p className="text-xs text-neutral-400">{displayProducts.length} active SKUs in database</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    {CATEGORIES.slice(0, 6).map((cat: ProductCategory, idx: number) => {
                      const count = displayProducts.filter((p) => p.category === cat).length;
                      const pct = Math.round((count / (displayProducts.length || 1)) * 100);
                      const colors = ['bg-[#008060]', 'bg-blue-600', 'bg-purple-600', 'bg-orange-500', 'bg-amber-500', 'bg-sky-500'];
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold text-neutral-700">{tCategory(cat)}</span>
                            <span className="text-neutral-400 font-mono">{count} items ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                            <div className={`h-full ${colors[idx % colors.length]} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* 3. MERCHANT PRODUCT ADD / EDIT MODAL                     */}
      {/* ======================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 border border-[#E1E3E5] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-bold text-[#202223] mb-1">
              {editingProductId ? 'Edit Product SKU' : 'Add New Product'}
            </h3>
            <p className="text-xs text-neutral-400">
              Changes sync immediately to PostgreSQL and the customer storefront.
            </p>

            <form onSubmit={handleSaveProduct} className="flex flex-col gap-3 text-xs mt-4">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D2D5D8] focus:outline-none focus:border-[#008060]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Brand / Vendor</label>
                  <input
                    type="text"
                    required
                    value={pBrand}
                    onChange={(e) => setPBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D2D5D8] focus:outline-none focus:border-[#008060]"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Department</label>
                  <select
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D2D5D8] focus:outline-none focus:border-[#008060] bg-white cursor-pointer"
                  >
                    {CATEGORIES.map((c: ProductCategory) => (
                      <option key={c} value={c}>
                        {tCategory(c)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D2D5D8] focus:outline-none focus:border-[#008060]"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Compare-at ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={pOriginalPrice}
                    onChange={(e) => setPOriginalPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D2D5D8] focus:outline-none focus:border-[#008060]"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Available Qty</label>
                  <input
                    type="number"
                    required
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D2D5D8] focus:outline-none focus:border-[#008060]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Image URL</label>
                <input
                  type="url"
                  required
                  value={pImage}
                  onChange={(e) => setPImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-lg border border-[#D2D5D8] focus:outline-none focus:border-[#008060]"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={pDesc}
                  onChange={(e) => setPDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D2D5D8] focus:outline-none focus:border-[#008060]"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#008060] hover:bg-[#006e52] text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Save Product
                </button>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 border border-[#D2D5D8] text-neutral-600 rounded-lg text-xs font-bold cursor-pointer hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
