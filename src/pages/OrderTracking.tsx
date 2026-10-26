import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { orderService } from '../services/orderService';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  Search,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface OrderTrackingProps {
  orderId?: string;
  onNavigate: (tab: string, param?: string) => void;
  onSelectProduct: (id: string) => void;
}

const STEP_DEFINITIONS: { status: OrderStatus; labelKey: string; descKey: string }[] = [
  { status: 'Order Placed', labelKey: 'tracking.step1Label', descKey: 'tracking.step1Desc' },
  { status: 'Confirmed', labelKey: 'tracking.step2Label', descKey: 'tracking.step2Desc' },
  { status: 'Packed', labelKey: 'tracking.step3Label', descKey: 'tracking.step3Desc' },
  { status: 'Shipped', labelKey: 'tracking.step4Label', descKey: 'tracking.step4Desc' },
  { status: 'Out for Delivery', labelKey: 'tracking.step5Label', descKey: 'tracking.step5Desc' },
  { status: 'Delivered', labelKey: 'tracking.step6Label', descKey: 'tracking.step6Desc' },
];

export const OrderTracking: React.FC<OrderTrackingProps> = ({
  orderId: initialOrderId,
  onNavigate,
  onSelectProduct,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [searchId, setSearchId] = useState(initialOrderId || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Load initial order or first available order
  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setOrder(null);
      return;
    }

    const fetchOrder = async () => {
      setLoading(true);
      setAccessDenied(false);

      if (initialOrderId) {
        const found = await orderService.getOrderById(initialOrderId);
        if (found && isMounted) {
          if (found.userId === user.id || user.role === 'admin') {
            setOrder(found);
            setSearchId(found.id);
          } else {
            setAccessDenied(true);
            setOrder(null);
          }
          setLoading(false);
          return;
        }
      }

      // Fallback to most recent order of current user
      const orders = await orderService.getOrders();
      if (orders.length > 0 && isMounted) {
        setOrder(orders[0]);
        setSearchId(orders[0].id);
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    fetchOrder();
    return () => {
      isMounted = false;
    };
  }, [initialOrderId, user]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    if (!user) {
      showToast('Authentication required', { message: 'Please sign in to track orders', type: 'error' });
      onNavigate('login', 'order-tracking');
      return;
    }

    setLoading(true);
    setAccessDenied(false);

    const found = await orderService.getOrderById(searchId.trim());
    if (found) {
      if (found.userId === user.id || user.role === 'admin') {
        setOrder(found);
      } else {
        setAccessDenied(true);
        setOrder(null);
        showToast('You do not have permission to view this order', { type: 'error' });
      }
    } else {
      setOrder(null);
      showToast(t('tracking.orderNotFound', { id: searchId }), { type: 'error' });
    }
    setLoading(false);
  };

  const getStepIndex = (status: OrderStatus) => {
    return STEP_DEFINITIONS.findIndex((s) => s.status === status);
  };

  const currentStepIndex = order ? getStepIndex(order.status) : 0;

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="size-16 bg-orange-50 text-[#E84A27] rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Sign in to track orders</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Order tracking is private and scoped to your account. Please sign in to view your orders and delivery checkpoints.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => onNavigate('home')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Return to Home
          </button>
          <button
            onClick={() => onNavigate('login', 'order-tracking')}
            className="px-6 py-2.5 bg-[#E84A27] hover:bg-[#d03d1c] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            Sign In to Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6">
        <button onClick={() => onNavigate('home')} className="hover:text-slate-700 cursor-pointer">{t('tracking.breadcrumbHome')}</button>
        <ChevronRight className="size-3" />
        <button onClick={() => onNavigate('orders')} className="hover:text-slate-700 cursor-pointer">{t('tracking.breadcrumbOrders')}</button>
        <ChevronRight className="size-3" />
        <span className="text-slate-800">{t('tracking.breadcrumbTracking')}</span>
      </div>

      {/* Lookup Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-8">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="size-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder={t('tracking.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            {t('tracking.trackButton')}
          </button>
        </form>
      </div>

      {accessDenied && (
        <div className="p-8 text-center bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 mb-6">
          <ShieldAlert className="size-8 mx-auto mb-2 text-rose-600" />
          <p className="font-bold text-sm">Access Denied</p>
          <p className="text-xs text-rose-600 mt-1">This order reference belongs to another account. You cannot view its tracking details.</p>
        </div>
      )}

      {order ? (
        <div className="flex flex-col gap-6">
          {/* Main Status Header Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                  {order.trackingNumber
                    ? t('tracking.carrierNotice', { num: order.trackingNumber })
                    : 'Awaiting Courier Dispatch'}
                </span>
                <h1 className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
                  #{order.id}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {t('orderSuccess.trackingNumber')}:{' '}
                  <strong className="text-slate-800 font-mono">{order.trackingNumber || 'Pending Dispatch'}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-right">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                    {t('tracking.estimatedDelivery')}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-700">
                    {order.estimatedDeliveryDate || 'Standard 3-4 Days'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="py-8">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                {STEP_DEFINITIONS.map((s, idx) => {
                  const isDone = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;

                  return (
                    <div key={s.status} className="flex flex-col items-center text-center relative">
                      {/* Connecting line (desktop) */}
                      {idx < STEP_DEFINITIONS.length - 1 && (
                        <div
                          className={`hidden sm:block absolute top-4 left-1/2 w-full h-1 z-0 ${
                            currentStepIndex > idx ? 'bg-orange-500' : 'bg-slate-200'
                          }`}
                        />
                      )}

                      {/* Icon circle */}
                      <div
                        className={`relative z-10 size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isDone
                            ? 'bg-[#E84A27] text-white shadow-sm ring-4 ring-orange-100'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="size-4" /> : idx + 1}
                      </div>

                      <span
                        className={`text-xs mt-2.5 font-bold ${
                          isCurrent ? 'text-orange-600' : isDone ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {t(s.labelKey)}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
                        {t(s.descKey)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Checkpoint Logs */}
            <div className="mt-4 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Clock className="size-4 text-orange-600" />
                {t('tracking.checkpointHistory')}
              </h3>

              <div className="flex flex-col gap-3">
                {order.statusHistory.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between py-2.5 px-3.5 bg-slate-50/70 rounded-xl border border-slate-100 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{h.status}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{h.note}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {h.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Delivery & Items Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shipping Destination */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="size-4 text-orange-600" />
                {t('tracking.shippingTo')}
              </h3>
              <p className="text-xs font-bold text-slate-800">{order.customerName}</p>
              <p className="text-xs text-slate-600 mt-1">{order.shippingAddress.street}</p>
              <p className="text-xs text-slate-600">
                {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                {order.shippingAddress.pincode}
              </p>
              <p className="text-xs text-slate-600">{order.shippingAddress.country}</p>
              {order.customerPhone && (
                <p className="text-xs text-slate-500 mt-2">{t('checkout.phone')}: {order.customerPhone}</p>
              )}
            </div>

            {/* Package Contents */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Package className="size-4 text-orange-600" />
                {t('tracking.itemsInShipment', { count: order.items.length })}
              </h3>
              <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                {order.items.map((it, idx) => (
                  <div
                    key={`${it.productId}-${idx}`}
                    onClick={() => onSelectProduct(it.productId)}
                    className="flex items-center justify-between text-xs p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={it.image}
                        alt={it.name}
                        className="size-8 object-cover rounded-md border border-slate-200"
                      />
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                        {it.name}
                      </span>
                    </div>
                    <span className="text-slate-500">Qty: {it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        !loading && !accessDenied && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <p className="text-xs text-slate-500">{t('tracking.enterValidId')}</p>
          </div>
        )
      )}
    </div>
  );
};
