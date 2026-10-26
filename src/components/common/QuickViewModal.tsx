import React, { useState } from 'react';
import { Product } from '../../types';
import { RatingStars } from './RatingStars';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useTranslation } from '../../context/LanguageContext';
import { X, Heart, ShoppingBag, Check, ShieldCheck, Truck, RotateCcw, Eye } from 'lucide-react';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onViewFullDetails: (productId: string) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  onClose,
  onViewFullDetails,
}) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { t, tCategory } = useTranslation();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product?.colors ? product.colors[0] : undefined
  );
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product?.sizes ? product.sizes[0] : undefined
  );
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedColor, selectedSize);
    onClose();
  };

  const isWished = isInWishlist(product.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
          {/* Left: Image Gallery */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-square w-full rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
              <img
                src={product.images[selectedImageIndex] || product.images[0]}
                alt={product.name}
                className="size-full object-cover object-center transition-all duration-300"
              />
              {product.discount > 0 && (
                <div className="absolute top-3 left-3 bg-[#E84A27] text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                  {t('product.off', { discount: product.discount })}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative size-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      selectedImageIndex === idx
                        ? 'border-[#E84A27] ring-2 ring-[#E84A27]/20 scale-105'
                        : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Thumbnail" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details & Buying options */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                <span>{product.brand}</span>
                <span>•</span>
                <span className="text-orange-600">{tCategory(product.category)}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {product.name}
              </h2>

              <div className="flex items-center gap-3 mt-2.5 mb-4">
                <RatingStars rating={product.rating} showCount count={product.reviewCount} />
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                  <Check className="size-3.5" /> {t('product.inStock', { count: product.stock })}
                </span>
              </div>

              {/* Pricing */}
              <div className="flex items-baseline gap-3 pb-4 border-b border-slate-100">
                <span className="text-3xl font-extrabold text-slate-900">
                  ${product.price.toFixed(2)}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-base text-slate-400 line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {t('product.save', { amount: (product.originalPrice - product.price).toFixed(2) })}
                </span>
              </div>

              <p className="text-sm text-slate-600 mt-4 leading-relaxed line-clamp-3">
                {product.description}
              </p>

              {/* Colors */}
              {product.colors && product.colors.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs font-semibold text-slate-700 block mb-2">
                    {t('product.color')} <span className="text-slate-900 font-normal">{selectedColor}</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                          selectedColor === color
                            ? 'border-[#E84A27] bg-orange-50 text-orange-950 font-semibold ring-1 ring-[#E84A27]'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs font-semibold text-slate-700 block mb-2">
                    {t('product.size')} <span className="text-slate-900 font-normal">{selectedSize}</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`text-xs px-3.5 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                          selectedSize === size
                            ? 'border-[#009FE3] bg-sky-50 text-sky-950 font-semibold ring-1 ring-[#009FE3]'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mt-5 flex items-center gap-4">
                <span className="text-xs font-semibold text-slate-700">{t('product.quantity')}</span>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-sm font-semibold text-slate-800 bg-white min-w-10 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#E84A27] hover:bg-[#d63f1f] text-white py-3 px-6 rounded-xl font-bold shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <ShoppingBag className="size-4" />
                  {t('product.addToCart')}
                </button>
                <button
                  onClick={() => toggleWishlist(product)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isWished
                      ? 'border-rose-200 bg-rose-50 text-rose-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-label={t('nav.savedWishlist')}
                >
                  <Heart className={`size-5 ${isWished ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onViewFullDetails(product.id);
                }}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 hover:text-orange-600 py-1 transition-colors cursor-pointer"
              >
                <Eye className="size-3.5" />
                {t('product.viewFullSpecs')}
              </button>

              {/* Value props */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Truck className="size-4 text-slate-600" />
                  <span>{t('product.freeShippingNotice')}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <RotateCcw className="size-4 text-slate-600" />
                  <span>{t('product.sevenDayReturn')}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="size-4 text-slate-600" />
                  <span>{t('product.hundredGenuine')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
