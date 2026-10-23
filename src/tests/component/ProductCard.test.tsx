/**
 * ─────────────────────────────────────────────────────
 *  LAYER 3: COMPONENT TESTS — React UI Components
 *  File: src/tests/component/ProductCard.test.tsx
 *
 *  What companies test here:
 *   ✅ Component renders correct HTML without crashing
 *   ✅ User interactions (click, type, hover)
 *   ✅ Conditional rendering (stock status, badges)
 *   ✅ Accessibility (aria labels, roles)
 *   ✅ Props → rendered output mapping
 * ─────────────────────────────────────────────────────
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import type { Product } from '../../types';

// ── Minimal ProductCard component for testing purposes ──
// In a real company codebase you import the real component.
// We define a slimmed-down version here to demonstrate the pattern.

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onNavigate: (tab: string, id: string) => void;
}

function ProductCard({ product, onAddToCart, onNavigate }: ProductCardProps) {
  const isOutOfStock = product.stock === 0;

  return (
    <div data-testid="product-card" role="article" aria-label={product.name}>
      <img src={product.images[0]} alt={product.name} data-testid="product-image" />

      {product.isBestSeller && (
        <span data-testid="best-seller-badge" className="badge">
          Best Seller
        </span>
      )}

      {product.isDealOfDay && (
        <span data-testid="deal-badge" className="badge">
          Deal of the Day
        </span>
      )}

      <h3 data-testid="product-name">{product.name}</h3>
      <p data-testid="product-brand">{product.brand}</p>

      <div data-testid="product-price">₹{product.price.toLocaleString()}</div>

      {product.discount > 0 && (
        <div data-testid="original-price">
          <del>₹{product.originalPrice.toLocaleString()}</del>
          <span data-testid="discount-badge">{product.discount}% off</span>
        </div>
      )}

      <div data-testid="rating">
        ⭐ {product.rating} ({product.reviewCount} reviews)
      </div>

      {isOutOfStock ? (
        <p data-testid="out-of-stock-label" className="text-red-600">
          Out of Stock
        </p>
      ) : (
        <button
          data-testid="add-to-cart-btn"
          onClick={() => onAddToCart(product)}
          disabled={isOutOfStock}
          aria-label={`Add ${product.name} to cart`}
        >
          Add to Cart
        </button>
      )}

      <button
        data-testid="view-details-btn"
        onClick={() => onNavigate('product-details', product.id)}
        aria-label={`View details for ${product.name}`}
      >
        View Details
      </button>
    </div>
  );
}

// ── Test fixture ──
const SAMPLE_PRODUCT: Product = {
  id: 'prod-001',
  name: 'Sony WH-1000XM5',
  brand: 'Sony',
  category: 'Electronics',
  description: 'Premium noise cancelling headphones',
  price: 24999,
  originalPrice: 34999,
  discount: 28,
  rating: 4.8,
  reviewCount: 1250,
  stock: 10,
  images: ['https://example.com/headphones.jpg'],
  specifications: {},
  isBestSeller: true,
};

// ═══════════════════════════════════════════════════════
//  TEST SUITE 1: Rendering & Content
// ═══════════════════════════════════════════════════════
describe('ProductCard — Component Render Tests', () => {
  it('should render without crashing', () => {
    render(
      <ProductCard
        product={SAMPLE_PRODUCT}
        onAddToCart={vi.fn()}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByTestId('product-card')).toBeInTheDocument();
  });

  it('should display correct product name and brand', () => {
    render(
      <ProductCard product={SAMPLE_PRODUCT} onAddToCart={vi.fn()} onNavigate={vi.fn()} />
    );

    expect(screen.getByTestId('product-name')).toHaveTextContent('Sony WH-1000XM5');
    expect(screen.getByTestId('product-brand')).toHaveTextContent('Sony');
  });

  it('should show formatted price with ₹ currency symbol', () => {
    render(
      <ProductCard product={SAMPLE_PRODUCT} onAddToCart={vi.fn()} onNavigate={vi.fn()} />
    );

    expect(screen.getByTestId('product-price')).toHaveTextContent('₹24,999');
  });

  it('should show original price strikethrough and discount badge when discounted', () => {
    render(
      <ProductCard product={SAMPLE_PRODUCT} onAddToCart={vi.fn()} onNavigate={vi.fn()} />
    );

    expect(screen.getByTestId('original-price')).toBeInTheDocument();
    expect(screen.getByTestId('discount-badge')).toHaveTextContent('28% off');
  });

  it('should NOT show discount badge when product has no discount', () => {
    const noDiscountProduct = { ...SAMPLE_PRODUCT, discount: 0 };
    render(
      <ProductCard product={noDiscountProduct} onAddToCart={vi.fn()} onNavigate={vi.fn()} />
    );

    expect(screen.queryByTestId('original-price')).not.toBeInTheDocument();
    expect(screen.queryByTestId('discount-badge')).not.toBeInTheDocument();
  });

  it('should display "Best Seller" badge when product.isBestSeller is true', () => {
    render(
      <ProductCard product={SAMPLE_PRODUCT} onAddToCart={vi.fn()} onNavigate={vi.fn()} />
    );

    expect(screen.getByTestId('best-seller-badge')).toBeInTheDocument();
    expect(screen.getByTestId('best-seller-badge')).toHaveTextContent('Best Seller');
  });

  it('should NOT show "Best Seller" badge when isBestSeller is false', () => {
    const regularProduct = { ...SAMPLE_PRODUCT, isBestSeller: false };
    render(
      <ProductCard product={regularProduct} onAddToCart={vi.fn()} onNavigate={vi.fn()} />
    );

    expect(screen.queryByTestId('best-seller-badge')).not.toBeInTheDocument();
  });

  it('should display rating and review count', () => {
    render(
      <ProductCard product={SAMPLE_PRODUCT} onAddToCart={vi.fn()} onNavigate={vi.fn()} />
    );

    const ratingEl = screen.getByTestId('rating');
    expect(ratingEl).toHaveTextContent('4.8');
    expect(ratingEl).toHaveTextContent('1250');
  });
});

// ═══════════════════════════════════════════════════════
//  TEST SUITE 2: Out-of-Stock Behavior
// ═══════════════════════════════════════════════════════
describe('ProductCard — Out of Stock Tests', () => {
  it('should show "Out of Stock" text and hide the cart button when stock is 0', () => {
    const outOfStockProduct = { ...SAMPLE_PRODUCT, stock: 0 };
    render(
      <ProductCard product={outOfStockProduct} onAddToCart={vi.fn()} onNavigate={vi.fn()} />
    );

    expect(screen.getByTestId('out-of-stock-label')).toBeInTheDocument();
    expect(screen.queryByTestId('add-to-cart-btn')).not.toBeInTheDocument();
  });

  it('should show Add to Cart button when stock is greater than 0', () => {
    render(
      <ProductCard product={SAMPLE_PRODUCT} onAddToCart={vi.fn()} onNavigate={vi.fn()} />
    );

    expect(screen.getByTestId('add-to-cart-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('out-of-stock-label')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════
//  TEST SUITE 3: User Interactions
// ═══════════════════════════════════════════════════════
describe('ProductCard — Interaction Tests', () => {
  it('should call onAddToCart with the correct product when "Add to Cart" is clicked', () => {
    const mockAddToCart = vi.fn();
    render(
      <ProductCard product={SAMPLE_PRODUCT} onAddToCart={mockAddToCart} onNavigate={vi.fn()} />
    );

    fireEvent.click(screen.getByTestId('add-to-cart-btn'));

    expect(mockAddToCart).toHaveBeenCalledOnce();
    expect(mockAddToCart).toHaveBeenCalledWith(SAMPLE_PRODUCT);
  });

  it('should call onNavigate with product-details and product id when "View Details" is clicked', () => {
    const mockNavigate = vi.fn();
    render(
      <ProductCard product={SAMPLE_PRODUCT} onAddToCart={vi.fn()} onNavigate={mockNavigate} />
    );

    fireEvent.click(screen.getByTestId('view-details-btn'));

    expect(mockNavigate).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith('product-details', 'prod-001');
  });

  it('should NOT call onAddToCart if user clicks a non-cart button', () => {
    const mockAddToCart = vi.fn();
    render(
      <ProductCard product={SAMPLE_PRODUCT} onAddToCart={mockAddToCart} onNavigate={vi.fn()} />
    );

    // Click "View Details" — should NOT trigger cart
    fireEvent.click(screen.getByTestId('view-details-btn'));

    expect(mockAddToCart).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════
//  TEST SUITE 4: Accessibility (a11y)
// ═══════════════════════════════════════════════════════
describe('ProductCard — Accessibility Tests', () => {
  it('should have correct aria-label on the product card container', () => {
    render(
      <ProductCard product={SAMPLE_PRODUCT} onAddToCart={vi.fn()} onNavigate={vi.fn()} />
    );

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-label', 'Sony WH-1000XM5');
  });

  it('should have aria-label on "Add to Cart" button', () => {
    render(
      <ProductCard product={SAMPLE_PRODUCT} onAddToCart={vi.fn()} onNavigate={vi.fn()} />
    );

    const btn = screen.getByTestId('add-to-cart-btn');
    expect(btn).toHaveAttribute('aria-label', 'Add Sony WH-1000XM5 to cart');
  });

  it('should have descriptive alt text on product image', () => {
    render(
      <ProductCard product={SAMPLE_PRODUCT} onAddToCart={vi.fn()} onNavigate={vi.fn()} />
    );

    const img = screen.getByTestId('product-image');
    expect(img).toHaveAttribute('alt', 'Sony WH-1000XM5');
  });
});
