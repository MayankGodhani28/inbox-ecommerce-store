import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Address } from '../types';
import { authService } from '../services/authService';
import { useToast } from './ToastContext';
import { useTranslation } from './LanguageContext';

interface AuthContextType {
  user: User | null;
  defaultAddress: Address | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<User | null>;
  login: (email: string, password?: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<User>;
  addAddress: (address: Omit<Address, 'id'>) => Promise<Address>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password?: string): Promise<User> => {
    try {
      const loggedUser = await authService.login(email, password);
      setUser(loggedUser);
      showToast(t('toast.welcomeUser', { name: loggedUser.name }), {
        message: loggedUser.role === 'admin' ? t('toast.adminPrivileges') : t('toast.readyShopping'),
        type: 'success',
      });
      return loggedUser;
    } catch (err: any) {
      showToast('Login failed', { message: err?.message || 'Please check credentials', type: 'error' });
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string): Promise<User> => {
    try {
      const newUser = await authService.register(name, email, password, phone);
      setUser(newUser);
      showToast(t('toast.welcomeNewUser', { name: newUser.name }), {
        message: 'Your account is ready.',
        type: 'success',
      });
      return newUser;
    } catch (err: any) {
      showToast('Registration failed', { message: err?.message || 'Unable to register', type: 'error' });
      throw err;
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    showToast(t('toast.loggedOut'), { message: t('toast.loggedOutDesc'), type: 'info' });
  };

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    const updated = await authService.updateProfile(updates);
    setUser(updated);
    showToast(t('toast.profileUpdated'), { message: t('toast.profileUpdatedDesc'), type: 'success' });
    return updated;
  };

  const addAddress = async (addr: Omit<Address, 'id'>): Promise<Address> => {
    const newAddr = await authService.addAddress(addr);
    const refreshed = await authService.getCurrentUser();
    setUser(refreshed);
    showToast(t('toast.addressAdded'), { message: t('toast.addressAddedDesc'), type: 'success' });
    return newAddr;
  };

  const deleteAddress = async (id: string): Promise<void> => {
    await authService.deleteAddress(id);
    const refreshed = await authService.getCurrentUser();
    setUser(refreshed);
    showToast(t('toast.addressRemoved'), { type: 'info' });
  };

  const setDefaultAddress = async (id: string): Promise<void> => {
    await authService.setDefaultAddress(id);
    const refreshed = await authService.getCurrentUser();
    setUser(refreshed);
    showToast(t('toast.defaultAddressUpdated'), { type: 'success' });
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const refreshed = await authService.getCurrentUser();
      setUser(refreshed);
      return refreshed;
    } catch (_err) {
      return null;
    }
  };

  const isAuthenticated = Boolean(user);
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const defaultAddress = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0] || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        defaultAddress,
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
        isLoading,
        refreshUser,
        login,
        register,
        logout,
        updateProfile,
        addAddress,
        deleteAddress,
        setDefaultAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
