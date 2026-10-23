import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../context/LanguageContext';
import { AVAILABLE_COUPONS } from '../data/coupons';
import { CartItem, SavedItem } from '../types';
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Tag,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  ChevronRight,
  Bookmark,
} from 'lucide-react';

interface CartProps {
  onNavigate: (tab: string, param?: string) => void;
  onSelectProduct: (id: string) => void;
}

export const Cart: React.FC<CartProps> = ({ onNavigate, onSelectProduct }) => {
  const {
    items,
    savedForLater,
    updateQuantity,
    removeFromCart,
    saveForLater,
    moveToCart,
    removeSavedForLater,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    subtotal,
    discount,
    shipping,
    tax,
    total,
  } = useCart();
  const { t } = useTranslation();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    if (!couponInput.trim()) return;

    const res = await applyCoupon(couponInput.trim());
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponInput('');
    }
  };

  const handleApplyPresetCoupon = async (code: string) => {
    setCouponError(null);
    await applyCoupon(code);
  };

  const freeShippingThreshold = 75;
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  if (items.length === 0 && savedForLater.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 w-full text-center">
        <div className="w-20 h-20 bg-orange-50 text-[#E84A27] rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{t('cart.emptyTitle')}</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {t('cart.emptyDesc')}
        </p>
        <button
          onClick={() => onNavigate('products')}
          className="mt-6 px-6 py-3 bg-[#E84A27] hover:bg-[#d63f1f] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          {t('cart.startShopping')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6">
        <button onClick={() => onNavigate('home')} className="hover:text-slate-700 cursor-pointer">{t('cart.breadcrumbHome')}</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-800">{t('cart.breadcrumbCart')}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Cart Items List (Cols 1-8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('cart.title')}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('cart.uniqueCount', { count: items.length, plural: items.length !== 1 ? 's' : '' })}
              </p>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              {t('cart.continueShopping')}
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-orange-600" />
                {amountNeededForFreeShipping === 0 ? (
                  <span className="text-emerald-600 font-bold">
                    {t('cart.unlockedFreeShipping')}
                  </span>
                ) : (
                  <span>
                    {t('cart.addMoreForFree', { amount: amountNeededForFreeShipping.toFixed(2) })}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-bold text-slate-500">{freeShippingProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 ? (
            <div className="flex flex-col gap-4">
              {items.map((item: CartItem) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  {/* Thumbnail & Product Details */}
                  <div className="flex items-center gap-4 flex-1">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      onClick={() => onSelectProduct(item.product.id)}
                      className="w-20 h-20 object-cover rounded-xl border border-slate-200 shrink-0 cursor-pointer hover:opacity-90"
                    />
                    <div>
                      <span className="text-[11px] font-bold text-orange-600 uppercase">
                        {item.product.brand}
                      </span>
                      <h3
                        onClick={() => onSelectProduct(item.product.id)}
                        className="text-xs sm:text-sm font-bold text-slate-900 hover:text-orange-600 transition-colors line-clamp-2 cursor-pointer"
                      >
                        {item.product.name}
                      </h3>

                      {/* Variants tags */}
                      {(item.selectedColor || item.selectedSize) && (
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          {item.selectedColor && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded">
                              {t('cart.color', { color: item.selectedColor })}
                            </span>
                          )}
                          {item.selectedSize && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded">
                              {t('cart.size', { size: item.selectedSize })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Stock availability */}
                      <span
                        className={`text-[10px] font-bold block mt-1 ${
                          item.product.stock < 5 ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {item.product.stock < 5 ? t('product.onlyLeft', { count: item.product.stock }) : t('product.inStockSimple')}
                      </span>
                    </div>
                  </div>

                  {/* Quantity & Price Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Stepper */}
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-white shadow-xs text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center justify-center cursor-pointer"
                        title="Decrease"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold text-xs text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        disabled={item.quantity >= item.product.stock}
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-white shadow-xs text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center justify-center disabled:opacity-40 cursor-pointer"
                        title="Increase"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Total item price */}
                    <div className="text-right min-w-[70px]">
                      <div className="text-sm font-black text-slate-900">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ${item.product.price.toFixed(2)} each
                      </div>
                    </div>

                    {/* Actions: Save for later, Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => saveForLater(item.product.id)}
                        className="p-2 text-slate-400 hover:text-orange-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        title={t('cart.saveForLater')}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        title={t('cart.remove')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500">Cart items have been moved to Saved for Later.</p>
            </div>
          )}

          {/* Saved for Later Section */}
          {savedForLater.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-orange-600" />
                {t('cart.savedForLater', { count: savedForLater.length })}
              </h2>

              <div className="flex flex-col gap-3">
                {savedForLater.map((item: SavedItem) => (
                  <div
                    key={item.id || item.product.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        onClick={() => onSelectProduct(item.product.id)}
                        className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0 cursor-pointer"
                      />
                      <div>
                        <h4
                          onClick={() => onSelectProduct(item.product.id)}
                          className="text-xs font-bold text-slate-900 hover:text-orange-600 line-clamp-1 cursor-pointer"
                        >
                          {item.product.name}
                        </h4>
                        <span className="text-xs font-black text-slate-900">
                          ${item.product.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveToCart(item.product.id)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        {t('cart.moveToCart')}
                      </button>
                      <button
                        onClick={() => removeSavedForLater(item.product.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title={t('cart.remove')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary & Coupon (Cols 9-12) */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
          {/* Coupon Code Box */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
            <label className="text-xs font-bold text-slate-900 block mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-orange-600" />
              {t('cart.haveCoupon')}
            </label>

            {appliedCoupon ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-emerald-800 font-mono">
                    {appliedCoupon.code}
                  </span>
                  <p className="text-[11px] text-emerald-700">{appliedCoupon.description}</p>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                >
                  {t('cart.remove')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder={t('cart.couponPlaceholder')}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-orange-500 uppercase font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t('cart.apply')}
                </button>
              </form>
            )}

            {couponError && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1.5">{couponError}</p>
            )}

            {/* Quick Clickable Coupon Chips */}
            {!appliedCoupon && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {AVAILABLE_COUPONS.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleApplyPresetCoupon(c.code)}
                    className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
                  >
                    {c.code} ({c.discountPercentage ? `${c.discountPercentage}%` : c.freeShipping ? 'Free Shipping' : `$${c.discountAmount || 10}`})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price Summary Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              {t('cart.orderSummary')}
            </h2>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{t('cart.subtotal', { count: items.reduce((sum: number, i: CartItem) => sum + i.quantity, 0) })}</span>
                <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>{t('cart.discount')}</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>{t('cart.deliveryFee')}</span>
                {shipping === 0 ? (
                  <span className="font-bold text-emerald-600">{t('cart.free')}</span>
                ) : (
                  <span className="font-bold text-slate-900">${shipping.toFixed(2)}</span>
                )}
              </div>

              <div className="flex justify-between text-slate-600">
                <span>{t('cart.estimatedTax')}</span>
                <span className="font-bold text-slate-900">${tax.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-900">{t('cart.total')}</span>
              <span className="text-2xl font-black text-slate-900">${total.toFixed(2)}</span>
            </div>

            {/* Checkout Button */}
            <button
              disabled={items.length === 0}
              onClick={() => onNavigate('checkout')}
              className="w-full py-3.5 px-6 rounded-xl bg-[#E84A27] hover:bg-[#d63f1f] text-white font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>{t('cart.proceedCheckout')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Trust Badges */}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{t('cart.secureCheckoutBadge')}</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-orange-600" />
                <span>{t('footer.easyReturnsTitle')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
