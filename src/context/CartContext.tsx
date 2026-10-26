import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { CartItem, Product, SavedItem, Coupon } from '../types';
import { useToast } from './ToastContext';
import { useTranslation } from './LanguageContext';
import { useAuth } from './AuthContext';
import { cartService } from '../services/cartService';
import { pricingService, AuthoritativeQuote } from '../services/pricingService';

const CART_STORAGE_KEY = 'inbox_cart_items_v1';
const SAVED_STORAGE_KEY = 'inbox_saved_items_v1';
const APPLIED_COUPON_KEY = 'inbox_applied_coupon_v1';

interface CartContextType {
  cart: CartItem[];
  items: CartItem[];
  savedItems: SavedItem[];
  savedForLater: SavedItem[];
  appliedCoupon: Coupon | null;
  addToCart: (product: Product, quantity?: number, selectedColor?: string, selectedSize?: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, color?: string, size?: string) => Promise<void>;
  removeFromCart: (productId: string, color?: string, size?: string) => Promise<void>;
  saveForLater: (productId: string, color?: string, size?: string) => Promise<void>;
  moveToCartFromSaved: (savedItem: SavedItem) => Promise<void>;
  moveToCart: (id: string) => Promise<void>;
  removeSavedItem: (productId: string) => Promise<void>;
  removeSavedForLater: (id: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  clearCart: () => Promise<void>;
  totalItemsCount: number;
  subtotal: number;
  discountAmount: number;
  discount: number;
  deliveryFee: number;
  shipping: number;
  taxAmount: number;
  tax: number;
  finalTotal: number;
  total: number;
  deliveryMethod: 'Standard' | 'Express';
  setDeliveryMethod: (method: 'Standard' | 'Express') => void;
  serverQuote: AuthoritativeQuote | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const prevUserRef = useRef<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    try {
      const stored = localStorage.getItem(APPLIED_COUPON_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const [deliveryMethod, setDeliveryMethod] = useState<'Standard' | 'Express'>('Standard');
  const [serverQuote, setServerQuote] = useState<AuthoritativeQuote | null>(null);

  // Synchronize cart with server when authenticated or upon login
  const syncWithServer = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const guestCartJson = localStorage.getItem(CART_STORAGE_KEY);
      const guestSavedJson = localStorage.getItem(SAVED_STORAGE_KEY);

      if (guestCartJson) {
        const guestItems: CartItem[] = JSON.parse(guestCartJson);
        if (guestItems.length > 0) {
          await cartService.mergeCart(
            guestItems.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
              selectedColor: item.selectedColor,
              selectedSize: item.selectedSize,
            }))
          );
          localStorage.removeItem(CART_STORAGE_KEY);
        }
      }

      if (guestSavedJson) {
        const guestSaved: SavedItem[] = JSON.parse(guestSavedJson);
        if (guestSaved.length > 0) {
          await cartService.mergeSavedItems(
            guestSaved.map((item) => ({
              productId: item.product.id,
              selectedColor: item.selectedColor,
              selectedSize: item.selectedSize,
            }))
          );
          localStorage.removeItem(SAVED_STORAGE_KEY);
        }
      }

      const [cartRes, savedRes] = await Promise.all([
        cartService.getCart(),
        cartService.getSavedItems(),
      ]);

      setCart(cartRes.items);
      setSavedItems(savedRes.items);
    } catch (err) {
      console.error('Failed to sync cart with server:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const currentUserId = user?.id || null;

    if (currentUserId && currentUserId !== prevUserRef.current) {
      syncWithServer();
    } else if (!currentUserId && prevUserRef.current) {
      setCart([]);
      setSavedItems([]);
      setAppliedCoupon(null);
      setServerQuote(null);
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(SAVED_STORAGE_KEY);
    }

    prevUserRef.current = currentUserId;
  }, [user, syncWithServer]);

  // Sync unauthenticated state with localStorage
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedItems));
    }
  }, [savedItems, isAuthenticated]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem(APPLIED_COUPON_KEY, JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem(APPLIED_COUPON_KEY);
    }
  }, [appliedCoupon]);

  // Authoritative server pricing quote revalidation
  const fetchQuote = useCallback(async () => {
    if (cart.length === 0) {
      setServerQuote(null);
      return;
    }

    try {
      const quote = await pricingService.getQuote({
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          selectedColor: i.selectedColor,
          selectedSize: i.selectedSize,
        })),
        deliveryMethod,
        couponCode: appliedCoupon?.code,
      });

      if (quote.couponError && appliedCoupon) {
        setAppliedCoupon(null);
        showToast('Coupon removed', { message: quote.couponError, type: 'info' });
      }

      setServerQuote(quote);
    } catch (err) {
      console.error('Failed to calculate authoritative quote:', err);
    }
  }, [cart, deliveryMethod, appliedCoupon, showToast]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const addToCart = async (
    product: Product,
    quantity = 1,
    selectedColor?: string,
    selectedSize?: string
  ): Promise<void> => {
    const validQty = Math.max(1, Math.floor(Number(quantity) || 1));
    if (isAuthenticated) {
      try {
        const color = selectedColor || (product.colors ? product.colors[0] : '');
        const size = selectedSize || (product.sizes ? product.sizes[0] : '');
        await cartService.addItem(product.id, validQty, color, size);
        const refreshed = await cartService.getCart();
        setCart(refreshed.items);

        showToast(t('toast.addedToCart'), {
          message: t('toast.addedToCartDesc', { name: product.name }),
          type: 'success',
        });
        return;
      } catch (err: any) {
        showToast('Could not add to cart', { message: err?.message || 'Error updating cart', type: 'error' });
        return;
      }
    }

    // Guest fallback
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedColor === selectedColor &&
          item.selectedSize === selectedSize
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = Math.min(updated[existingIndex].quantity + validQty, product.stock);
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            id: `${product.id}-${selectedColor || 'default'}-${selectedSize || 'default'}`,
            product,
            quantity: Math.min(validQty, product.stock),
            selectedColor: selectedColor || (product.colors ? product.colors[0] : undefined),
            selectedSize: selectedSize || (product.sizes ? product.sizes[0] : undefined),
          },
        ];
      }
    });

    showToast(t('toast.addedToCart'), {
      message: t('toast.addedToCartDesc', { name: product.name }),
      type: 'success',
    });
  };

  const updateQuantity = async (
    productId: string,
    quantity: number,
    color?: string,
    size?: string
  ): Promise<void> => {
    const validQty = Math.floor(Number(quantity) || 0);
    if (validQty <= 0) {
      await removeFromCart(productId, color, size);
      return;
    }

    if (isAuthenticated) {
      const itemToUpdate = cart.find(
        (i) =>
          (i.id === productId || i.product.id === productId) &&
          (color ? i.selectedColor === color : true) &&
          (size ? i.selectedSize === size : true)
      );

      if (itemToUpdate && itemToUpdate.id) {
        try {
          await cartService.updateItemQuantity(itemToUpdate.id, validQty);
          const refreshed = await cartService.getCart();
          setCart(refreshed.items);
          return;
        } catch (err: any) {
          showToast('Could not update quantity', { message: err?.message || 'Error', type: 'error' });
          return;
        }
      }
    }

    // Guest fallback
    setCart((prev) =>
      prev.map((item) => {
        if (
          (item.id === productId || item.product.id === productId) &&
          (color ? item.selectedColor === color : true) &&
          (size ? item.selectedSize === size : true)
        ) {
          const clampedQty = Math.min(validQty, item.product.stock);
          return { ...item, quantity: clampedQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = async (productId: string, color?: string, size?: string): Promise<void> => {
    const itemToRemove = cart.find(
      (item) =>
        (item.id === productId || item.product.id === productId) &&
        (color ? item.selectedColor === color : true) &&
        (size ? item.selectedSize === size : true)
    );

    if (itemToRemove) {
      showToast(t('toast.itemRemoved'), {
        message: t('toast.itemRemovedDesc', { name: itemToRemove.product.name }),
        type: 'info',
      });
    }

    if (isAuthenticated && itemToRemove && itemToRemove.id) {
      try {
        await cartService.removeItem(itemToRemove.id);
        const refreshed = await cartService.getCart();
        setCart(refreshed.items);
        return;
      } catch (err: any) {
        console.error('Failed to remove item on server:', err);
      }
    }

    // Guest or fallback
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            (item.id === productId || item.product.id === productId) &&
            (color ? item.selectedColor === color : true) &&
            (size ? item.selectedSize === size : true)
          )
      )
    );
  };

  const saveForLater = async (productId: string, color?: string, size?: string): Promise<void> => {
    const item = cart.find(
      (i) =>
        (i.id === productId || i.product.id === productId) &&
        (color ? i.selectedColor === color : true) &&
        (size ? i.selectedSize === size : true)
    );

    if (!item) return;

    if (isAuthenticated) {
      try {
        await cartService.saveItem(item.product.id, item.selectedColor, item.selectedSize, true);
        const [cartRes, savedRes] = await Promise.all([
          cartService.getCart(),
          cartService.getSavedItems(),
        ]);
        setCart(cartRes.items);
        setSavedItems(savedRes.items);

        showToast(t('toast.savedForLater'), {
          message: t('toast.savedForLaterDesc', { name: item.product.name }),
          type: 'info',
        });
        return;
      } catch (err: any) {
        showToast('Could not save item', { message: err?.message || 'Error', type: 'error' });
        return;
      }
    }

    // Guest fallback
    await removeFromCart(item.product.id, color, size);
    setSavedItems((prev) => [
      ...prev,
      {
        id: `${item.product.id}-${item.selectedColor || 'default'}-${item.selectedSize || 'default'}`,
        product: item.product,
        savedAt: new Date().toISOString(),
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
      },
    ]);
    showToast(t('toast.savedForLater'), {
      message: t('toast.savedForLaterDesc', { name: item.product.name }),
      type: 'info',
    });
  };

  const moveToCartFromSaved = async (savedItem: SavedItem): Promise<void> => {
    if (isAuthenticated && savedItem.id) {
      try {
        await cartService.moveToCart(savedItem.id);
        const [cartRes, savedRes] = await Promise.all([
          cartService.getCart(),
          cartService.getSavedItems(),
        ]);
        setCart(cartRes.items);
        setSavedItems(savedRes.items);
        showToast(t('toast.addedToCart'), {
          message: t('toast.addedToCartDesc', { name: savedItem.product.name }),
          type: 'success',
        });
        return;
      } catch (err: any) {
        showToast('Could not move item to cart', { message: err?.message || 'Error', type: 'error' });
        return;
      }
    }

    // Guest fallback
    await addToCart(savedItem.product, 1, savedItem.selectedColor, savedItem.selectedSize);
    setSavedItems((prev) => prev.filter((i) => i.id !== savedItem.id && i.product.id !== savedItem.product.id));
  };

  const moveToCart = async (id: string): Promise<void> => {
    const found = savedItems.find((i) => i.id === id || i.product.id === id);
    if (found) {
      await moveToCartFromSaved(found);
    }
  };

  const removeSavedItem = async (productId: string): Promise<void> => {
    const found = savedItems.find((i) => i.id === productId || i.product.id === productId);

    if (isAuthenticated && found && found.id) {
      try {
        await cartService.removeSavedItem(found.id);
        const savedRes = await cartService.getSavedItems();
        setSavedItems(savedRes.items);
        showToast(t('toast.removedFromSaved'), { type: 'info' });
        return;
      } catch (err: any) {
        console.error('Failed to remove saved item on server:', err);
      }
    }

    setSavedItems((prev) => prev.filter((i) => i.id !== productId && i.product.id !== productId));
    showToast(t('toast.removedFromSaved'), { type: 'info' });
  };

  const removeSavedForLater = async (id: string): Promise<void> => {
    await removeSavedItem(id);
  };

  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await pricingService.validateCoupon({
        code: code.trim(),
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          selectedColor: i.selectedColor,
          selectedSize: i.selectedSize,
        })),
        deliveryMethod,
      });

      setAppliedCoupon(res.coupon);
      setServerQuote(res.quote);

      showToast(t('toast.couponApplied'), {
        message: t('toast.couponAppliedDesc', { code: res.coupon.code, desc: res.coupon.description }),
        type: 'success',
      });
      return { success: true, message: `Coupon ${res.coupon.code} applied successfully!` };
    } catch (err: any) {
      const message = err?.message || 'Invalid coupon code';
      return { success: false, message };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast(t('toast.couponRemoved'), { type: 'info' });
  };

  const clearCart = async (): Promise<void> => {
    if (isAuthenticated) {
      try {
        await cartService.clearCart();
      } catch (err) {
        console.error('Failed to clear cart on server:', err);
      }
    }
    setCart([]);
    setAppliedCoupon(null);
    setServerQuote(null);
  };

  // Authoritative calculations (server quote prioritised, exact fallback)
  // Ensure item quantity is always validated as a positive integer before financial calculations
  const sanitizeQuantity = (qty: any): number => {
    const val = Math.floor(Number(qty) || 0);
    return val > 0 ? val : 0;
  };

  const totalItemsCount = serverQuote
    ? serverQuote.totalItemsCount
    : cart.reduce((sum, item) => sum + sanitizeQuantity(item.quantity), 0);

  const subtotal = serverQuote
    ? serverQuote.subtotal
    : Number(
        cart
          .reduce((sum, item) => {
            const validQty = sanitizeQuantity(item.quantity);
            const validPrice = Math.max(0, Number(item.product?.price) || 0);
            return sum + validPrice * validQty;
          }, 0)
          .toFixed(2)
      );

  let fallbackDiscount = 0;
  if (appliedCoupon && !serverQuote) {
    const pct = appliedCoupon.discountPercentage ?? appliedCoupon.discountPercent ?? 0;
    if (pct > 0) {
      fallbackDiscount = (subtotal * pct) / 100;
      if (appliedCoupon.maxDiscount && fallbackDiscount > appliedCoupon.maxDiscount) {
        fallbackDiscount = appliedCoupon.maxDiscount;
      }
    }
  }
  const discountAmount = serverQuote ? serverQuote.discount : Number(fallbackDiscount.toFixed(2));

  let fallbackDelivery = 0;
  if (totalItemsCount > 0 && !serverQuote) {
    const qualifies = subtotal >= 75 || appliedCoupon?.freeShipping;
    if (deliveryMethod === 'Express') {
      fallbackDelivery = qualifies ? 4.99 : 12.99;
    } else {
      fallbackDelivery = qualifies ? 0 : 4.99;
    }
  }
  const deliveryFee = serverQuote ? serverQuote.deliveryFee : Number(fallbackDelivery.toFixed(2));

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = serverQuote ? serverQuote.tax : totalItemsCount > 0 ? Number((taxableAmount * 0.08).toFixed(2)) : 0;

  const finalTotal = serverQuote ? serverQuote.total : totalItemsCount > 0 ? Number((taxableAmount + deliveryFee + taxAmount).toFixed(2)) : 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        items: cart,
        savedItems,
        savedForLater: savedItems,
        appliedCoupon,
        addToCart,
        updateQuantity,
        removeFromCart,
        saveForLater,
        moveToCartFromSaved,
        moveToCart,
        removeSavedItem,
        removeSavedForLater,
        applyCoupon,
        removeCoupon,
        clearCart,
        totalItemsCount,
        subtotal,
        discountAmount,
        discount: discountAmount,
        deliveryFee,
        shipping: deliveryFee,
        taxAmount,
        tax: taxAmount,
        finalTotal,
        total: finalTotal,
        deliveryMethod,
        setDeliveryMethod,
        serverQuote,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
