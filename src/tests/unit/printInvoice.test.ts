import { describe, it, expect } from 'vitest';
import { generateInvoiceHtml } from '../../utils/printInvoice';
import { Order } from '../../types';

const SAMPLE_ORDER: Order = {
  id: 'INB-ST-598136-8360',
  userId: 'user-admin',
  customerName: 'Store Administrator',
  customerEmail: 'admin@inbox.com',
  customerPhone: '+91 9988776655',
  date: '2026-10-28T14:54:00.000Z',
  items: [
    {
      productId: 'prod-1',
      name: 'apple',
      price: 199.99,
      quantity: 1,
      image: 'https://example.com/apple.png',
    },
    {
      productId: 'prod-2',
      name: 'Designing Data-Intensive Applications (Hardcover Collector)',
      price: 46.99,
      quantity: 1,
      image: 'https://example.com/book1.png',
    },
    {
      productId: 'prod-3',
      name: 'Atomic Habits: Tiny Changes, Remarkable Results',
      price: 18.50,
      quantity: 1,
      image: 'https://example.com/book2.png',
    },
  ],
  subtotal: 265.48,
  deliveryFee: 0,
  discount: 0,
  tax: 21.24,
  total: 286.72,
  shippingAddress: {
    id: 'addr-admin',
    fullName: 'Store Administrator',
    phone: '+91 9988776655',
    street: 'Inbox Infotech Tower, Outer Ring Rd',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560103',
    country: 'India',
  },
  deliveryMethod: 'Standard',
  paymentMethod: 'Credit / Debit Card',
  paymentStatus: 'Paid',
  status: 'Confirmed',
  statusHistory: [],
  trackingNumber: 'Pending courier assignment',
};

describe('printInvoice Utility — Standard Bill Generator', () => {
  it('generates standard bill HTML with seller credentials and zero website navigation', () => {
    const html = generateInvoiceHtml(SAMPLE_ORDER, 'Inbox Emporium');

    // Contains seller name
    expect(html).toContain('Inbox Emporium');
    expect(html).toContain('Sold By:');
    expect(html).toContain('Inbox Infotech E-Commerce Pvt. Ltd.');
    expect(html).toContain('24AAACI1234F1Z5');

    // Contains customer username
    expect(html).toContain('Store Administrator');
    expect(html).toContain('admin@inbox.com');

    // Contains order details
    expect(html).toContain('INB-ST-598136-8360');
    expect(html).toContain('TAX INVOICE / BILL');
    expect(html).toContain('PAID');

    // Contains items table
    expect(html).toContain('apple');
    expect(html).toContain('Designing Data-Intensive Applications (Hardcover Collector)');
    expect(html).toContain('Atomic Habits: Tiny Changes, Remarkable Results');

    // Contains financial totals
    expect(html).toContain('$265.48');
    expect(html).toContain('$286.72');

    // Crucially: MUST NOT contain website UI
    expect(html).not.toContain('All Products');
    expect(html).not.toContain('Search 40+ products');
    expect(html).not.toContain('PAYMENT &amp; ORDER CONFIRMED!');
    expect(html).not.toContain('Track Package Live');
    expect(html).not.toContain('Continue Shopping');
    expect(html).not.toContain('Free Express Shipping');
    expect(html).not.toContain('STAY UPDATED');
    expect(html).not.toContain('Subscribe to Newsletter');
  });
});
