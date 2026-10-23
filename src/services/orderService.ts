import { apiClient } from './apiClient';
import { Order, OrderStatus } from '../types';

export const orderService = {
  async getOrders(): Promise<Order[]> {
    try {
      const res = await apiClient.get('/api/orders');
      return res.orders || [];
    } catch (err) {
      console.error('Failed to get orders:', err);
      return [];
    }
  },

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const res = await apiClient.get(`/api/orders/${id}`);
      return res.order || null;
    } catch {
      return null;
    }
  },

  async getUserOrders(_userId?: string): Promise<Order[]> {
    return this.getOrders();
  },

  async createOrder(orderData: {
    items?: Array<{ productId: string; quantity: number; selectedColor?: string; selectedSize?: string }>;
    shippingAddress: any;
    deliveryMethod: 'Standard' | 'Express';
    paymentMethod: string;
    couponCode?: string;
    expectedTotalMinor?: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    idempotencyKey?: string;
  }): Promise<Order> {
    const idempotencyKey =
      orderData.idempotencyKey || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const res = await apiClient.post(
      '/api/orders',
      orderData,
      {
        headers: {
          'idempotency-key': idempotencyKey,
        },
      }
    );

    return res.order;
  },

  async updateOrderStatus(orderId: string, newStatus: OrderStatus, note?: string, trackingNumber?: string): Promise<Order> {
    const res = await apiClient.patch(`/api/orders/${orderId}/status`, {
      status: newStatus,
      note,
      trackingNumber,
    });
    return res.order;
  },

  async collectCodPayment(orderId: string): Promise<Order> {
    const res = await apiClient.patch(`/api/orders/${orderId}/collect-payment`);
    return res.order;
  },

  async getAdminOrders(): Promise<Order[]> {
    try {
      const res = await apiClient.get('/api/admin/orders');
      return res.orders || [];
    } catch {
      return [];
    }
  },

  async getAdminMetrics(): Promise<{
    paidRevenue: number;
    paidRevenueMinor: number;
    totalOrders: number;
    pendingOrders: number;
    unpaidCodOrders: number;
    lowStockCount: number;
    totalCustomers: number;
  }> {
    const res = await apiClient.get('/api/admin/metrics');
    return res.metrics;
  },

  async getAdminCustomers(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    avatarUrl?: string | null;
    orderCount: number;
    totalSpent: number;
    createdAt: string;
  }>> {
    const res = await apiClient.get('/api/admin/customers');
    return res.customers;
  },
};
