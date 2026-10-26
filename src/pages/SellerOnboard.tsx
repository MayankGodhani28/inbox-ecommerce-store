import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { superAdminService } from '../services/superAdminService';
import { SellerApplication } from '../types';
import {
  Store,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Truck,
  DollarSign,
  ArrowRight,
  Sparkles,
  Building2,
  FileText,
  Mail,
  User as UserIcon,
  Phone,
  MapPin,
  HelpCircle,
  XCircle,
  BadgeCheck,
} from 'lucide-react';

interface SellerOnboardProps {
  onNavigate: (tab: string, param?: string) => void;
  onOpenAuthModal?: () => void;
}

export const SellerOnboard: React.FC<SellerOnboardProps> = ({ onNavigate, onOpenAuthModal }) => {
  const { user, isAuthenticated, isAdmin, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [existingApp, setExistingApp] = useState<SellerApplication | null>(null);
  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Form State
  const [storeName, setStoreName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [phone, setPhone] = useState(user?.phone || '');
  const [businessAddress, setBusinessAddress] = useState('');
  const [description, setDescription] = useState('');

  // Unauthenticated user registration fields
  const [applicantName, setApplicantName] = useState(user?.name || '');
  const [applicantEmail, setApplicantEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');

  // Load existing application if user is logged in
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      superAdminService
        .getMyApplication()
        .then((res) => {
          if (isMounted) {
            setExistingApp(res.application);
            setIsLoadingApp(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingApp(false);
        });
    } else {
      setIsLoadingApp(false);
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim() || !legalName.trim() || !taxId.trim() || !businessAddress.trim() || !phone.trim()) {
      showToast('Missing details', { message: 'Please complete all required fields.', type: 'error' });
      return;
    }

    if (!isAuthenticated && (!applicantName.trim() || !applicantEmail.trim() || !password.trim())) {
      showToast('Account creation required', {
        message: 'Please provide name, email, and password to create your seller account.',
        type: 'error',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await superAdminService.submitSellerApplication({
        storeName: storeName.trim(),
        legalName: legalName.trim(),
        taxId: taxId.trim(),
        category,
        phone: phone.trim(),
        businessAddress: businessAddress.trim(),
        description: description.trim(),
        email: !isAuthenticated ? applicantEmail.trim() : undefined,
        name: !isAuthenticated ? applicantName.trim() : undefined,
        password: !isAuthenticated ? password.trim() : undefined,
      });

      setExistingApp(res.application);
      setSubmittedSuccess(true);
      await refreshUser();
      showToast('Application Submitted!', {
        message: 'Your merchant application has been queued for Super Admin verification.',
        type: 'success',
      });
      // Redirect to default page (home)
      onNavigate('home');
    } catch (err: any) {
      showToast('Submission Failed', {
        message: err?.message || 'Could not submit application. Please verify details.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Top Hero Section (Clean Light Mode) */}
      <div className="relative border-b border-slate-200/80 bg-gradient-to-b from-orange-50/50 via-white to-slate-50 py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 size-96 rounded-full bg-gradient-to-br from-orange-200/30 to-indigo-200/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-80 rounded-full bg-gradient-to-tr from-indigo-200/30 to-emerald-100/20 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="max-w-2xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-[#E84A27] text-xs font-bold mb-6 shadow-xs">
                <Sparkles className="size-4" />
                <span>inBox Marketplace Seller Onboarding</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                Sell your products to millions of shoppers.
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Join inBox as an authorized merchant. Apply once with your business details, get verified by our Super Admin team, and unlock your dedicated merchant store panel.
              </p>

              {/* Value Props in Light Cards */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <TrendingUp className="size-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900">0% Setup Fee</p>
                    <p className="text-[11px] text-slate-500">Launch with zero upfront costs</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="size-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                    <Truck className="size-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900">Fast Logistics</p>
                    <p className="text-[11px] text-slate-500">Nationwide courier delivery</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900">Verified Sellers</p>
                    <p className="text-[11px] text-slate-500">Super Admin KYC screening</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Banner Graphic in Crisp Light Mode */}
            <div className="w-full lg:w-96 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-md">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 mb-4 flex items-center gap-2">
                <BadgeCheck className="size-4 text-indigo-600" />
                Real-World Approval Pipeline
              </h3>
              <ol className="relative border-l border-slate-200 ml-3 space-y-6 text-left">
                <li className="ml-5">
                  <span className="absolute -left-2.5 flex items-center justify-center size-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-xs">
                    1
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">Submit Merchant Application</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Provide store name, tax ID (GSTIN/EIN), address, and inventory focus.
                  </p>
                </li>
                <li className="ml-5">
                  <span className="absolute -left-2.5 flex items-center justify-center size-5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-300 text-[10px] font-bold">
                    2
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">Super Admin KYC Verification</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Platform owner reviews compliance, authenticity, and store safety.
                  </p>
                </li>
                <li className="ml-5">
                  <span className="absolute -left-2.5 flex items-center justify-center size-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                    3
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">Admin Privileges Granted</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Instant access to merchant dashboard at <code className="text-emerald-700 font-mono font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">/admin</code> to upload items!
                  </p>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* State A: Already Approved Merchant */}
        {isAdmin && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center mb-8 shadow-sm">
            <div className="size-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-inner">
              <CheckCircle2 className="size-8" />
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-200">
              Authorized Store Administrator
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-3">You are an Approved inBox Seller!</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mt-2 mb-6">
              Your account has full Store Administrator privileges. You can manage products, fulfill customer orders, and adjust inventory right now.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('admin')}
                className="px-6 py-3 bg-[#008060] hover:bg-[#006e52] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <Store className="size-4" />
                Open Merchant Admin Panel
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                Browse Storefront
              </button>
            </div>
          </div>
        )}

        {/* State B: Pending Application */}
        {!isAdmin && existingApp && existingApp.status === 'PENDING' && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-8 mb-8 text-center shadow-sm">
            <div className="size-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-300 animate-pulse">
              <Clock className="size-8" />
            </div>
            <span className="px-3.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider border border-amber-200">
              Status: Under Super Admin Review
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-3">Application Queued for Verification</h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2 mb-6">
              We received your seller application for <strong className="text-slate-900 font-bold">{existingApp.storeName}</strong>. Our Super Admin team is verifying your business credentials and tax registration.
            </p>

            <div className="max-w-md mx-auto bg-white border border-slate-200/90 rounded-2xl p-5 text-left text-xs space-y-2.5 mb-6 shadow-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Store Name:</span>
                <span className="text-slate-900 font-bold">{existingApp.storeName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Legal Entity:</span>
                <span className="text-slate-900 font-semibold">{existingApp.legalName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Tax ID / GSTIN:</span>
                <span className="text-amber-700 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {existingApp.taxId}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Category:</span>
                <span className="text-slate-900 font-medium">{existingApp.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Submitted:</span>
                <span className="text-slate-700">{new Date(existingApp.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Typical turnaround time is 2-24 hours. Once approved, your account will be automatically promoted to Admin!
            </p>
          </div>
        )}

        {/* State C: Rejected Application */}
        {!isAdmin && existingApp && existingApp.status === 'REJECTED' && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 mb-8 text-center shadow-sm">
            <div className="size-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-300">
              <XCircle className="size-8" />
            </div>
            <span className="px-3.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider border border-rose-200">
              Application Requires Revision
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-3">Application Not Approved</h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2">
              The Super Admin reviewed your application for <strong className="text-slate-900 font-bold">{existingApp.storeName}</strong> and left the following feedback:
            </p>
            {existingApp.reviewNotes && (
              <div className="max-w-md mx-auto my-4 p-3.5 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-medium shadow-xs">
                "{existingApp.reviewNotes}"
              </div>
            )}
            <p className="text-xs text-slate-500 mb-6">
              You can correct your information below and submit a revised application.
            </p>
            <button
              onClick={() => setExistingApp(null)}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Submit Revised Application
            </button>
          </div>
        )}

        {/* State D: Onboarding Application Form in Bright Clean Light Mode */}
        {(!isAdmin && (!existingApp || existingApp.status === 'REJECTED')) && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm">
            <div className="border-b border-slate-100 pb-6 mb-8">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-orange-100 text-[#E84A27] flex items-center justify-center">
                  <Building2 className="size-5" />
                </div>
                Merchant Application Form
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Fill in your legal business and store details. This goes straight to the Super Admin verification inbox.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account details if guest */}
              {!isAuthenticated && (
                <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-900 text-xs font-bold">
                    <UserIcon className="size-4 text-indigo-600" />
                    <span>Create Your Seller Master Account</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Work Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        placeholder="seller@yourbrand.com"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Account Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Store & Legal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Store className="size-3.5 text-indigo-600" />
                    Public Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Aura Sound & Tech"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E84A27] focus:ring-1 focus:ring-[#E84A27]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    This will appear on your storefront and product listings.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-indigo-600" />
                    Registered Legal Entity Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. Aura Acoustics Technologies LLC"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E84A27] focus:ring-1 focus:ring-[#E84A27]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Official business name registered with government authorities.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FileText className="size-3.5 text-indigo-600" />
                    Tax Identification / GSTIN / EIN *
                  </label>
                  <input
                    type="text"
                    required
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g. 27AABCA1234F1Z5 or 12-3456789"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E84A27] focus:ring-1 focus:ring-[#E84A27] uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Phone className="size-3.5 text-indigo-600" />
                    Business Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E84A27] focus:ring-1 focus:ring-[#E84A27]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Primary Inventory Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E84A27] focus:ring-1 focus:ring-[#E84A27] cursor-pointer"
                  >
                    <option value="Electronics">Electronics & Gadgets</option>
                    <option value="Fashion">Fashion & Apparel</option>
                    <option value="Home & Living">Home & Living</option>
                    <option value="Beauty">Beauty & Personal Care</option>
                    <option value="Sports">Sports & Outdoors</option>
                    <option value="Books">Books & Media</option>
                    <option value="General">General Merchandise</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-indigo-600" />
                  Registered Business Address *
                </label>
                <input
                  type="text"
                  required
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="Street Address, City, State/Province, Postal Code, Country"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E84A27] focus:ring-1 focus:ring-[#E84A27]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Product Line & Brand Story (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell our Super Admin team about the products you manufacture or curate, expected monthly volume, or existing online presence..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E84A27] focus:ring-1 focus:ring-[#E84A27]"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span>By submitting, you agree to inBox Merchant Terms & SLAs.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3 bg-[#E84A27] hover:bg-[#d43f1d] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-600/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Submitting Application...</span>
                  ) : (
                    <>
                      <span>Submit Application for Review</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
