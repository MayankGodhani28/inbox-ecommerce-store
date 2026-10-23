import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Product, Order } from './types';
import { productService } from './services/productService';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { QuickViewModal } from './components/common/QuickViewModal';
import { AuthModal } from './components/auth/AuthModal';

// Pages
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { ProductDetails } from './pages/ProductDetails';
import { Cart } from './pages/Cart';
import { Wishlist } from './pages/Wishlist';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './pages/OrderSuccess';
import { Orders } from './pages/Orders';
import { OrderTracking } from './pages/OrderTracking';
import { Profile } from './pages/Profile';
import { AdminDashboard } from './pages/AdminDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { SellerOnboard } from './pages/SellerOnboard';
import { Login } from './pages/Login';
import { useAuth } from './context/AuthContext';
import { SlidersHorizontal, Eye, ShieldCheck, Plus, Sparkles } from 'lucide-react';

function parseRouteFromUrl(): { tab: string; param?: string } {
  if (typeof window === 'undefined') return { tab: 'home' };
  const pathname = window.location.pathname;
  if (pathname === '/super-admin' || pathname.startsWith('/super-admin/')) {
    return { tab: 'super-admin' };
  }
  if (pathname === '/sell' || pathname.startsWith('/sell/')) {
    return { tab: 'sell' };
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return { tab: 'admin' };
  }
  if (pathname === '/login' || pathname.startsWith('/login')) {
    const params = new URLSearchParams(window.location.search);
    return { tab: 'login', param: params.get('redirect') || undefined };
  }
  if (pathname === '/checkout') return { tab: 'checkout' };
  if (pathname === '/cart') return { tab: 'cart' };
  if (pathname === '/orders') return { tab: 'orders' };
  if (pathname === '/order-tracking') {
    const params = new URLSearchParams(window.location.search);
    return { tab: 'order-tracking', param: params.get('orderId') || undefined };
  }
  if (pathname === '/profile') return { tab: 'profile' };
  if (pathname === '/products') {
    const params = new URLSearchParams(window.location.search);
    const search = params.get('search');
    if (search) return { tab: 'products', param: `search:${encodeURIComponent(search)}` };
    return { tab: 'products', param: params.get('category') || undefined };
  }

  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab') || 'home';
  let param = params.get('param') || undefined;

  if (tab === 'login') {
    param = params.get('redirect') || param;
  } else if (tab === 'product-details') {
    param = params.get('id') || param;
  } else if (tab === 'products') {
    const search = params.get('search');
    if (search) param = `search:${encodeURIComponent(search)}`;
    else param = params.get('category') || param;
  } else if (tab === 'order-tracking' || tab === 'order-success') {
    param = params.get('orderId') || param;
  }

  return { tab, param };
}

function MainApp() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const initialRoute = parseRouteFromUrl();
  const [currentTab, setCurrentTab] = useState<string>(initialRoute.tab);
  const [currentParam, setCurrentParam] = useState<string | undefined>(initialRoute.param);
  const [products, setProducts] = useState<Product[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  // Load products from PostgreSQL catalog
  const refreshProducts = () => {
    productService.getProducts().then((data) => setProducts(data));
  };

  useEffect(() => {
    refreshProducts();
  }, []);

  // Listen for browser forward/back navigation
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromUrl();
      setCurrentTab(route.tab);
      setCurrentParam(route.param);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for global authentication required events (e.g. 401s or toasts)
  useEffect(() => {
    const handleAuthRequired = () => {
      // Never redirect guest users browsing public store or portal pages:
      // - 'home': customer browsing products storefront
      // - 'products', 'product-details': browsing categories/items
      // - 'cart': viewing shopping cart
      // - 'admin': merchant portal has its own dedicated admin gateway
      // - 'super-admin': platform console has its own dedicated master terminal login
      // - 'sell': merchant onboarding info page
      const publicTabs = ['home', 'products', 'product-details', 'cart', 'admin', 'super-admin', 'sell', 'login'];
      if (publicTabs.includes(currentTab)) {
        return;
      }
      const target = currentTab !== 'login' ? currentTab : 'home';
      const redirectParam = currentParam ? `${target}:${currentParam}` : target;
      handleNavigate('login', redirectParam);
    };

    window.addEventListener('inbox:auth-required', handleAuthRequired);
    return () => window.removeEventListener('inbox:auth-required', handleAuthRequired);
  }, [currentTab, currentParam]);

  // Navigation handler with browser history pushState
  const handleNavigate = (tab: string, param?: string, replace = false) => {
    setCurrentTab(tab);
    setCurrentParam(param);

    let newUrl = '/';
    if (tab === 'super-admin') {
      newUrl = '/super-admin';
    } else if (tab === 'sell') {
      newUrl = '/sell';
    } else if (tab === 'admin') {
      newUrl = '/admin';
    } else if (tab === 'login') {
      newUrl = param ? `/login?redirect=${encodeURIComponent(param)}` : '/login';
    } else {
      const urlParams = new URLSearchParams();
      if (tab !== 'home') urlParams.set('tab', tab);
      if (param) {
        if (tab === 'product-details') urlParams.set('id', param);
        else if (tab === 'products') {
          if (param.startsWith('search:')) {
            try {
              urlParams.set('search', decodeURIComponent(param.replace('search:', '')));
            } catch {
              urlParams.set('search', param.replace('search:', ''));
            }
          } else {
            urlParams.set('category', param);
          }
        }
        else if (tab === 'order-tracking' || tab === 'order-success') urlParams.set('orderId', param);
        else urlParams.set('param', param);
      }
      const newQuery = urlParams.toString();
      newUrl = newQuery ? `/?${newQuery}` : '/';
    }

    if (replace) {
      window.history.replaceState({ tab, param }, '', newUrl);
    } else {
      window.history.pushState({ tab, param }, '', newUrl);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (productId: string) => {
    handleNavigate('product-details', productId);
  };

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Primary Customer Storefront Navigation Bar - hidden for admin & super-admin portals */}
      {currentTab !== 'admin' && currentTab !== 'super-admin' && (
        <Navbar
          currentTab={currentTab}
          onNavigate={handleNavigate}
          products={products}
          onOpenAuthModal={() => setAuthModalOpen(true)}
        />
      )}

      {/* Main Content View Switcher */}
      <main className={currentTab === 'admin' ? 'flex-1 flex flex-col w-full' : 'flex-1'}>
        {currentTab === 'home' && (
          <Home
            products={products}
            onSelectProduct={handleSelectProduct}
            onQuickView={handleQuickView}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'products' && (
          <Products
            products={products}
            initialCategory={currentParam}
            onSelectProduct={handleSelectProduct}
            onQuickView={handleQuickView}
          />
        )}

        {currentTab === 'product-details' && (
          currentParam ? (
            <ProductDetails
              productId={currentParam}
              allProducts={products}
              onSelectProduct={handleSelectProduct}
              onQuickView={handleQuickView}
              onNavigate={handleNavigate}
            />
          ) : (
            <Products
              products={products}
              onSelectProduct={handleSelectProduct}
              onQuickView={handleQuickView}
            />
          )
        )}

        {currentTab === 'cart' && (
          <Cart onNavigate={handleNavigate} onSelectProduct={handleSelectProduct} />
        )}

        {currentTab === 'wishlist' && (
          <Wishlist
            onNavigate={handleNavigate}
            onSelectProduct={handleSelectProduct}
            onQuickView={handleQuickView}
          />
        )}

        {currentTab === 'checkout' && (
          <Checkout
            onNavigate={handleNavigate}
            onOrderPlaced={(order) => {
              setLastPlacedOrder(order);
            }}
          />
        )}

        {currentTab === 'order-success' && (
          <OrderSuccess order={lastPlacedOrder} orderId={currentParam} onNavigate={handleNavigate} />
        )}

        {currentTab === 'orders' && (
          <Orders onNavigate={handleNavigate} onSelectProduct={handleSelectProduct} />
        )}

        {currentTab === 'order-tracking' && (
          <OrderTracking
            orderId={currentParam}
            onNavigate={handleNavigate}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {currentTab === 'profile' && <Profile onNavigate={handleNavigate} />}

        {currentTab === 'login' && (
          <Login onNavigate={handleNavigate} redirectTarget={currentParam} />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            onProductsUpdate={refreshProducts}
            onNavigate={handleNavigate}
            onOpenAuthModal={() => setAuthModalOpen(true)}
          />
        )}

        {currentTab === 'super-admin' && (
          <SuperAdminDashboard
            onNavigate={handleNavigate}
            onOpenAuthModal={() => setAuthModalOpen(true)}
          />
        )}

        {currentTab === 'sell' && (
          <SellerOnboard
            onNavigate={handleNavigate}
            onOpenAuthModal={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Customer Storefront Footer - hidden for admin and super-admin portals */}
      {currentTab !== 'admin' && currentTab !== 'super-admin' && (
        <Footer onNavigate={handleNavigate} />
      )}

      {/* Global Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onViewFullDetails={(id) => {
            setQuickViewProduct(null);
            handleSelectProduct(id);
          }}
        />
      )}

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(role) => {
          if (role === 'admin') {
            handleNavigate('admin');
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <MainApp />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
