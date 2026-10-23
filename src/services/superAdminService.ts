import { apiClient } from './apiClient';
import { SellerApplication, User } from '../types';

export interface SuperAdminMetrics {
  totalUsers: number;
  totalCustomers: number;
  totalAdmins: number;
  totalSuperAdmins: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalOrders: number;
  totalProducts: number;
  platformRevenue: number;
}

export interface SellerApplyPayload {
  storeName: string;
  legalName: string;
  taxId: string;
  businessAddress: string;
  category: string;
  phone: string;
  description?: string;
  email?: string;
  name?: string;
  password?: string;
}

export const superAdminService = {
  async submitSellerApplication(payload: SellerApplyPayload): Promise<{ application: SellerApplication; message: string }> {
    return apiClient.post('/api/super-admin/seller-apply', payload);
  },

  async getMyApplication(): Promise<{ application: SellerApplication | null }> {
    return apiClient.get('/api/super-admin/my-application');
  },

  async getMetrics(): Promise<{ metrics: SuperAdminMetrics }> {
    return apiClient.get('/api/super-admin/metrics');
  },

  async getApplications(status?: string): Promise<{ applications: SellerApplication[] }> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient.get(`/api/super-admin/applications${query}`);
  },

  async approveApplication(id: string): Promise<{ success: boolean; message: string; application: SellerApplication }> {
    return apiClient.patch(`/api/super-admin/applications/${id}/approve`, {});
  },

  async rejectApplication(id: string, reason: string): Promise<{ success: boolean; message: string; application: SellerApplication }> {
    return apiClient.patch(`/api/super-admin/applications/${id}/reject`, { reason });
  },

  async suspendApplication(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.patch(`/api/super-admin/applications/${id}/suspend`, {});
  },

  async unsuspendApplication(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.patch(`/api/super-admin/applications/${id}/unsuspend`, {});
  },

  async getAdmins(): Promise<{ admins: User[] }> {
    return apiClient.get('/api/super-admin/admins');
  },

  async updateAdminStatus(id: string, updates: { sellerStatus?: string; role?: string }): Promise<{ success: boolean; user: User }> {
    return apiClient.patch(`/api/super-admin/admins/${id}/status`, updates);
  },
};

