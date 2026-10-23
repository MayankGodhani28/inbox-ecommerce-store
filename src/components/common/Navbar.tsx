import React, { useState, useRef, useEffect } from 'react';
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
      {/* Top Presentation & Utilities Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-[1500px] mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Presentation notice */}
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-300">
              <strong className="text-white font-semibold">{t('nav.demoTitle')}</strong> — {t('nav.demoSubtitle')}
            </span>
          </div>

          {/* Right: Language Selector + Quick Demo Persona Switcher */}
          <div className="flex items-center gap-3">
            {/* 3-Language Selector: ENG, GER, DUT */}
            <LanguageSelector variant="segmented" />

            {isAuthenticated && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400">{t('nav.viewingAs')}</span>
                  <span className={`font-bold ${isAdmin ? 'text-sky-300' : 'text-amber-300'}`}>
                    {isAdmin ? t('nav.adminBadge') : t('nav.customerBadge')}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => onNavigate('admin')}
                    className="px-3 py-1 rounded-lg text-[11px] font-extrabold bg-[#009FE3] hover:bg-[#0087c2] text-white transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin Portal</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <button
                type="submit"
                className="absolute right-1.5 px-3 py-1.5 bg-[#E84A27] hover:bg-[#d43f1f] text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                {t('nav.searchButton')}
              </button>
            </form>

            {/* Live Autocomplete Dropdown */}
            {showSuggestions && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in">
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
                          className="w-9 h-9 object-cover rounded-md border border-slate-200 shrink-0"
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
            {/* Wishlist Icon */}
            <button
              onClick={() => onNavigate('wishlist')}
              className="relative p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-rose-600 transition-colors cursor-pointer"
              aria-label={t('nav.savedWishlist')}
              title={t('nav.savedWishlist')}
            >
              <Heart className="w-5 h-5" />
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
              <ShoppingCart className="w-5 h-5" />
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
                    className="w-7 h-7 rounded-full object-cover border border-slate-300"
                  />
                  <span className="hidden lg:inline text-xs font-bold text-slate-800 max-w-[100px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('login', currentTab !== 'login' ? currentTab : undefined)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5" />
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
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('profile');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      {t('nav.myProfile')}
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('orders');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Package className="w-4 h-4 text-slate-400" />
                      {t('nav.myOrders')}
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('wishlist');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Heart className="w-4 h-4 text-slate-400" />
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
                      <LogOut className="w-4 h-4 text-rose-500" />
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
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5" />
            <button
              type="submit"
              className="absolute right-1 px-2.5 py-1 bg-[#E84A27] text-white text-[11px] font-bold rounded-lg cursor-pointer"
            >
              {t('nav.go')}
            </button>
          </form>
        </div>
      </div>

      {/* Sub-Navigation: Categories Bar */}
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
              <Zap className="w-3.5 h-3.5" /> {t('nav.flashDealsPromo')}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[110px] bottom-0 bg-slate-900/40 backdrop-blur-sm z-50">
          <div className="bg-white border-b border-slate-200 p-5 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-4 animate-fade-in">
            {/* Mobile Language Switcher */}
            <div className="pb-3 border-b border-slate-100">
              <LanguageSelector variant="mobile" />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('nav.mainPages')}</span>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('home');
                }}
                className="text-left py-2 text-sm font-bold text-slate-800 cursor-pointer"
              >
                {t('nav.home')}
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('products');
                }}
                className="text-left py-2 text-sm font-bold text-slate-800 cursor-pointer"
              >
                {t('nav.browseAllProducts')}
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('cart');
                }}
                className="text-left py-2 text-sm font-bold text-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span>{t('nav.shoppingCart')}</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                  {totalItemsCount}
                </span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('wishlist');
                }}
                className="text-left py-2 text-sm font-bold text-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span>{t('nav.savedWishlist')}</span>
                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                  {wishlistCount}
                </span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('orders');
                }}
                className="text-left py-2 text-sm font-bold text-slate-800 cursor-pointer"
              >
                {t('nav.trackOrders')}
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('admin');
                }}
                className="text-left py-2 text-sm font-bold text-blue-600 cursor-pointer"
              >
                {t('nav.adminDashboardDemo')}
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
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
                    className="text-left p-2 rounded-lg bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 cursor-pointer"
                  >
                    {tCategory(cat)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
