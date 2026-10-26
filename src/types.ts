export type ProductCategory =
  | 'Electronics'
  | 'Fashion'
  | 'Beauty'
  | 'Home & Kitchen'
  | 'Grocery'
  | 'Sports'
  | 'Books'
  | 'Accessories';

export interface ProductReview {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  price: number;
  originalPrice: number;
  discount: number; // percentage, e.g. 20 for 20%
  rating: number;
  reviewCount: number;
  stock: number;
  images: string[];
  colors?: string[];
  sizes?: string[];
  specifications: Record<string, string>;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isDealOfDay?: boolean;
  isArchived?: boolean;
  createdAt?: string;
}

export interface CartItem {
  id?: string;
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface SavedItem {
  id?: string;
  product: Product;
  savedAt: string;
  selectedColor?: string;
  selectedSize?: string;
}

export type PaymentMethod =
  | 'Credit/Debit Card'
  | 'Credit / Debit Card'
  | 'UPI'
  | 'UPI / QR'
  | 'Cash on Delivery'
  | 'Wallet'
  | 'Net Banking'
  | 'card'
  | 'upi'
  | 'cod'
  | 'netbanking';

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault?: boolean;
  type?: 'Home' | 'Work' | 'Other';
}

export type OrderStatus =
  | 'Order Placed'
  | 'Confirmed'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  selectedColor?: string;
  selectedSize?: string;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  couponCode?: string;
  shippingAddress: Address;
  deliveryMethod: 'Standard' | 'Express';
  paymentMethod: string;
  paymentStatus: 'Paid' | 'Pending';
  transactionId?: string;
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note: string;
  }[];
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin' | 'superadmin';
  storeName?: string;
  sellerStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  avatar?: string;
  addresses: Address[];
  createdAt: string;
}

export interface SellerApplication {
  id: string;
  userId?: string | null;
  user?: { id: string; email: string; name: string } | null;
  storeName: string;
  legalName: string;
  email: string;
  phone: string;
  businessAddress: string;
  category: string;
  taxId?: string | null;
  description?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
}

export interface Coupon {
  code: string;
  description: string;
  discountPercentage?: number;
  discountPercent?: number;
  discountAmount?: number;
  minSpend: number;
  maxDiscount?: number;
  freeShipping?: boolean;
}

export interface FilterState {
  category: string;
  brand: string[];
  priceRange: [number, number];
  minRating: number;
  discountMin: number;
  inStockOnly: boolean;
  searchQuery: string;
  sortBy: 'popularity' | 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'discount';
}
