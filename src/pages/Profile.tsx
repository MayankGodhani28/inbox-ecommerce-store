import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../context/LanguageContext';
import { Address } from '../types';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Check,
  Package,
  Heart,
  ShieldCheck,
  ChevronRight,
  LogOut,
} from 'lucide-react';

interface ProfileProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const { user, updateProfile, addAddress, deleteAddress, setDefaultAddress, logout, isAdmin } = useAuth();
  const { showToast } = useToast();
  const { t, tRole } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Add address modal/form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">{t('profile.notLoggedInTitle')}</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Sign in to view your personalized profile, manage shipping addresses, and sync your preferences.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => onNavigate('home')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {t('profile.returnHome')}
          </button>
          <button
            onClick={() => onNavigate('login', 'profile')}
            className="px-6 py-2.5 bg-[#E84A27] hover:bg-[#d03d1c] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            Sign In to Account
          </button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ name, phone });
      setIsEditing(false);
    } catch {
      // AuthContext displays error toast
    }
  };

  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!street || !city || !state || !postalCode) {
      showToast(t('toast.requiredFields'), { type: 'error' });
      return;
    }
    try {
      await addAddress({
        fullName: user.name,
        phone: user.phone || phone || '+91 98765 43210',
        street,
        city,
        state,
        pincode: postalCode,
        country,
        type: 'Home',
        isDefault: (user.addresses || []).length === 0,
      });
      setShowAddressForm(false);
      setStreet('');
      setCity('');
      setState('');
      setPostalCode('');
    } catch {
      // AuthContext displays error toast
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6">
        <button onClick={() => onNavigate('home')} className="hover:text-slate-700 cursor-pointer">{t('profile.breadcrumbHome')}</button>
        <ChevronRight className="size-3" />
        <span className="text-slate-800">{t('profile.breadcrumbProfile')}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Profile Card & Shortcuts (Cols 1-4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs text-center">
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
              alt={user.name}
              className="size-20 rounded-full object-cover mx-auto border-2 border-orange-500 shadow-md mb-3"
            />
            <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
            <p className="text-xs text-slate-500">{user.email}</p>
            {isAdmin && (
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] uppercase">
                {t('profile.adminPlatformBadge')}
              </span>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2 text-left">
              <button
                onClick={() => onNavigate('orders')}
                className="w-full p-3 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="size-4 text-orange-600" />
                  <span>{t('profile.myOrders')}</span>
                </div>
                <ChevronRight className="size-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('wishlist')}
                className="w-full p-3 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="size-4 text-rose-500" />
                  <span>{t('profile.savedWishlist')}</span>
                </div>
                <ChevronRight className="size-4 text-slate-400" />
              </button>

              {isAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="w-full p-3 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="size-4 text-blue-600" />
                    <span>{t('profile.adminControlPortal')}</span>
                  </div>
                  <ChevronRight className="size-4 text-blue-400" />
                </button>
              )}

              <button
                onClick={logout}
                className="w-full p-3 rounded-xl hover:bg-rose-50 text-xs font-bold text-rose-600 flex items-center justify-between transition-colors mt-2 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="size-4" />
                  <span>{t('profile.signOut')}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Info & Address Book (Cols 5-12) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Personal Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{t('profile.personalInfo')}</h3>
                <p className="text-xs text-slate-500">{t('profile.accountType')}: {tRole(user.role)}</p>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                {isEditing ? t('profile.cancel') : t('profile.edit')}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">{t('profile.fullName')}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">{t('profile.phone')}</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-fit px-5 py-2 bg-[#E84A27] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {t('profile.saveChanges')}
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">{t('profile.fullName')}</span>
                  <span className="font-bold text-slate-900">{user.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{t('profile.email')}</span>
                  <span className="font-bold text-slate-900">{user.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{t('profile.phone')}</span>
                  <span className="font-bold text-slate-900">{user.phone || '—'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Address Book */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{t('profile.addressBook')}</h3>
                <p className="text-xs text-slate-500">{t('checkout.shippingGuarantee')}</p>
              </div>
              <button
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="size-3.5" />
                {t('profile.addNewAddress')}
              </button>
            </div>

            {/* Add Address Form */}
            {showAddressForm && (
              <form onSubmit={handleAddAddressSubmit} className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-900">{t('profile.newAddressTitle')}</h4>
                <div>
                  <label className="text-xs text-slate-600 block mb-1">{t('profile.streetAddress')}</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="House/Flat number, Street name"
                    className="w-full px-3 py-2 bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">{t('profile.city')}</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">{t('profile.state')}</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">{t('profile.pincode')}</label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">{t('profile.country')}</label>
                    <input
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {t('profile.saveAddress')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {t('profile.cancel')}
                  </button>
                </div>
              </form>
            )}

            {/* Saved Addresses List */}
            {(user.addresses || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">{t('profile.noAddresses')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(user.addresses || []).map((addr: Address) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between ${
                      addr.isDefault
                        ? 'border-orange-500 bg-orange-50/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-orange-600" />
                          {t('checkout.step1')}
                        </span>
                        {addr.isDefault && (
                          <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                            {t('profile.defaultBadge')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700">{addr.street}</p>
                      <p className="text-xs text-slate-700">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      <p className="text-xs text-slate-500">{addr.country}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      {!addr.isDefault && (
                        <button
                          onClick={() => setDefaultAddress(addr.id)}
                          className="text-orange-600 hover:text-orange-700 font-semibold cursor-pointer"
                        >
                          {t('profile.setAsDefault')}
                        </button>
                      )}
                      <button
                        onClick={() => deleteAddress(addr.id)}
                        className="text-slate-400 hover:text-rose-600 ml-auto cursor-pointer"
                        title={t('profile.delete')}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
