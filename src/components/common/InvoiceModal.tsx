import React, { useEffect } from 'react';
import { Order } from '../../types';
import { InvoiceBill } from './InvoiceBill';
import { Printer, X } from 'lucide-react';
import { printInvoiceDocument } from '../../utils/printInvoice';

interface InvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    printInvoiceDocument(order);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs print:static print:p-0 print:m-0 print:bg-white print:z-auto print:block"
      role="dialog"
      aria-modal="true"
      aria-label={`Official Tax Invoice #${order.id}`}
    >
      {/* Click-away backdrop (screen only) */}
      <div
        className="fixed inset-0 -z-10 print:hidden cursor-default"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 print:max-w-none print:w-full print:max-h-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
        {/* Modal Top Bar (Screen Only - Hidden in Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Tax Invoice &bull; Order #{order.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#E84A27] hover:bg-[#d63f1f] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Print Bill or Save as PDF"
            >
              <Printer className="size-3.5" />
              <span>Print Official Bill</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close invoice preview"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable Screen View & Clean Print Output */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:bg-white print:p-0 print:overflow-visible print:m-0">
          <InvoiceBill order={order} />
        </div>
      </div>
    </div>
  );
};
