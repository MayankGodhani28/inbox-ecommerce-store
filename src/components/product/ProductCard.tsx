import React from 'react';
import { Product } from '../../types';
import { RatingStars } from '../common/RatingStars';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useTranslation } from '../../context/LanguageContext';
import { Heart, ShoppingBag, Eye, Sparkles } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  onSelectProduct: (productId: string) => void;
  layout?: 'grid' | 'list';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  onSelectProduct,
  layout = 'grid',
}) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { t, tCategory } = useTranslation();

  const isWished = isInWishlist(product.id);

  const handleCardClick = () => {
    onSelectProduct(product.id);
  };

  const handleAddCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1, product.colors ? product.colors[0] : undefined, product.sizes ? product.sizes[0] : undefined);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleQuickViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView(product);
  };

  if (layout === 'list') {
    return (
      <div
        onClick={handleCardClick}
        className="group relative flex flex-col sm:flex-row items-center gap-5 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-300 cursor-pointer overflow-hidden"
      >
        {/* Left image */}
        <div className="relative w-full sm:w-56 aspect-square sm:aspect-auto sm:h-52 rounded-xl bg-slate-50 overflow-hidden shrink-0">
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
          {product.discount > 0 && (
            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#E84A27] text-white text-[11px] font-bold shadow-sm">
              {t('product.off', { discount: product.discount })}
            </span>
          )}
        </div>

        {/* Right Info */}
        <div className="flex-1 flex flex-col justify-between size-full py-1">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                {product.brand} • {tCategory(product.category)}
              </span>
              <button
                onClick={handleWishlistClick}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                aria-label={t('nav.savedWishlist')}
              >
                <Heart className={`size-4 ${isWished ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1 group-hover:text-orange-600 transition-colors line-clamp-2">
              {product.name}
            </h3>

            <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
              {product.description}
            </p>

            <div className="mt-2.5">
              <RatingStars rating={product.rating} showCount count={product.reviewCount} size="sm" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-sm text-slate-400 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickViewClick}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="size-3.5" />
                {t('product.quickView')}
              </button>
              <button
                onClick={handleAddCart}
                className="px-4 py-2 rounded-xl bg-[#E84A27] hover:bg-[#d43f1f] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <ShoppingBag className="size-3.5" />
                {t('product.addToCart')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-orange-200/80 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Top Image Container */}
      <div className="relative aspect-square w-full bg-slate-50 overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="size-full object-cover object-center group-hover:scale-108 transition-transform duration-500 ease-out"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {product.discount > 0 && (
            <span className="px-2.5 py-0.5 rounded-md bg-[#E84A27] text-white text-[11px] font-extrabold tracking-wide shadow-sm">
              {t('product.off', { discount: product.discount })}
            </span>
          )}
          {product.isTrending && (
            <span className="px-2 py-0.5 rounded-md bg-[#009FE3] text-white text-[10px] font-bold tracking-wide shadow-sm flex items-center gap-1">
              <Sparkles className="size-2.5" /> {t('product.trending')}
            </span>
          )}
          {product.stock <= 10 && product.stock > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-sm">
              {t('product.onlyLeft', { count: product.stock })}
            </span>
          )}
        </div>

        {/* Wishlist floating button */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white text-slate-500 hover:text-rose-500 transition-all duration-200 cursor-pointer"
          aria-label={t('nav.savedWishlist')}
        >
          <Heart className={`size-4 ${isWished ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Hover Quick Action Buttons */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
          <button
            onClick={handleQuickViewClick}
            className="flex-1 py-2 px-3 rounded-xl bg-white/95 backdrop-blur-md text-slate-800 hover:bg-white text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="size-3.5 text-slate-600" />
            {t('product.quickView')}
          </button>
        </div>
      </div>

      {/* Product Metadata */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-600 uppercase tracking-wider">{product.brand}</span>
            <span className="text-[11px] text-slate-400">{tCategory(product.category)}</span>
          </div>

          <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>

          <div className="mt-2">
            <RatingStars rating={product.rating} showCount count={product.reviewCount} size="xs" />
          </div>
        </div>

        {/* Price & Add to Cart button */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-slate-900">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-slate-400 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleAddCart}
            className="p-2.5 rounded-xl bg-orange-50 hover:bg-[#E84A27] text-[#E84A27] hover:text-white transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
            aria-label={t('product.addToCart')}
            title={t('product.addToCart')}
          >
            <ShoppingBag className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
