import React from 'react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useTranslation } from '../context/LanguageContext';
import { Product } from '../types';
import { RatingStars } from '../components/common/RatingStars';
import {
  Heart,
  ShoppingCart,
  Trash2,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface WishlistProps {
  onNavigate: (tab: string, param?: string) => void;
  onSelectProduct: (id: string) => void;
  onQuickView: (product: Product) => void;
}

export const Wishlist: React.FC<WishlistProps> = ({
  onNavigate,
  onSelectProduct,
  onQuickView,
}) => {
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { t } = useTranslation();

  const handleMoveToCart = (product: Product) => {
    addToCart(product, 1);
    removeFromWishlist(product.id);
  };

  const handleAddAllToCart = () => {
    wishlist.forEach((p) => addToCart(p, 1));
    clearWishlist();
  };

  if (wishlist.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 w-full text-center">
        <div className="size-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="size-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{t('wishlist.emptyTitle')}</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {t('wishlist.emptyDesc')}
        </p>
        <button
          onClick={() => onNavigate('products')}
          className="mt-6 px-6 py-3 bg-[#E84A27] hover:bg-[#d63f1f] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          {t('wishlist.exploreCatalog')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6">
        <button onClick={() => onNavigate('home')} className="hover:text-slate-700 cursor-pointer">{t('wishlist.breadcrumbHome')}</button>
        <ChevronRight className="size-3" />
        <span className="text-slate-800">{t('wishlist.breadcrumbWishlist')}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('wishlist.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('wishlist.savedCount', { count: wishlist.length, plural: wishlist.length !== 1 ? 's' : '' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAddAllToCart}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShoppingCart className="size-4" />
            {t('wishlist.moveAllToCart')}
          </button>
          <button
            onClick={clearWishlist}
            className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            {t('wishlist.clearWishlist')}
          </button>
        </div>
      </div>

      {/* Wishlist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {wishlist.map((prod: Product) => (
          <div
            key={prod.id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
          >
            {/* Image Thumbnail & Floating Delete */}
            <div className="relative aspect-square bg-slate-50 overflow-hidden group">
              <img
                src={prod.images[0]}
                alt={prod.name}
                onClick={() => onSelectProduct(prod.id)}
                className="size-full object-cover object-center transition-transform duration-300 group-hover:scale-105 cursor-pointer"
              />

              <button
                onClick={() => removeFromWishlist(prod.id)}
                className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-rose-600 shadow-md backdrop-blur-xs transition-colors cursor-pointer"
                title="Remove"
              >
                <Trash2 className="size-3.5" />
              </button>

              <button
                onClick={() => onQuickView(prod)}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-bold backdrop-blur-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
              >
                <Eye className="size-3.5" />
                {t('product.quickView')}
              </button>
            </div>

            {/* Info and Actions */}
            <div className="p-4 flex flex-col gap-3">
              <div>
                <span className="text-[10px] font-bold text-orange-600 uppercase">
                  {prod.brand}
                </span>
                <h3
                  onClick={() => onSelectProduct(prod.id)}
                  className="text-xs font-bold text-slate-900 hover:text-orange-600 line-clamp-1 cursor-pointer transition-colors mt-0.5"
                >
                  {prod.name}
                </h3>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-slate-900">
                      ${prod.price.toFixed(2)}
                    </span>
                    {prod.originalPrice > prod.price && (
                      <span className="text-[11px] text-slate-400 line-through">
                        ${prod.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <RatingStars rating={prod.rating} size="sm" />
                </div>
              </div>

              {/* Move to Cart */}
              <button
                disabled={prod.stock <= 0}
                onClick={() => handleMoveToCart(prod)}
                className="w-full py-2.5 px-4 bg-[#E84A27] hover:bg-[#d63f1f] text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ShoppingCart className="size-3.5" />
                <span>{t('cart.moveToCart')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
