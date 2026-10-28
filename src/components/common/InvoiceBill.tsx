import React from 'react';
import { Order, OrderItem } from '../../types';
import { BrandLogo } from './BrandLogo';

interface InvoiceBillProps {
  order: Order;
  className?: string;
}

export const InvoiceBill: React.FC<InvoiceBillProps> = ({ order, className = '' }) => {
  const formattedDate = order.date
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

  const subtotal = typeof order.subtotal === 'number' && !isNaN(order.subtotal)
    ? order.subtotal
    : order.items?.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0) || order.total || 0;

  const deliveryFee = typeof order.deliveryFee === 'number' ? order.deliveryFee : 0;
  const discount = typeof order.discount === 'number' ? order.discount : 0;
  const tax = typeof order.tax === 'number' ? order.tax : 0;
  const total = typeof order.total === 'number' ? order.total : subtotal + deliveryFee - discount + tax;

  const isPaid = order.paymentStatus === 'Paid';

  return (
    <div
      className={`printable-bill bg-white text-slate-900 p-8 sm:p-10 max-w-4xl mx-auto border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none text-xs leading-relaxed font-sans ${className}`}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. OFFICIAL TAX INVOICE HEADER                       */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-slate-800">
        <div>
          <BrandLogo size="md" showSubtitle={true} />
          <div className="mt-3 text-[11px] text-slate-600 space-y-0.5">
            <p className="font-bold text-slate-800">Inbox Infotech E-Commerce Pvt. Ltd.</p>
            <p>Infotech Commercial Hub, Ring Road, Surat, Gujarat - 395007</p>
            <p>
              <span className="font-semibold text-slate-700">GSTIN:</span> 24AAACI1234F1Z5 &bull;{' '}
              <span className="font-semibold text-slate-700">CIN:</span> U72900GJ2020PTC114589
            </p>
            <p>
              <span className="font-semibold text-slate-700">Support:</span> support@inboxinfotech.com &bull; +91 79 4000 1234
            </p>
            <p>
              <span className="font-semibold text-slate-700">Website:</span> www.inboxinfotech.com
            </p>
          </div>
        </div>

        <div className="sm:text-right shrink-0">
          <span className="inline-block px-3 py-1 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded">
            TAX INVOICE / CASH BILL
          </span>
          <div className="mt-3 text-[11px] space-y-1">
            <p>
              <span className="text-slate-500 font-semibold uppercase">Invoice No:</span>{' '}
              <strong className="font-mono text-slate-900 text-xs">INV-{order.id}</strong>
            </p>
            <p>
              <span className="text-slate-500 font-semibold uppercase">Order Ref:</span>{' '}
              <strong className="font-mono text-slate-800">#{order.id}</strong>
            </p>
            <p>
              <span className="text-slate-500 font-semibold uppercase">Invoice Date:</span>{' '}
              <span className="text-slate-800 font-medium">{formattedDate}</span>
            </p>
            <p>
              <span className="text-slate-500 font-semibold uppercase">Payment Status:</span>{' '}
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {isPaid ? 'PAID' : 'DUE / CASH ON DELIVERY'}
              </span>
            </p>
            <p>
              <span className="text-slate-500 font-semibold uppercase">Payment Mode:</span>{' '}
              <span className="text-slate-800 font-semibold">{order.paymentMethod || 'Online Payment'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. CUSTOMER & SHIPPING DISPATCH DETAILS               */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
            Billed To &bull; Customer Details
          </h3>
          <p className="font-extrabold text-sm text-slate-900">{order.customerName}</p>
          <p className="text-slate-600 font-mono mt-0.5">{order.customerEmail}</p>
          {order.customerPhone && (
            <p className="text-slate-600 mt-0.5">Phone: {order.customerPhone}</p>
          )}
          {order.shippingAddress && (
            <p className="text-slate-600 mt-1">
              Customer ID: <span className="font-mono">{order.userId || 'CUST-REG'}</span>
            </p>
          )}
        </div>

        <div>
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
            Shipped To &bull; Delivery Destination
          </h3>
          {order.shippingAddress ? (
            <div className="text-slate-700 space-y-0.5">
              <p className="font-bold text-slate-900">{order.shippingAddress.fullName || order.customerName}</p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
              </p>
              <p className="font-semibold text-slate-800">{order.shippingAddress.country || 'India'}</p>
              {order.shippingAddress.phone && (
                <p className="text-[11px] text-slate-500">Contact: {order.shippingAddress.phone}</p>
              )}
            </div>
          ) : (
            <p className="text-slate-500 italic">Standard registered delivery address</p>
          )}

          <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-x-4 text-[11px] text-slate-600">
            <div>
              <span className="font-semibold text-slate-500">Shipping Mode:</span>{' '}
              <span className="font-bold text-slate-800">{order.deliveryMethod || 'Express Courier'}</span>
            </div>
            {order.trackingNumber && (
              <div>
                <span className="font-semibold text-slate-500">Tracking:</span>{' '}
                <span className="font-mono font-bold text-orange-600">{order.trackingNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. ITEMIZED ORDER PARTICULARS TABLE                  */}
      {/* ---------------------------------------------------- */}
      <div className="py-6">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3">
          Particulars of Goods Supplied
        </h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-300 text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
              <th className="py-2.5 px-3 text-center w-16">Qty</th>
              <th className="py-2.5 px-3 text-right w-28">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {order.items && order.items.length > 0 ? (
              order.items.map((it: OrderItem, idx: number) => {
                const itemTotal = (it.price || 0) * (it.quantity || 1);
                return (
                  <tr key={`${it.productId}-${idx}`} className="align-top">
                    <td className="py-3 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900 text-xs">{it.name}</p>
                      <div className="text-[10px] text-slate-500 mt-0.5 space-x-2">
                        <span className="font-mono">SKU: {it.productId}</span>
                        {it.selectedColor && <span>&bull; Color: {it.selectedColor}</span>}
                        {it.selectedSize && <span>&bull; Size: {it.selectedSize}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      ${(it.price || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {it.quantity}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      ${itemTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400">
                  No line items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. TOTALS & SUMMARY FINANCIAL CALCULATION             */}
      {/* ---------------------------------------------------- */}
      <div className="pt-4 border-t-2 border-slate-300 flex flex-col sm:flex-row justify-between items-start gap-6">
        <div className="max-w-xs space-y-2">
          {/* Simulated Barcode for official bill look */}
          <div className="pt-1">
            <svg
              className="w-48 h-10 opacity-80"
              viewBox="0 0 160 35"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="0" y="0" width="2" height="30" />
              <rect x="4" y="0" width="1" height="30" />
              <rect x="7" y="0" width="3" height="30" />
              <rect x="12" y="0" width="1" height="30" />
              <rect x="15" y="0" width="2" height="30" />
              <rect x="19" y="0" width="4" height="30" />
              <rect x="25" y="0" width="1" height="30" />
              <rect x="28" y="0" width="3" height="30" />
              <rect x="33" y="0" width="2" height="30" />
              <rect x="37" y="0" width="1" height="30" />
              <rect x="40" y="0" width="4" height="30" />
              <rect x="46" y="0" width="2" height="30" />
              <rect x="50" y="0" width="1" height="30" />
              <rect x="53" y="0" width="3" height="30" />
              <rect x="58" y="0" width="2" height="30" />
              <rect x="62" y="0" width="3" height="30" />
              <rect x="67" y="0" width="1" height="30" />
              <rect x="70" y="0" width="4" height="30" />
              <rect x="76" y="0" width="2" height="30" />
              <rect x="80" y="0" width="1" height="30" />
              <rect x="83" y="0" width="3" height="30" />
              <rect x="88" y="0" width="2" height="30" />
              <rect x="92" y="0" width="1" height="30" />
              <rect x="95" y="0" width="4" height="30" />
              <rect x="101" y="0" width="2" height="30" />
              <rect x="105" y="0" width="3" height="30" />
              <rect x="110" y="0" width="1" height="30" />
              <rect x="113" y="0" width="2" height="30" />
              <rect x="117" y="0" width="4" height="30" />
              <rect x="123" y="0" width="1" height="30" />
              <rect x="126" y="0" width="3" height="30" />
              <rect x="131" y="0" width="2" height="30" />
              <rect x="135" y="0" width="1" height="30" />
              <rect x="138" y="0" width="4" height="30" />
              <rect x="144" y="0" width="2" height="30" />
              <rect x="148" y="0" width="1" height="30" />
              <rect x="151" y="0" width="3" height="30" />
              <rect x="156" y="0" width="2" height="30" />
            </svg>
            <p className="font-mono text-[9px] text-slate-500 tracking-widest mt-0.5">
              *INV-{order.id.toUpperCase()}*
            </p>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            All prices are in USD and include applicable Goods and Services Tax (GST).
          </p>
        </div>

        <div className="w-full sm:w-72 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Items Subtotal</span>
            <span className="font-mono font-medium">${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>Shipping &amp; Handling</span>
            <span className="font-mono font-medium">
              {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
            </span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
              <span className="font-mono">-${discount.toFixed(2)}</span>
            </div>
          )}

          {tax > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Estimated Tax (GST 18%)</span>
              <span className="font-mono font-medium">${tax.toFixed(2)}</span>
            </div>
          )}

          <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-baseline text-slate-900">
            <span className="font-black text-sm uppercase">Total Amount</span>
            <span className="font-mono font-black text-lg">${total.toFixed(2)}</span>
          </div>

          <div className="pt-1 text-[10px] text-slate-500 text-right">
            <span>Payment Mode: </span>
            <strong className="text-slate-700">{order.paymentMethod || 'Online'}</strong>
            {order.transactionId && (
              <span className="block font-mono text-[9px] text-slate-400">
                Txn: {order.transactionId}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 5. LEGAL DECLARATION & SIGNATURE FOOTER              */}
      {/* ---------------------------------------------------- */}
      <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end text-[10px] text-slate-500">
        <div>
          <p className="font-bold text-slate-700 uppercase tracking-wider mb-1">Terms &amp; Conditions:</p>
          <ul className="list-disc pl-3.5 space-y-0.5 leading-snug">
            <li>Goods once sold are covered by Inbox 14-day hassle-free return policy.</li>
            <li>Manufacturer warranty applies where provided. Keep this bill for claim verification.</li>
            <li>For support queries, email support@inboxinfotech.com or quote order #{order.id}.</li>
            <li>This is a computer-generated tax invoice and requires no physical signature under IT Act 2000.</li>
          </ul>
        </div>

        <div className="text-right sm:pr-4">
          <p className="font-bold text-slate-800 text-[11px]">For INBOX INFOTECH PVT. LTD.</p>
          <div className="h-10 flex items-center justify-end">
            <span className="italic font-serif text-slate-400 text-xs tracking-wider">
              [Digitally Signed &amp; Verified]
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-600 border-t border-slate-300 pt-1 inline-block min-w-[140px]">
            Authorized Signatory
          </p>
        </div>
      </div>
    </div>
  );
};
