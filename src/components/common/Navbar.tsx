import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BrandLogo } from './BrandLogo';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { Product, ProductCategory } from '../../types';
import {
  Search,
  ShoppingCart,
  Heart,
  User as UserIcon,
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Package,
  LogOut,
  MapPin,
  Sparkles,
  Zap,
  Store,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
  products: Product[];
  onOpenAuthModal: () => void;
}

export const CATEGORIES: ProductCategory[] = [
  'Electronics',
  'Fashion',
  'Beauty',
  'Home & Kitchen',
  'Grocery',
  'Sports',
  'Books',
  'Accessories',
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  products,
  onOpenAuthModal,
}) => {
  const { user, isAuthenticated, isAdmin, isSuperAdmin, logout } = useAuth();
  const { totalItemsCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { t, tCategory } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products for suggestions
  const searchSuggestions = searchQuery.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      setShowSuggestions(false);
      onNavigate('products', `search:${encodeURIComponent(q)}`);
    }
  };

  const handleSelectSuggestion = (product: Product) => {
    setSearchQuery('');
    setShowSuggestions(false);
    onNavigate('product-details', product.id);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Main Navigation Row */}
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Brand Logo */}
          <div
            onClick={() => onNavigate('home')}
            className="cursor-pointer shrink-0 transition-opacity hover:opacity-90"
          >
            <BrandLogo size="md" />
          </div>

          {/* Center: Search Bar with Suggestions */}
          <div ref={searchRef} className="hidden md:flex flex-1 max-w-xl relative">
            <form onSubmit={handleSearchSubmit} className="w-full relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder={t('nav.searchPlaceholder')}
                className="w-full pl-10 pr-24 py-2.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white rounded-xl text-sm border border-slate-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
              />
              <Search className="size-4 text-slate-400 absolute left-3 pointer-events-none" />
              <button
                type="submit"
                className="absolute right-1.5 px-3 py-1.5 bg-[#E84A27] hover:bg-[#d43f1f] text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                {t('nav.searchButton')}
              </button>
            </form>

            {/* Live Autocomplete Dropdown */}
            {showSuggestions && searchQuery.trim() && (
              <div className="absolute top-full inset-x-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
                {searchSuggestions.length > 0 ? (
                  <div className="py-2">
                    <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {t('nav.matchingProducts')}
                    </div>
                    {searchSuggestions.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => handleSelectSuggestion(prod)}
                        className="px-3 py-2 hover:bg-orange-50/70 cursor-pointer flex items-center gap-3 transition-colors"
                      >
                        <img
                          src={prod.images[0]}
                          alt={prod.name}
                          className="size-9 object-cover rounded-md border border-slate-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {prod.brand} • <span className="font-semibold text-orange-600">${prod.price.toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                    <div
                      onClick={handleSearchSubmit}
                      className="px-3 py-2 border-t border-slate-100 text-xs font-bold text-orange-600 hover:bg-slate-50 text-center cursor-pointer"
                    >
                      {t('nav.viewAllResults', { query: searchQuery })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    {t('nav.noMatchingProducts', { query: searchQuery })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language Selector Dropdown */}
            <LanguageSelector variant="dropdown" className="shrink-0" />
            {/* Wishlist Icon */}
            <button
              onClick={() => onNavigate('wishlist')}
              className="relative p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-rose-600 transition-colors cursor-pointer"
              aria-label={t('nav.savedWishlist')}
              title={t('nav.savedWishlist')}
            >
              <Heart className="size-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shadow-xs animate-scale">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart Icon */}
            <button
              onClick={() => onNavigate('cart')}
              className="relative p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-orange-600 transition-colors cursor-pointer"
              aria-label={t('nav.shoppingCart')}
              title={t('nav.shoppingCart')}
            >
              <ShoppingCart className="size-5" />
              {totalItemsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-[#E84A27] text-white text-[10px] font-extrabold shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </button>

            {/* User Profile / Login Dropdown */}
            <div ref={userMenuRef} className="relative">
              {isAuthenticated && user ? (
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                >
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                    alt={user.name}
                    className="size-7 rounded-full object-cover border border-slate-300"
                  />
                  <span className="hidden lg:inline text-xs font-bold text-slate-800 max-w-[100px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="size-3.5 text-slate-400" />
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('login', currentTab !== 'login' ? currentTab : undefined)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <UserIcon className="size-3.5" />
                  <span>{t('nav.signIn')}</span>
                </button>
              )}

              {/* User Dropdown Menu */}
              {userDropdownOpen && isAuthenticated && user && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    {isAdmin && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[9px] uppercase">
                        {t('nav.adminRole')}
                      </span>
                    )}
                  </div>

                  <div className="py-1">
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onNavigate(isSuperAdmin ? 'super-admin' : 'admin');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50 flex items-center gap-2 cursor-pointer border-b border-slate-100"
                      >
                        <ShieldCheck className="size-4 text-sky-600" />
                        <span>{isSuperAdmin ? 'Super Admin Console' : 'Admin Portal'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('profile');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="size-4 text-slate-400" />
                      {t('nav.myProfile')}
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('orders');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Package className="size-4 text-slate-400" />
                      {t('nav.myOrders')}
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('wishlist');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Heart className="size-4 text-slate-400" />
                      {t('nav.wishlistWithCount', { count: wishlistCount })}
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="size-4 text-rose-500" />
                      {t('nav.signOut')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 md:hidden hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (only visible on mobile screens) */}
        <div className="mt-2.5 md:hidden">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('nav.searchMobilePlaceholder')}
              className="w-full pl-9 pr-16 py-2 bg-slate-100 rounded-xl text-xs border border-slate-200 focus:outline-none focus:border-orange-500"
            />
            <Search className="size-4 text-slate-400 absolute left-2.5" />
            <button
              type="submit"
              className="absolute right-1 px-2.5 py-1 bg-[#E84A27] text-white text-[11px] font-bold rounded-lg cursor-pointer"
            >
              {t('nav.go')}
            </button>
          </form>

          {/* Quick horizontal categories swipe bar on mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 mt-1">
            <button
              onClick={() => onNavigate('products')}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
            >
              {t('nav.allProducts')}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onNavigate('products', cat)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 text-[11px] font-medium shrink-0 transition-colors cursor-pointer"
              >
                {tCategory(cat)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-Navigation: Categories Bar (Desktop) */}
      <div className="hidden md:block bg-slate-50/80 border-t border-slate-200/60 px-4 sm:px-6">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            <button
              onClick={() => onNavigate('home')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                currentTab === 'home' ? 'bg-white text-orange-600 shadow-xs font-bold' : 'hover:text-slate-950'
              }`}
            >
              {t('nav.home')}
            </button>

            <button
              onClick={() => onNavigate('products')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                currentTab === 'products' ? 'bg-white text-orange-600 shadow-xs font-bold' : 'hover:text-slate-950'
              }`}
            >
              {t('nav.allProducts')}
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onNavigate('products', cat)}
                className="px-2.5 py-1.5 rounded-lg hover:text-orange-600 hover:bg-orange-50/50 transition-colors shrink-0 cursor-pointer"
              >
                {tCategory(cat)}
              </button>
            ))}
          </div>

          <div className="hidden xl:flex items-center gap-4 text-[11px] font-bold text-orange-600">
            <button
              onClick={() => onNavigate('products', 'deals')}
              className="flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Zap className="size-3.5" /> {t('nav.flashDealsPromo')}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer (Slide-over with overlay) */}
      {mobileMenuOpen &&
        createPortal(
          <div className="md:hidden fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            {/* Backdrop click to close */}
            <div
              className="flex-1"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu backdrop"
            />

            {/* Drawer container */}
            <div className="w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-scale">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <BrandLogo size="sm" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
                {/* User Account / Auth Card */}
                {isAuthenticated && user ? (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-9 rounded-full bg-[#E84A27] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title={t('nav.signOut')}
                    >
                      <LogOut className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuthModal ? onOpenAuthModal() : onNavigate('login');
                    }}
                    className="w-full py-2.5 px-4 bg-[#E84A27] hover:bg-[#d63f1f] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <UserIcon className="size-4" />
                    <span>{t('nav.signInRegister')}</span>
                  </button>
                )}

                {/* Main Navigation links */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('nav.mainPages')}</span>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('home');
                    }}
                    className="text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>{t('nav.home')}</span>
                    <ChevronRight className="size-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('products');
                    }}
                    className="text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>{t('nav.browseAllProducts')}</span>
                    <ChevronRight className="size-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('cart');
                    }}
                    className="text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>{t('nav.shoppingCart')}</span>
                    <span className="text-[11px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                      {totalItemsCount}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('wishlist');
                    }}
                    className="text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>{t('nav.savedWishlist')}</span>
                    <span className="text-[11px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                      {wishlistCount}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('orders');
                    }}
                    className="text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>{t('nav.trackOrders')}</span>
                    <ChevronRight className="size-3.5 text-slate-400" />
                  </button>
                  {isAuthenticated && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNavigate('profile');
                      }}
                      className="text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    >
                      <span>{t('nav.myProfile')}</span>
                      <ChevronRight className="size-3.5 text-slate-400" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('admin');
                    }}
                    className="text-left px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>{t('nav.adminDashboardDemo')}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Portal</span>
                  </button>
                </div>

                {/* Categories Grid */}
                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    {t('nav.browseByCategory')}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onNavigate('products', cat);
                        }}
                        className="text-left p-2 rounded-xl bg-slate-50 text-[11px] font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors"
                      >
                        {tCategory(cat)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Footer in Drawer: Language Selector */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <LanguageSelector variant="mobile" />
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};
