import React, { useState, useEffect } from 'react';
import { Order, OrderItem } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { orderService } from '../services/orderService';
import { CheckCircle, ArrowRight, Printer, Truck } from 'lucide-react';

interface OrderSuccessProps {
  order: Order | null;
  orderId?: string;
  onNavigate: (tab: string, param?: string) => void;
}

export const OrderSuccess: React.FC<OrderSuccessProps> = ({ order: initialOrder, orderId, onNavigate }) => {
  const { t, tPaymentMethod } = useTranslation();
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [isLoading, setIsLoading] = useState(!initialOrder && Boolean(orderId || new URLSearchParams(window.location.search).get('orderId')));

  useEffect(() => {
    if (initialOrder) {
      setOrder(initialOrder);
      return;
    }
    const targetId = orderId || new URLSearchParams(window.location.search).get('orderId');
    if (targetId) {
      setIsLoading(true);
      orderService.getOrderById(targetId)
        .then((found) => {
          if (found) setOrder(found);
        })
        .catch((error) => { console.error('Could not load order:', error); })
        .finally(() => setIsLoading(false));
    }
  }, [initialOrder, orderId]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="size-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-slate-500 font-semibold">Loading verified order receipt...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">{t('orderSuccess.noOrderTitle')}</h2>
        <button
          onClick={() => onNavigate('home')}
          className="mt-4 px-6 py-2.5 bg-[#E84A27] text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          {t('orderSuccess.returnHome')}
        </button>
      </div>
    );
  }

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-10 text-center">
        {/* Animated celebration icon */}
        <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="size-9" />
        </div>

        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600">
          {t('orderSuccess.confirmedBadge')}
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
          {t('orderSuccess.thankYou', { name: order.customerName })}
        </h1>

        <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
          {t('orderSuccess.receiptSent', { email: order.customerEmail })}
        </p>

        {/* Order Details Badge Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-8 text-left">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">{t('orderSuccess.orderId')}</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono">{order.id}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">{t('orderSuccess.estimatedDelivery')}</span>
            <p className="text-sm font-extrabold text-emerald-700 mt-0.5">
              {order.estimatedDeliveryDate || 'Standard 3-4 Days'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">{t('orderSuccess.trackingNumber')}</span>
            <p className="text-sm font-extrabold text-orange-600 mt-0.5 font-mono">
              {order.trackingNumber || 'Pending courier assignment'}
            </p>
          </div>
        </div>

        {/* Ordered items breakdown */}
        <div className="text-left border-t border-slate-100 pt-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">{t('orderSuccess.orderItems', { count: order.items.length })}</h3>
          <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
            {order.items.map((it: OrderItem, idx: number) => (
              <div key={`${it.productId}-${idx}`} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <img
                    src={it.image}
                    alt={it.name}
                    className="size-10 object-cover rounded-lg border border-slate-200"
                  />
                  <div>
                    <p className="font-bold text-slate-800 line-clamp-1">{it.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {t('orderSuccess.qtyPrice', { qty: it.quantity, price: it.price.toFixed(2) })}
                      {it.selectedColor && ` • ${it.selectedColor}`}
                      {it.selectedSize && ` • ${it.selectedSize}`}
                    </p>
                  </div>
                </div>
                <span className="font-extrabold text-slate-900">
                  ${(it.price * it.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-baseline text-xs">
            <span className="font-bold text-slate-700">
              {order.paymentStatus === 'Paid'
                ? t('orderSuccess.totalPaid', { method: tPaymentMethod(order.paymentMethod) })
                : `Total Due (${tPaymentMethod(order.paymentMethod)})`}
            </span>
            <span className="text-base font-black text-slate-900">${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('order-tracking', order.id)}
            className="px-5 py-2.5 bg-[#E84A27] hover:bg-[#d63f1f] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Truck className="size-4" />
            {t('orderSuccess.trackLive')}
          </button>

          <button
            onClick={handlePrintInvoice}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="size-4" />
            {t('orderSuccess.printInvoice')}
          </button>

          <button
            onClick={() => onNavigate('products')}
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{t('orderSuccess.continueShopping')}</span>
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
