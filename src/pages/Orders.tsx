import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import {
  Package,
  Truck,
  ChevronRight,
  Printer,
  Search,
} from 'lucide-react';

interface OrdersProps {
  onNavigate: (tab: string, param?: string) => void;
  onSelectProduct: (id: string) => void;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  'Order Placed': 'bg-blue-50 text-blue-700 border-blue-200',
  'Confirmed': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Packed': 'bg-amber-50 text-amber-700 border-amber-200',
  'Shipped': 'bg-orange-50 text-orange-700 border-orange-200',
  'Out for Delivery': 'bg-purple-50 text-purple-700 border-purple-200',
  'Delivered': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const Orders: React.FC<OrdersProps> = ({ onNavigate, onSelectProduct }) => {
  const { user } = useAuth();
  const { t, tStatus } = useTranslation();

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [searchOrderId, setSearchOrderId] = useState('');

  useEffect(() => {
    let isMounted = true;
    setOrders([]);
    if (!user) return;
    orderService.getOrders().then((data) => {
      if (isMounted) {
        setOrders(data);
      }
    }).catch((error) => { console.error('Could not load orders:', error); });
    return () => {
      isMounted = false;
    };
  }, [user]);

  const filteredOrders = orders.filter((o) => {
    // Search query filter
    if (searchOrderId.trim() && !o.id.toLowerCase().includes(searchOrderId.toLowerCase())) {
      return false;
    }
    // Status tab filter
    if (activeFilter === 'active') {
      return o.status !== 'Delivered';
    }
    if (activeFilter === 'delivered') return o.status === 'Delivered';
    return true;
  });

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="size-16 bg-orange-50 text-[#E84A27] rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Sign in to view orders</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Order history and tax invoices are private to your customer account. Please sign in to view your purchases.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => onNavigate('home')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Return to Home
          </button>
          <button
            onClick={() => onNavigate('login', 'orders')}
            className="px-6 py-2.5 bg-[#E84A27] hover:bg-[#d03d1c] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            Sign In to Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6">
        <button onClick={() => onNavigate('home')} className="hover:text-slate-700 cursor-pointer">{t('orders.breadcrumbHome')}</button>
        <ChevronRight className="size-3" />
        <span className="text-slate-800">{t('orders.breadcrumbOrders')}</span>
      </div>

      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('orders.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('orders.subtitle')}
          </p>
        </div>

        {/* Search Order ID */}
        <div className="relative">
          <input
            type="text"
            value={searchOrderId}
            onChange={(e) => setSearchOrderId(e.target.value)}
            placeholder={t('orders.searchPlaceholder')}
            className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 shadow-xs"
          />
          <Search className="size-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
        {[
          { id: 'all', label: t('orders.tabAll') },
          { id: 'active', label: t('orders.tabActive') },
          { id: 'delivered', label: t('orders.tabDelivered') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as 'all' | 'active' | 'delivered')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
              activeFilter === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <Package className="size-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">{t('orders.noOrdersTitle')}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchOrderId ? t('orders.noOrdersSearch') : t('orders.noOrdersSection')}
          </p>
          <button
            onClick={() => onNavigate('products')}
            className="mt-4 px-5 py-2.5 bg-[#E84A27] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#d63f1f]"
          >
            {t('orders.startShopping')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase block">{t('orders.orderPlaced')}</span>
                    <span className="font-bold text-slate-800">{new Date(order.date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase block">{t('orders.total')}</span>
                    <span className="font-bold text-slate-900">${order.total.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase block">{t('orders.shipTo')}</span>
                    <span className="font-bold text-slate-800 truncate max-w-[120px]">{order.customerName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase border ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700'}`}>
                    {tStatus(order.status)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">#{order.id}</span>
                </div>
              </div>

              {/* Card Body: Items */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex flex-col gap-3 flex-1">
                  {order.items.map((it, idx) => (
                    <div key={`${it.productId}-${idx}`} className="flex items-center gap-3">
                      <img
                        src={it.image}
                        alt={it.name}
                        onClick={() => onSelectProduct(it.productId)}
                        className="size-14 object-cover rounded-xl border border-slate-200 shrink-0 cursor-pointer hover:opacity-90"
                      />
                      <div>
                        <h4
                          onClick={() => onSelectProduct(it.productId)}
                          className="text-xs font-bold text-slate-900 hover:text-orange-600 line-clamp-1 cursor-pointer transition-colors"
                        >
                          {it.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {t('orderSuccess.qtyPrice', { qty: it.quantity, price: it.price.toFixed(2) })}
                          {it.selectedColor && ` • ${it.selectedColor}`}
                          {it.selectedSize && ` • ${it.selectedSize}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Action buttons */}
                <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <button
                    onClick={() => onNavigate('order-tracking', order.id)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-[#E84A27] hover:bg-[#d63f1f] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Truck className="size-3.5" />
                    {t('orders.trackPackage')}
                  </button>

                  <button
                    onClick={() => onNavigate('order-success', order.id)}
                    className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="size-3.5" />
                    {t('orderSuccess.printInvoice')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
