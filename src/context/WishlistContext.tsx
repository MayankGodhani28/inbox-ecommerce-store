import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../types';
import { useToast } from './ToastContext';
import { useCart } from './CartContext';
import { useTranslation } from './LanguageContext';
import { useAuth } from './AuthContext';
import { wishlistService } from '../services/wishlistService';

const WISHLIST_STORAGE_KEY = 'inbox_wishlist_items_v1';

interface WishlistContextType {
  wishlist: Product[];
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  moveToCart: (product: Product) => Promise<void>;
  moveAllToCart: () => Promise<void>;
  clearWishlist: () => Promise<void>;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { addToCart } = useCart();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const prevUserRef = useRef<string | null>(null);

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (_err) {
      /* ignore invalid storage format */
    }
    return [];
  });

  const syncWithServer = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const guestStored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (guestStored) {
        const guestItems: Product[] = JSON.parse(guestStored);
        if (guestItems.length > 0) {
          await wishlistService.mergeWishlist(guestItems.map((p) => p.id));
          localStorage.removeItem(WISHLIST_STORAGE_KEY);
        }
      }

      const res = await wishlistService.getWishlist();
      setWishlist(res.products);
    } catch (err) {
      console.error('Failed to sync wishlist with server:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const currentUserId = user?.id || null;

    if (currentUserId && currentUserId !== prevUserRef.current) {
      syncWithServer();
    } else if (!currentUserId && prevUserRef.current) {
      setWishlist([]);
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
    }

    prevUserRef.current = currentUserId;
  }, [user, syncWithServer]);

  // Sync unauthenticated state with localStorage
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    }
  }, [wishlist, isAuthenticated]);

  const isInWishlist = (productId: string) => {
    return wishlist.some((item) => item.id === productId);
  };

  const toggleWishlist = async (product: Product): Promise<void> => {
    const exists = isInWishlist(product.id);

    if (isAuthenticated) {
      try {
        const res = await wishlistService.toggleWishlist(product.id);
        if (res.added) {
          setWishlist((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]));
          showToast(t('toast.savedToWishlist'), {
            message: t('toast.savedToWishlistDesc', { name: product.name }),
            type: 'success',
          });
        } else {
          setWishlist((prev) => prev.filter((p) => p.id !== product.id));
          showToast(t('toast.removedFromWishlist'), {
            message: t('toast.removedFromWishlistDesc', { name: product.name }),
            type: 'info',
          });
        }
        return;
      } catch (err: any) {
        console.error('Failed to toggle wishlist on server:', err);
      }
    }

    // Guest fallback
    if (exists) {
      showToast(t('toast.removedFromWishlist'), {
        message: t('toast.removedFromWishlistDesc', { name: product.name }),
        type: 'info',
      });
      setWishlist((prev) => prev.filter((item) => item.id !== product.id));
      return;
    }

    showToast(t('toast.savedToWishlist'), {
      message: t('toast.savedToWishlistDesc', { name: product.name }),
      type: 'success',
    });
    setWishlist((prev) => [...prev, product]);
  };

  const removeFromWishlist = async (productId: string): Promise<void> => {
    if (isAuthenticated) {
      try {
        await wishlistService.removeFromWishlist(productId);
      } catch (err) {
        console.error('Failed to remove from wishlist on server:', err);
      }
    }
    setWishlist((prev) => prev.filter((item) => item.id !== productId));
    showToast(t('toast.removedFromWishlist'), { type: 'info' });
  };

  const moveToCart = async (product: Product): Promise<void> => {
    await addToCart(product);
    await removeFromWishlist(product.id);
  };

  const moveAllToCart = async (): Promise<void> => {
    for (const item of wishlist) {
      await addToCart(item);
    }
    if (isAuthenticated) {
      try {
        await wishlistService.clearWishlist();
      } catch (err) {
        console.error('Failed to clear wishlist on server:', err);
      }
    }
    setWishlist([]);
    showToast(t('toast.allMovedToCart'), { type: 'success' });
  };

  const clearWishlist = async (): Promise<void> => {
    if (isAuthenticated) {
      try {
        await wishlistService.clearWishlist();
      } catch (err) {
        console.error('Failed to clear wishlist on server:', err);
      }
    }
    setWishlist([]);
    showToast(t('toast.wishlistCleared'), { type: 'info' });
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        moveToCart,
        moveAllToCart,
        clearWishlist,
        wishlistCount: wishlist.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
