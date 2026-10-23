import React from 'react';
import { FilterState, ProductCategory } from '../../types';
import { RatingStars } from '../common/RatingStars';
import { useTranslation } from '../../context/LanguageContext';
import { RotateCcw, X, SlidersHorizontal, Check } from 'lucide-react';

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  availableBrands: string[];
  categories: ProductCategory[];
  totalProductsCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  availableBrands,
  categories,
  totalProductsCount,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { t, tCategory } = useTranslation();

  const handleCategorySelect = (cat: string) => {
    onFilterChange({
      ...filters,
      category: filters.category === cat ? '' : cat,
    });
  };

  const handleBrandToggle = (brand: string) => {
    const nextBrands = filters.brand.includes(brand)
      ? filters.brand.filter((b) => b !== brand)
      : [...filters.brand, brand];
    onFilterChange({ ...filters, brand: nextBrands });
  };

  const handlePriceChange = (val: number) => {
    onFilterChange({
      ...filters,
      priceRange: [filters.priceRange[0], val],
    });
  };

  const content = (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-orange-600" />
          <h2 className="text-base font-bold text-slate-900">{t('filters.title')}</h2>
          <span className="text-xs text-slate-400">({totalProductsCount})</span>
        </div>
        <button
          onClick={onResetFilters}
          className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          {t('filters.resetAll')}
        </button>
      </div>

      {/* Category Filter */}
      <div>
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          {t('filters.categories')}
        </h3>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => handleCategorySelect('')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
              filters.category === ''
                ? 'bg-orange-50 text-orange-600 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{t('filters.allCategories')}</span>
            {filters.category === '' && <Check className="w-3.5 h-3.5 text-orange-600" />}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                filters.category === cat
                  ? 'bg-orange-50 text-orange-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tCategory(cat)}</span>
              {filters.category === cat && <Check className="w-3.5 h-3.5 text-orange-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Slider */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {t('filters.maxPrice')}
          </h3>
          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
            ${filters.priceRange[1]}
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="2000"
          step="10"
          value={filters.priceRange[1]}
          onChange={(e) => handlePriceChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
        />
        <div className="flex justify-between text-[11px] text-slate-400 mt-1">
          <span>$10</span>
          <span>$1,000</span>
          <span>$2,000</span>
        </div>
      </div>

      {/* Brand Checkboxes */}
      {availableBrands.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
            {t('filters.brands')}
          </h3>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {availableBrands.map((b) => {
              const isChecked = filters.brand.includes(b);
              return (
                <label
                  key={b}
                  className="flex items-center gap-2.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleBrandToggle(b)}
                    className="w-4 h-4 rounded text-orange-600 border-slate-300 focus:ring-orange-500 cursor-pointer"
                  />
                  <span>{b}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Minimum Rating */}
      <div className="pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
          {t('filters.rating')}
        </h3>
        <div className="flex flex-col gap-1.5">
          {[4, 3, 2].map((stars) => (
            <button
              key={stars}
              onClick={() =>
                onFilterChange({
                  ...filters,
                  minRating: filters.minRating === stars ? 0 : stars,
                })
              }
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                filters.minRating === stars
                  ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <RatingStars rating={stars} size="xs" />
                <span>{t('filters.andUp')}</span>
              </div>
              {filters.minRating === stars && <Check className="w-3.5 h-3.5 text-amber-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* Discount Minimum */}
      <div className="pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
          {t('filters.discount')}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {[10, 20, 30].map((disc) => (
            <button
              key={disc}
              onClick={() =>
                onFilterChange({
                  ...filters,
                  discountMin: filters.discountMin === disc ? 0 : disc,
                })
              }
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                filters.discountMin === disc
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              {t('filters.orMore', { percent: disc })}
            </button>
          ))}
        </div>
      </div>

      {/* In-Stock Only */}
      <div className="pt-2 border-t border-slate-100">
        <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer select-none">
          <span className="font-semibold">{t('filters.inStockOnly')}</span>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                inStockOnly: e.target.checked,
              })
            }
            className="w-4 h-4 rounded text-orange-600 border-slate-300 focus:ring-orange-500 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm h-fit sticky top-24">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full p-6 shadow-2xl overflow-y-auto z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-base">{t('filters.filterProducts')}</span>
                <button
                  onClick={onCloseMobile}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {content}
            </div>
            <button
              onClick={onCloseMobile}
              className="mt-6 w-full py-3 bg-[#E84A27] text-white rounded-xl font-bold text-sm shadow-md cursor-pointer"
            >
              {t('filters.showResults', { count: totalProductsCount })}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
