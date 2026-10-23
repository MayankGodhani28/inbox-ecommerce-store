import { User, Address } from '../types';
import { apiClient } from './apiClient';

// Clean up obsolete demo auth keys on module load
try {
  localStorage.removeItem('inbox_auth_user_v1');
  localStorage.removeItem('inbox_all_users_v1');
} catch (_err) {
  // localStorage might be unavailable or restricted
}

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    try {
      const data = await apiClient.get<{ user: User }>('/api/auth/me');
      return data?.user || null;
    } catch (_err) {
      return null;
    }
  },

  async login(email: string, password?: string): Promise<User> {
    const data = await apiClient.post<{ user: User; message: string }>('/api/auth/login', {
      email,
      password,
    });
    return data.user;
  },

  async register(name: string, email: string, password: string, phone?: string): Promise<User> {
    const data = await apiClient.post<{ user: User; message: string }>('/api/auth/register', {
      name,
      email,
      password,
      phone,
    });
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (err) {
      console.warn('[Auth] Logout error:', err);
    }
  },

  // Address and profile methods (forwarded to /api/me when Task 05 is reached, temporary placeholders)
  async updateProfile(updates: Partial<User>): Promise<User> {
    const data = await apiClient.patch<{ user: User }>('/api/me', updates);
    return data.user;
  },

  async addAddress(address: Omit<Address, 'id'>): Promise<Address> {
    const data = await apiClient.post<{ address: Address }>('/api/me/addresses', address);
    return data.address;
  },

  async deleteAddress(addressId: string): Promise<void> {
    await apiClient.delete(`/api/me/addresses/${addressId}`);
  },

  async setDefaultAddress(addressId: string): Promise<void> {
    await apiClient.patch(`/api/me/addresses/${addressId}/default`);
  },
};
