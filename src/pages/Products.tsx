import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductCategory, FilterState } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { FilterSidebar } from '../components/product/FilterSidebar';
import { CATEGORIES } from '../components/common/Navbar';
import { useTranslation } from '../context/LanguageContext';
import {
  Grid,
  List,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Search,
  X,
} from 'lucide-react';

interface ProductsProps {
  products: Product[];
  initialCategory?: string;
  onSelectProduct: (id: string) => void;
  onQuickView: (product: Product) => void;
}

const ITEMS_PER_PAGE = 8;

const isKnownCategory = (val?: string): boolean => {
  if (!val) return false;
  return CATEGORIES.includes(val as ProductCategory);
};

const extractSearchFromParam = (val?: string): string => {
  if (!val) return '';
  if (val.startsWith('search:')) {
    try {
      return decodeURIComponent(val.replace('search:', ''));
    } catch {
      return val.replace('search:', '');
    }
  }
  if (!isKnownCategory(val) && val !== 'all' && val !== 'deals') {
    return val;
  }
  return '';
};

const extractCategoryFromParam = (val?: string): string => {
  if (!val) return '';
  if (val.startsWith('search:')) return '';
  if (isKnownCategory(val)) return val;
  return '';
};

export const Products: React.FC<ProductsProps> = ({
  products,
  initialCategory,
  onSelectProduct,
  onQuickView,
}) => {
  const { t, tCategory } = useTranslation();
  // Mobile filter drawer state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // View mode (grid / list)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Sort option
  const [sortBy, setSortBy] = useState<FilterState['sortBy']>('popularity');

  const initialSearchText = extractSearchFromParam(initialCategory);
  const initialCat = extractCategoryFromParam(initialCategory);

  // Search input query inside catalog
  const [searchQuery, setSearchQuery] = useState(initialSearchText);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Max price among products for the range slider
  const highestPrice = useMemo(() => {
    return Math.ceil(Math.max(...products.map((p) => p.price), 500));
  }, [products]);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    category: initialCat,
    brand: [],
    priceRange: [0, 2000],
    minRating: 0,
    discountMin: initialCategory === 'deals' ? 10 : 0,
    inStockOnly: false,
    searchQuery: initialSearchText,
    sortBy: 'popularity',
  });

  // Sync category or search query if initialCategory changes from Navbar
  useEffect(() => {
    const nextSearch = extractSearchFromParam(initialCategory);
    const nextCat = extractCategoryFromParam(initialCategory);

    if (nextSearch) {
      setSearchQuery(nextSearch);
      setFilters((prev) => ({ ...prev, category: '', discountMin: 0, searchQuery: nextSearch }));
    } else if (initialCategory === 'deals') {
      setSearchQuery('');
      setFilters((prev) => ({ ...prev, category: '', discountMin: 10, searchQuery: '' }));
    } else if (nextCat) {
      setSearchQuery('');
      setFilters((prev) => ({ ...prev, category: nextCat, discountMin: 0, searchQuery: '' }));
    } else {
      setSearchQuery('');
      setFilters((prev) => ({ ...prev, category: '', discountMin: 0, searchQuery: '' }));
    }
    setCurrentPage(1);
  }, [initialCategory]);

  // Extract all unique brands from products
  const availableBrands = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.brand))).sort();
  }, [products]);

  // Filter and Sort Pipeline
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = product.name.toLowerCase().includes(q);
        const matchBrand = product.brand.toLowerCase().includes(q);
        const matchDesc = product.description.toLowerCase().includes(q);
        const matchCat = product.category.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchDesc && !matchCat) return false;
      }

      // Category
      if (filters.category && product.category !== filters.category) {
        return false;
      }

      // Price range
      if (product.price < filters.priceRange[0] || product.price > filters.priceRange[1]) {
        return false;
      }

      // Rating
      if (filters.minRating > 0 && product.rating < filters.minRating) {
        return false;
      }

      // In stock
      if (filters.inStockOnly && product.stock <= 0) {
        return false;
      }

      // Discount min
      if (filters.discountMin > 0 && product.discount < filters.discountMin) {
        return false;
      }

      // Brands multi-select
      if (filters.brand.length > 0 && !filters.brand.includes(product.brand)) {
        return false;
      }

      return true;
    });
  }, [products, filters, searchQuery]);

  // Sorted list
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case 'price-asc':
        return list.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return list.sort((a, b) => b.price - a.price);
      case 'rating':
        return list.sort((a, b) => b.rating - a.rating);
      case 'discount':
        return list.sort((a, b) => b.discount - a.discount);
      case 'newest':
        return list.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
      case 'popularity':
      default:
        return list.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
    }
  }, [filteredProducts, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedProducts, currentPage]);

  const handleResetFilters = () => {
    setFilters({
      category: '',
      brand: [],
      priceRange: [0, highestPrice],
      minRating: 0,
      discountMin: 0,
      inStockOnly: false,
      searchQuery: '',
      sortBy: 'popularity',
    });
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
      {/* Catalog Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <span>{t('catalog.breadcrumbHome')}</span>
            <span>/</span>
            <span>{t('catalog.breadcrumbCatalog')}</span>
            {filters.category && (
              <>
                <span>/</span>
                <span className="text-[#E84A27]">{tCategory(filters.category)}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {searchQuery ? (
              <span>Search Results for &ldquo;{searchQuery}&rdquo;</span>
            ) : !filters.category ? (
              filters.discountMin > 0
                ? t('catalog.specialOffers')
                : t('catalog.allProducts')
            ) : (
              tCategory(filters.category)
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('catalog.showingItems', { count: sortedProducts.length })}
          </p>
        </div>

        {/* Search Query inside catalog */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t('catalog.searchPlaceholder')}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-orange-500 shadow-xs"
            />
            <Search className="size-3.5 text-slate-400 absolute left-3 top-3" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-xs hover:bg-slate-50 shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="size-4 text-orange-600" />
            <span>{t('catalog.filtersButton')}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Desktop Sidebar (Cols 1-3) */}
        <div className="hidden lg:block lg:col-span-3 sticky top-24">
          <FilterSidebar
            variant="desktop"
            filters={filters}
            onFilterChange={(f: FilterState) => {
              setFilters(f);
              setCurrentPage(1);
            }}
            onResetFilters={handleResetFilters}
            availableBrands={availableBrands}
            categories={CATEGORIES}
            totalProductsCount={sortedProducts.length}
          />
        </div>

        {/* Products Stream (Cols 4-12) */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          {/* Controls Bar: Sort, View Toggle, Active Tags */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid View"
              >
                <Grid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="List View"
              >
                <List className="size-4" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold hidden sm:inline-flex items-center gap-1">
                <ArrowUpDown className="size-3.5" /> {t('catalog.sortBy')}
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as FilterState['sortBy'])}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="popularity">{t('catalog.sortPopularity')}</option>
                <option value="price-asc">{t('catalog.sortPriceAsc')}</option>
                <option value="price-desc">{t('catalog.sortPriceDesc')}</option>
                <option value="rating">{t('catalog.sortRating')}</option>
                <option value="discount">{t('catalog.sortDiscount')}</option>
                <option value="newest">{t('catalog.sortNewest')}</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(filters.category ||
            filters.minRating > 0 ||
            filters.inStockOnly ||
            filters.discountMin > 0 ||
            filters.brand.length > 0 ||
            searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold text-[11px]">{t('catalog.activeFilters')}</span>

              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 font-semibold text-[11px] border border-orange-200">
                  {t('catalog.searchFilter', { query: searchQuery })}
                  <button onClick={() => setSearchQuery('')} className="hover:text-orange-900 cursor-pointer">
                    <X className="size-3" />
                  </button>
                </span>
              )}

              {filters.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold text-[11px] border border-slate-200">
                  {tCategory(filters.category)}
                  <button
                    onClick={() => setFilters({ ...filters, category: '' })}
                    className="hover:text-slate-900 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}

              {filters.brand.map((b: string) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold text-[11px] border border-slate-200"
                >
                  {b}
                  <button
                    onClick={() =>
                      setFilters({
                        ...filters,
                        brand: filters.brand.filter((item: string) => item !== b),
                      })
                    }
                    className="hover:text-slate-900 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}

              {filters.discountMin > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-semibold text-[11px] border border-red-200">
                  {t('catalog.dealsFilter', { percent: filters.discountMin })}
                  <button
                    onClick={() => setFilters({ ...filters, discountMin: 0 })}
                    className="hover:text-red-900 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}

              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 underline ml-2 cursor-pointer"
              >
                {t('catalog.clearAll')}
              </button>
            </div>
          )}

          {/* Products Render Grid / List */}
          {paginatedProducts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
              <div className="size-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="size-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">{t('catalog.noProductsFound')}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {t('catalog.noProductsFoundDesc')}
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {t('catalog.resetAllFilters')}
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginatedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  layout="grid"
                  onSelectProduct={onSelectProduct}
                  onQuickView={onQuickView}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {paginatedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  layout="list"
                  onSelectProduct={onSelectProduct}
                  onQuickView={onQuickView}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-6 mt-4">
              <div className="text-xs text-slate-500">
                {t('catalog.pageOf', { current: currentPage, total: totalPages })}
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                  title={t('catalog.previous')}
                >
                  <ChevronLeft className="size-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`size-8 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                      currentPage === page
                        ? 'bg-[#E84A27] text-white shadow-xs'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                  title={t('catalog.next')}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <FilterSidebar
        variant="mobile-drawer"
        isOpenMobile={mobileFilterOpen}
        onCloseMobile={() => setMobileFilterOpen(false)}
        filters={filters}
        onFilterChange={(f: FilterState) => {
          setFilters(f);
          setCurrentPage(1);
        }}
        onResetFilters={handleResetFilters}
        availableBrands={availableBrands}
        categories={CATEGORIES}
        totalProductsCount={sortedProducts.length}
      />
    </div>
  );
};
