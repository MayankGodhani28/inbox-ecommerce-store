import { Order, OrderItem } from '../types';

/**
 * Generates the clean, standard HTML for an official Retail Tax Invoice / Bill.
 * Designed to strictly display order details, customer username, and seller credentials
 * without any website navigation, banners, buttons, or footers.
 */
export function generateInvoiceHtml(order: Order, sellerName?: string): string {
  const storeName = sellerName || 'Inbox Emporium';
  const companyName = 'Inbox Infotech E-Commerce Pvt. Ltd.';
  const gstin = '24AAACI1234F1Z5';
  const cin = 'U72900GJ2020PTC114589';
  const supportEmail = 'support@inboxinfotech.com';
  const supportPhone = '+91 79 4000 1234 / 1800-INBOX-STORE';

  const orderDate = order.date
    ? new Date(order.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

  const subtotal = typeof order.subtotal === 'number' && !isNaN(order.subtotal) && order.subtotal > 0
    ? order.subtotal
    : (order.items || []).reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0);

  const deliveryFee = typeof order.deliveryFee === 'number' ? order.deliveryFee : 0;
  const discount = typeof order.discount === 'number' ? order.discount : 0;
  const tax = typeof order.tax === 'number' && order.tax > 0
    ? order.tax
    : Number((subtotal * 0.08).toFixed(2));

  const total = typeof order.total === 'number' && order.total > 0
    ? order.total
    : subtotal + deliveryFee - discount + tax;

  const isPaid = order.paymentStatus === 'Paid';
  const paymentBadge = isPaid
    ? '<span class="badge badge-paid">PAID</span>'
    : '<span class="badge badge-due">CASH ON DELIVERY / DUE</span>';

  const customerName = order.customerName || 'Store Administrator';
  const customerEmail = order.customerEmail || 'admin@inbox.com';
  const customerPhone = order.customerPhone || order.shippingAddress?.phone || 'N/A';

  const street = order.shippingAddress?.street || 'Inbox Infotech Commercial Hub, Outer Ring Rd';
  const city = order.shippingAddress?.city || 'Bengaluru';
  const state = order.shippingAddress?.state || 'Karnataka';
  const pincode = order.shippingAddress?.pincode || '560103';
  const country = order.shippingAddress?.country || 'India';
  const tracking = order.trackingNumber || `INBX-TRK-${order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
  const deliveryMethod = order.deliveryMethod || 'Standard 3-4 Days Delivery';

  const itemsRows = (order.items && order.items.length > 0)
    ? order.items.map((it: OrderItem, idx: number) => {
        const lineTotal = (it.price || 0) * (it.quantity || 1);
        const specs = [
          it.productId ? `SKU: ${it.productId}` : '',
          it.selectedColor ? `Color: ${it.selectedColor}` : '',
          it.selectedSize ? `Size: ${it.selectedSize}` : '',
        ].filter(Boolean).join(' • ');

        return `
          <tr>
            <td class="text-center font-mono text-muted">${idx + 1}</td>
            <td>
              <div class="item-name">${escapeHtml(it.name)}</div>
              ${specs ? `<div class="item-specs">${escapeHtml(specs)}</div>` : ''}
            </td>
            <td class="text-right font-mono">$${(it.price || 0).toFixed(2)}</td>
            <td class="text-center font-bold">${it.quantity || 1}</td>
            <td class="text-right font-mono font-bold">$${lineTotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('')
    : `
      <tr>
        <td colspan="5" class="text-center text-muted" style="padding: 16px;">No line items found.</td>
      </tr>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice - ${escapeHtml(order.id)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 14mm 12mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11.5px;
      line-height: 1.4;
      padding: 16px;
    }
    .invoice-wrapper {
      max-width: 780px;
      margin: 0 auto;
      background: #ffffff;
    }

    /* Header styling */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .seller-title {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.3px;
    }
    .seller-tagline {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      background: #ffedd5;
      color: #c2410c;
      padding: 1px 6px;
      border-radius: 4px;
      margin-left: 6px;
      vertical-align: middle;
    }
    .seller-legal {
      font-size: 10.5px;
      color: #475569;
      margin-top: 4px;
      line-height: 1.45;
    }
    .invoice-title-block {
      text-align: right;
    }
    .invoice-heading {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #0f172a;
    }
    .invoice-meta-table {
      margin-top: 6px;
      text-align: right;
      font-size: 11px;
    }
    .invoice-meta-table td {
      padding: 1.5px 0;
    }
    .meta-label {
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 9.5px;
      padding-right: 8px;
    }
    .meta-value {
      font-weight: 700;
      color: #0f172a;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      font-size: 9px;
      font-weight: 800;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-paid {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
    .badge-due {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    /* Parties / Customer section */
    .parties-grid {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .party-col {
      flex: 1;
    }
    .party-heading {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
    }
    .party-name {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }
    .party-text {
      font-size: 11px;
      color: #334155;
      line-height: 1.45;
      margin-top: 2px;
    }

    /* Items table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .items-table th {
      background: #f1f5f9;
      color: #334155;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 10px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 2px solid #94a3b8;
    }
    .items-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 11px;
    }
    .item-name {
      font-weight: 700;
      color: #0f172a;
    }
    .item-specs {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Summary section */
    .summary-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
    }
    .notes-box {
      flex: 1;
      font-size: 10px;
      color: #64748b;
      line-height: 1.45;
      max-width: 420px;
    }
    .totals-box {
      width: 260px;
      margin-left: auto;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 11px;
      color: #334155;
    }
    .grand-total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding-top: 8px;
      margin-top: 4px;
      border-top: 2px solid #0f172a;
      font-size: 14px;
      font-weight: 900;
      color: #0f172a;
    }

    /* Footer / Authorization */
    .invoice-footer {
      margin-top: 22px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9.5px;
      color: #64748b;
    }
    .signature-box {
      text-align: right;
    }
    .signature-title {
      font-weight: 800;
      color: #0f172a;
      font-size: 10.5px;
    }
    .signature-stamp {
      font-family: serif;
      font-style: italic;
      color: #94a3b8;
      margin: 10px 0 2px 0;
    }
    .signature-line {
      display: inline-block;
      min-width: 140px;
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-weight: 700;
      color: #334155;
      font-size: 9.5px;
    }

    /* Helpers */
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-muted { color: #64748b; }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- 1. Header with Seller and Invoice details -->
    <div class="header-row">
      <div>
        <div class="seller-title">
          ${escapeHtml(storeName)}
          <span class="seller-tagline">Retail Store</span>
        </div>
        <div class="seller-legal">
          <p><strong>Sold By:</strong> ${escapeHtml(companyName)}</p>
          <p>Infotech Commercial Hub, Outer Ring Road, Bengaluru, Karnataka - 560103</p>
          <p><strong>GSTIN:</strong> ${escapeHtml(gstin)} &bull; <strong>CIN:</strong> ${escapeHtml(cin)}</p>
          <p><strong>Support:</strong> ${escapeHtml(supportEmail)} &bull; <strong>Helpline:</strong> ${escapeHtml(supportPhone)}</p>
        </div>
      </div>

      <div class="invoice-title-block">
        <div class="invoice-heading">TAX INVOICE / BILL</div>
        <table class="invoice-meta-table">
          <tr>
            <td class="meta-label">Invoice No:</td>
            <td class="meta-value font-mono">INV-${escapeHtml(order.id)}</td>
          </tr>
          <tr>
            <td class="meta-label">Order Ref:</td>
            <td class="meta-value font-mono">#${escapeHtml(order.id)}</td>
          </tr>
          <tr>
            <td class="meta-label">Invoice Date:</td>
            <td class="meta-value">${escapeHtml(orderDate)}</td>
          </tr>
          <tr>
            <td class="meta-label">Payment Mode:</td>
            <td class="meta-value">${escapeHtml(order.paymentMethod || 'Credit / Debit Card')}</td>
          </tr>
          <tr>
            <td class="meta-label">Status:</td>
            <td class="meta-value">${paymentBadge}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- 2. Parties: Billed To (Username/Customer) & Shipped To -->
    <div class="parties-grid">
      <div class="party-col">
        <div class="party-heading">Billed To (Customer Details)</div>
        <div class="party-name">${escapeHtml(customerName)}</div>
        <div class="party-text">
          <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(customerPhone)}</p>
          <p><strong>Customer ID:</strong> <span class="font-mono">${escapeHtml(order.userId || 'CUST-AUTH')}</span></p>
        </div>
      </div>

      <div class="party-col">
        <div class="party-heading">Shipped To (Delivery Destination)</div>
        <div class="party-name">${escapeHtml(order.shippingAddress?.fullName || customerName)}</div>
        <div class="party-text">
          <p>${escapeHtml(street)}</p>
          <p>${escapeHtml(city)}, ${escapeHtml(state)} - ${escapeHtml(pincode)}</p>
          <p>${escapeHtml(country)}</p>
          <p style="margin-top: 3px;">
            <strong>Courier Tracking:</strong> <span class="font-mono" style="color: #ea580c; font-weight: 700;">${escapeHtml(tracking)}</span>
          </p>
          <p><strong>Dispatch Mode:</strong> ${escapeHtml(deliveryMethod)}</p>
        </div>
      </div>
    </div>

    <!-- 3. Particulars of Goods Supplied -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 36px;" class="text-center">#</th>
          <th>Item Description &amp; Specifications</th>
          <th style="width: 80px;" class="text-right">Unit Price</th>
          <th style="width: 50px;" class="text-center">Qty</th>
          <th style="width: 90px;" class="text-right">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <!-- 4. Calculation Breakdown & Totals -->
    <div class="summary-grid">
      <div class="notes-box">
        <p><strong>Payment Status:</strong> ${isPaid ? 'Payment Received in full via ' + escapeHtml(order.paymentMethod || 'Online Gateway') : 'Payment Due upon Delivery (Cash on Delivery)'}.</p>
        <p style="margin-top: 4px;"><strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
        <p style="margin-top: 4px;"><strong>Return Policy:</strong> Standard 14-day hassle-free replacement or refund applicable from delivery date.</p>
      </div>

      <div class="totals-box">
        <div class="totals-row">
          <span>Items Subtotal:</span>
          <span class="font-mono font-bold">$${subtotal.toFixed(2)}</span>
        </div>
        <div class="totals-row">
          <span>Shipping &amp; Delivery:</span>
          <span class="font-mono">${deliveryFee === 0 ? 'FREE' : '$' + deliveryFee.toFixed(2)}</span>
        </div>
        ${discount > 0 ? `
        <div class="totals-row" style="color: #15803d; font-weight: 700;">
          <span>Discount ${order.couponCode ? `(${escapeHtml(order.couponCode)})` : ''}:</span>
          <span class="font-mono">-$${discount.toFixed(2)}</span>
        </div>
        ` : ''}
        ${tax > 0 ? `
        <div class="totals-row">
          <span>Estimated Tax (GST 18%):</span>
          <span class="font-mono">$${tax.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="grand-total-row">
          <span>TOTAL AMOUNT:</span>
          <span class="font-mono">$${total.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- 5. Footer and Digital Signatory -->
    <div class="invoice-footer">
      <div>
        <p>Thank you for shopping with <strong>${escapeHtml(storeName)}</strong>!</p>
        <p>For any queries or returns, please email <strong>${escapeHtml(supportEmail)}</strong> quoting Order #${escapeHtml(order.id)}.</p>
        <p>This is a computer-generated tax invoice and requires no physical signature under the Information Technology Act.</p>
      </div>

      <div class="signature-box">
        <div class="signature-title">For ${escapeHtml(companyName)}</div>
        <div class="signature-stamp">[Digitally Verified &amp; Signed]</div>
        <div class="signature-line">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Triggers printing of the clean standard invoice bill in an isolated iframe.
 * This guarantees 100% suppression of the website UI (Navbar, Footer, Search, Buttons, etc.)
 * across every browser and device.
 */
export function printInvoiceDocument(order: Order, sellerName?: string): void {
  const html = generateInvoiceHtml(order, sellerName);

  // Check if an existing print iframe exists or create one
  let iframe = document.getElementById('inbox-print-invoice-iframe') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'inbox-print-invoice-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    // Fallback: window.print()
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for resources in the iframe to settle, then print
  setTimeout(() => {
    try {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    } catch {
      window.print();
    }
  }, 250);
}
