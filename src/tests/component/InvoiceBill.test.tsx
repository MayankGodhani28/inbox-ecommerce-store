import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { InvoiceBill } from '../../components/common/InvoiceBill';
import { Order } from '../../types';

const MOCK_ORDER: Order = {
  id: 'ord-test-12345',
  userId: 'user-456',
  customerName: 'Mayank Godhani',
  customerEmail: 'mayank@inboxinfotech.com',
  customerPhone: '+91 9876543210',
  date: '2026-10-28T10:00:00.000Z',
  items: [
    {
      productId: 'prod-lap-1',
      name: 'MacBook Pro 16" M3 Max',
      price: 3499.00,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
      selectedColor: 'Space Black',
      selectedSize: '36GB RAM / 1TB SSD',
    },
    {
      productId: 'prod-acc-1',
      name: 'Magic Mouse Wireless',
      price: 99.00,
      quantity: 2,
      image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
    },
  ],
  subtotal: 3697.00,
  deliveryFee: 0,
  discount: 100.00,
  tax: 647.46,
  total: 4244.46,
  couponCode: 'SAVE100',
  shippingAddress: {
    id: 'addr-1',
    fullName: 'Mayank Godhani',
    phone: '+91 9876543210',
    street: '123 Ring Road, Commercial Zone',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395007',
    country: 'India',
  },
  deliveryMethod: 'Express',
  paymentMethod: 'UPI / QR',
  paymentStatus: 'Paid',
  status: 'Confirmed',
  statusHistory: [],
  trackingNumber: 'INBX-TRK-998877',
};

describe('InvoiceBill Component — Print Feature Verification', () => {
  it('renders official tax invoice header and company legal credentials', () => {
    const { container } = render(<InvoiceBill order={MOCK_ORDER} />);

    expect(screen.getByText(/TAX INVOICE \/ CASH BILL/i)).toBeInTheDocument();
    expect(screen.getByText(/Inbox Infotech E-Commerce Pvt\. Ltd\./i)).toBeInTheDocument();
    expect(screen.getByText(/24AAACI1234F1Z5/i)).toBeInTheDocument();
    expect(screen.getAllByText(/support@inboxinfotech\.com/i).length).toBeGreaterThan(0);

    // Verify printable-bill root class for @media print CSS targeting
    expect(container.querySelector('.printable-bill')).not.toBeNull();
  });

  it('renders invoice metadata with correct invoice and order IDs', () => {
    render(<InvoiceBill order={MOCK_ORDER} />);

    expect(screen.getByText('INV-ord-test-12345')).toBeInTheDocument();
    expect(screen.getByText('#ord-test-12345')).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
    expect(screen.getAllByText('UPI / QR').length).toBeGreaterThan(0);
  });

  it('renders complete customer billing and delivery destination details', () => {
    render(<InvoiceBill order={MOCK_ORDER} />);

    expect(screen.getAllByText('Mayank Godhani').length).toBeGreaterThan(0);
    expect(screen.getByText('mayank@inboxinfotech.com')).toBeInTheDocument();
    expect(screen.getByText(/123 Ring Road, Commercial Zone/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Surat, Gujarat - 395007/i).length).toBeGreaterThan(0);
    expect(screen.getByText('INBX-TRK-998877')).toBeInTheDocument();
  });

  it('renders all line items with SKU, specifications, quantities, and pricing', () => {
    render(<InvoiceBill order={MOCK_ORDER} />);

    expect(screen.getByText('MacBook Pro 16" M3 Max')).toBeInTheDocument();
    expect(screen.getByText(/SKU: prod-lap-1/i)).toBeInTheDocument();
    expect(screen.getByText(/Color: Space Black/i)).toBeInTheDocument();
    expect(screen.getByText(/Size: 36GB RAM \/ 1TB SSD/i)).toBeInTheDocument();

    expect(screen.getByText('Magic Mouse Wireless')).toBeInTheDocument();
    expect(screen.getByText(/SKU: prod-acc-1/i)).toBeInTheDocument();
  });

  it('renders correct financial breakdown including subtotal, discount, tax and grand total', () => {
    render(<InvoiceBill order={MOCK_ORDER} />);

    expect(screen.getByText('$3697.00')).toBeInTheDocument();
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByText('-$100.00')).toBeInTheDocument();
    expect(screen.getByText('$647.46')).toBeInTheDocument();
    expect(screen.getByText('$4244.46')).toBeInTheDocument();
  });

  it('renders legal disclaimer and digitally verified signatory line', () => {
    render(<InvoiceBill order={MOCK_ORDER} />);

    expect(screen.getByText(/computer-generated tax invoice and requires no physical signature/i)).toBeInTheDocument();
    expect(screen.getByText(/Authorized Signatory/i)).toBeInTheDocument();
    expect(screen.getByText(/For INBOX INFOTECH PVT\. LTD\./i)).toBeInTheDocument();
  });
});

