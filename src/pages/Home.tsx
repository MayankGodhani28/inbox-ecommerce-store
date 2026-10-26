import React, { useState, useEffect } from 'react';
import { Product, ProductCategory } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { CATEGORIES } from '../components/common/Navbar';
import { useTranslation } from '../context/LanguageContext';
import {
  Sparkles,
  ArrowRight,
  Clock,
  TrendingUp,
  Zap,
  Award,
  Star,
  Flame,
} from 'lucide-react';

interface HomeProps {
  products: Product[];
  onSelectProduct: (id: string) => void;
  onQuickView: (product: Product) => void;
  onNavigate: (tab: string, param?: string) => void;
}

const CATEGORY_ICONS: Record<ProductCategory, string> = {
  Electronics: '⚡',
  Fashion: '👗',
  Beauty: '✨',
  'Home & Kitchen': '🍳',
  Grocery: '☕',
  Sports: '🏋️',
  Books: '📚',
  Accessories: '🎒',
};

export const Home: React.FC<HomeProps> = ({
  products,
  onSelectProduct,
  onQuickView,
  onNavigate,
}) => {
  const { t, tCategory } = useTranslation();
  // Hero Carousel State
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);

  const heroSlides = [
    {
      titleKey: 'home.heroSlide1Title',
      subtitleKey: 'home.heroSlide1Sub',
      discountKey: 'home.heroSlide1Discount',
      category: 'Electronics',
      ctaKey: 'home.heroSlide1Cta',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      bgGradient: 'linear-gradient(to right, #0f172a, #1e293b, #431407)',
    },
    {
      titleKey: 'home.heroSlide2Title',
      subtitleKey: 'home.heroSlide2Sub',
      discountKey: 'home.heroSlide2Discount',
      category: 'Fashion',
      ctaKey: 'home.heroSlide2Cta',
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=80',
      bgGradient: 'linear-gradient(to right, #0f172a, #1c1917, #431407)',
    },
    {
      titleKey: 'home.heroSlide3Title',
      subtitleKey: 'home.heroSlide3Sub',
      discountKey: 'home.heroSlide3Discount',
      category: 'Home & Kitchen',
      ctaKey: 'home.heroSlide3Cta',
      image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1200&q=80',
      bgGradient: 'linear-gradient(to right, #0f172a, #18181b, #022c22)',
    },
  ];

  // Auto-slide hero
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Flash Sale Countdown Timer
  const [timeLeft, setTimeLeft] = useState({ hours: 9, minutes: 42, seconds: 18 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const dealProducts = products.filter((p) => p.isDealOfDay || p.discount >= 28).slice(0, 4);
  const trendingProducts = products.filter((p) => p.isTrending).slice(0, 4);
  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 4);
  const newArrivals = products.filter((p) => p.isNewArrival || p.stock < 20).slice(0, 4);

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {/* 1. HERO CAROUSEL */}
      <section className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 mt-4">
        <div className="relative overflow-hidden rounded-3xl shadow-xl border border-slate-200/50">
          <div className="relative min-h-[460px] sm:min-h-[520px] flex items-center">
            {heroSlides.map((slide, index) => (
              <div
                key={index}
                style={{ background: slide.bgGradient }}
                className={`absolute inset-0 transition-opacity duration-1000 flex items-center ${
                  activeHeroSlide === index ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 opacity-40 mix-blend-overlay">
                  <img
                    src={slide.image}
                    alt={t(slide.titleKey)}
                    className="size-full object-cover object-center"
                  />
                </div>

                {/* Slide Content */}
                <div className="relative z-20 max-w-2xl px-6 sm:px-12 py-12 flex flex-col items-start gap-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E84A27] text-white text-xs font-black tracking-wider uppercase shadow-md">
                    <Flame className="size-3.5" />
                    {t(slide.discountKey)}
                  </span>

                  <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                    {t(slide.titleKey)}
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg">
                    {t(slide.subtitleKey)}
                  </p>

                  <div className="flex flex-wrap items-center gap-3.5 mt-2">
                    <button
                      onClick={() => onNavigate('products', slide.category)}
                      className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <span>{t(slide.ctaKey)}</span>
                      <ArrowRight className="size-4 text-[#E84A27]" />
                    </button>
                    <button
                      onClick={() => onNavigate('products', 'deals')}
                      className="px-5 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/20 backdrop-blur-md transition-colors cursor-pointer"
                    >
                      {t('home.viewAllDeals')}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Carousel Dots */}
            <div className="absolute bottom-6 left-6 sm:left-12 z-20 flex items-center gap-2">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveHeroSlide(i)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    activeHeroSlide === i ? 'w-8 bg-[#E84A27]' : 'w-2.5 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY TILES */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t('home.exploreByCategory')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('home.exploreByCategoryDesc')}</p>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            {t('home.viewCatalog')}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {CATEGORIES.map((cat: ProductCategory) => {
            const count = products.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => onNavigate('products', cat)}
                className="group flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-orange-300 transition-all duration-200 text-center cursor-pointer"
              >
                <div className="size-12 rounded-xl bg-orange-50 group-hover:bg-[#E84A27] text-2xl flex items-center justify-center transition-colors duration-200">
                  <span className="group-hover:scale-110 transition-transform">
                    {CATEGORY_ICONS[cat]}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-orange-600 transition-colors mt-2.5 line-clamp-1">
                  {tCategory(cat)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">{t('home.itemsCount', { count })}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. FLASH DEALS / DEAL OF THE DAY */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-6 w-full">
        <div className="p-6 sm:p-8 bg-gradient-to-br from-orange-500 via-[#E84A27] to-red-700 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 size-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header with Countdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-orange-200 text-xs font-bold uppercase tracking-wider mb-1">
                <Zap className="size-4 fill-current text-amber-300" />
                {t('home.flashOffer')}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {t('home.dealsOfDay')}
              </h2>
            </div>

            {/* Countdown Box */}
            <div className="flex items-center gap-2 bg-black/25 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15">
              <Clock className="size-4 text-amber-300" />
              <span className="text-xs font-semibold text-orange-100">{t('home.endsIn')}</span>
              <div className="flex items-center gap-1 text-sm font-mono font-bold">
                <span className="bg-white/20 px-2 py-0.5 rounded">
                  {String(timeLeft.hours).padStart(2, '0')}h
                </span>
                <span>:</span>
                <span className="bg-white/20 px-2 py-0.5 rounded">
                  {String(timeLeft.minutes).padStart(2, '0')}m
                </span>
                <span>:</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-amber-300">
                  {String(timeLeft.seconds).padStart(2, '0')}s
                </span>
              </div>
            </div>
          </div>

          {/* Deal Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {dealProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onSelectProduct={onSelectProduct}
                onQuickView={onQuickView}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 4. TRENDING PRODUCTS */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
              <TrendingUp className="size-4" />
              {t('home.customerFavorites')}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t('home.trendingRightNow')}</h2>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            {t('home.seeMore')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {trendingProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onSelectProduct={onSelectProduct}
              onQuickView={onQuickView}
            />
          ))}
        </div>
      </section>

      {/* 5. PROMOTIONAL FEATURE BANNERS */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 p-8 flex flex-col justify-between min-h-[260px] text-white shadow-lg">
            <div className="absolute inset-0 opacity-35">
              <img
                src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80"
                alt="Audio Tech"
                className="size-full object-cover"
              />
            </div>
            <div className="relative z-10">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                {t('home.promo1Tag')}
              </span>
              <h3 className="text-2xl font-bold mt-1 max-w-xs">
                {t('home.promo1Title')}
              </h3>
              <p className="text-xs text-slate-300 mt-2 max-w-xs">
                {t('home.promo1Desc')}
              </p>
            </div>
            <div className="relative z-10 mt-6">
              <button
                onClick={() => onNavigate('products', 'Electronics')}
                className="px-5 py-2.5 rounded-xl bg-[#E84A27] hover:bg-[#d63f1f] text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <span>{t('home.promo1Cta')}</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden bg-slate-900 p-8 flex flex-col justify-between min-h-[260px] text-white shadow-lg">
            <div className="absolute inset-0 opacity-35">
              <img
                src="https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80"
                alt="Fitness & Strength"
                className="size-full object-cover"
              />
            </div>
            <div className="relative z-10">
              <span className="text-xs font-bold text-[#009FE3] uppercase tracking-wider">
                {t('home.promo2Tag')}
              </span>
              <h3 className="text-2xl font-bold mt-1 max-w-xs">
                {t('home.promo2Title')}
              </h3>
              <p className="text-xs text-slate-300 mt-2 max-w-xs">
                {t('home.promo2Desc')}
              </p>
            </div>
            <div className="relative z-10 mt-6">
              <button
                onClick={() => onNavigate('products', 'Sports')}
                className="px-5 py-2.5 rounded-xl bg-[#009FE3] hover:bg-[#0284c7] text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <span>{t('home.promo2Cta')}</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BEST SELLERS */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
              <Award className="size-4" />
              {t('home.topRated')}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t('home.bestSellingEssentials')}</h2>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            {t('home.browseAll')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {bestSellers.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onSelectProduct={onSelectProduct}
              onQuickView={onQuickView}
            />
          ))}
        </div>
      </section>

      {/* 7. NEW ARRIVALS */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
              <Sparkles className="size-4" />
              {t('home.justDropped')}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t('home.newArrivals')}</h2>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            {t('home.viewMore')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {newArrivals.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onSelectProduct={onSelectProduct}
              onQuickView={onQuickView}
            />
          ))}
        </div>
      </section>

      {/* 8. CUSTOMER TESTIMONIALS */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-6 w-full">
        <div className="p-8 sm:p-10 bg-slate-100/80 rounded-3xl border border-slate-200">
          <div className="text-center max-w-lg mx-auto mb-8">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
              {t('home.verifiedReviews')}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              {t('home.lovedByCustomers')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  {t('home.testimonial1Quote')}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                  alt="Customer"
                  className="size-9 rounded-full object-cover"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Ananya Sen</p>
                  <p className="text-[10px] text-slate-400">{t('home.testimonial1Buyer')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  {t('home.testimonial2Quote')}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                  alt="Customer"
                  className="size-9 rounded-full object-cover"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Karthik Rao</p>
                  <p className="text-[10px] text-slate-400">{t('home.testimonial2Buyer')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  {t('home.testimonial3Quote')}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80"
                  alt="Customer"
                  className="size-9 rounded-full object-cover"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Meera Patel</p>
                  <p className="text-[10px] text-slate-400">{t('home.testimonial3Buyer')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
