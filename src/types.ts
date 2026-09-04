"use client";

export enum OrderStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentMethod {
  CASH  = 'Dinheiro',
  CREDIT  = 'Crédito',
  DEBIT   = 'Débito',
  PIX     = 'PIX',
  MIXED   = 'Misto',
  FIADO   = 'Fiado'
}

export interface Payment {
  method: PaymentMethod;
  amount: number;
}

export enum OrderType {
  DINE_IN  = 'Comer Aqui',
  TAKEAWAY = 'Para Viagem'
}

export type UserRole = 'admin' | 'vendedor';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  updatedAt?: number;
}

export enum CashTransactionType {
  BLEED = 'Sangria',
  SUPPLY = 'Suprimento'
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  order?: number;
  syncStatus?: 'pending' | 'synced' | 'deleted';
  updatedAt?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  imageUrl?: string;
  order?: number;
  inStock?: boolean;
  stockQuantity?: number;
  addons?: Addon[];
  syncStatus?: 'pending' | 'synced' | 'deleted';
  updatedAt?: number;
}

export interface Filling {
  id: string;
  name: string;
  price?: number;
  inStock: boolean;
  stockQuantity?: number;
  syncStatus?: 'pending' | 'synced' | 'deleted';

  updatedAt?: number;
}

export interface MenuItemFilling {
  id?: string;
  menuItemId: string;
  fillingId: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  order: number;
  syncStatus?: 'pending' | 'synced' | 'deleted';
  updatedAt?: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  orderType?: OrderType;
  notes?: string;
  extra?: number;
  discount?: number;
  addons?: Addon[];
  fillingId?: string;
}


export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: number;
  closedAt?: number;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentAmountReceived?: number;
  change?: number;
  payments?: Payment[];          // Pagamento dividido em múltiplas formas
  orderType?: OrderType;
  createdBy?: string;   // UUID do vendedor que abriu a comanda
  sellerName?: string;  // Nome do vendedor (desnormalizado para exibição)
  customerId?: string;  // ID do mensalista vinculado (se houver fiado)
  stockDecremented?: boolean;
  fiadoAccounted?: boolean;
  syncStatus?: 'pending' | 'synced' | 'deleted';
  updatedAt?: number;
}

export interface CashTransaction {
  id: string;
  type: CashTransactionType;
  amount: number;
  reason: string;
  timestamp: number;
}

export interface CashBreakdown {
  bills_200: number;
  bills_100: number;
  bills_50: number;
  bills_20: number;
  bills_10: number;
  bills_5: number;
  bills_2: number;
  coins_1: number;
  coins_050: number;
  coins_025: number;
  coins_010: number;
  coins_005: number;
}

export interface CashRegisterSession {
  id: string;
  openedAt: number;
  closedAt?: number;
  openingBalance: number;
  closingBalance?: number;
  calculatedBalance?: number;
  pixSales?: number;
  debitSales?: number;
  creditSales?: number;
  openingBreakdown?: CashBreakdown;
  closingBreakdown?: CashBreakdown;
  status: 'OPEN' | 'CLOSED';
  transactions: CashTransaction[];
  syncStatus?: 'pending' | 'synced' | 'deleted';
  updatedAt?: number;
}

export interface CustomerPaymentRecord {
  id: string;
  date: number;
  amount: number;
  method: PaymentMethod;
  notes?: string;
}

export interface CustomerFiadoOrder {
  orderId: string;
  orderNumber?: string;
  customerName: string;
  createdAt: number;
  closedAt?: number;
  total: number;
  fiadoAmount: number;
  paymentMethod?: PaymentMethod;
  payments?: Payment[];
  items: OrderItem[];
  sellerName?: string;
  orderType?: OrderType;
  notes?: string;
}

export interface MonthlyCustomer {
  id: string;
  name: string;
  phone?: string;
  company?: string;
  notes?: string;
  creditLimit?: number;
  balance: number;
  payments?: CustomerPaymentRecord[];
  fiadoOrders?: CustomerFiadoOrder[];
  createdAt?: number;
  syncStatus?: 'pending' | 'synced' | 'deleted';
  updatedAt?: number;
}

export const DEFAULT_CATEGORIES = ['PASTEIS SALGADOS', 'pastel grande', 'SALGADOS', 'PASTEIS DOCE', 'doces', 'BEBIDAS', 'ACRÉSCIMO'];