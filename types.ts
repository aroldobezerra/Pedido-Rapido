
export enum Category {
  BURGERS = 'Hambúrgueres',
  HOTDOGS = 'Cachorro Quente',
  SIDES = 'Acompanhamentos',
  DRINKS = 'Bebidas',
  DESSERTS = 'Sobremesas',
  COMBOS = 'Combos'
}

export interface Extra {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
  extras: Extra[];
  isAvailable: boolean;
  trackInventory: boolean;
}

export interface Store {
  id: string;
  slug: string;
  name: string;
  whatsapp: string;
  adminPassword: string;
  customDomain?: string;
  categories?: string[];
  products: Product[];
  orders: Order[];
  createdAt: number;
  isOpen: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedExtras: string[];
  notes?: string;
}

export type OrderStatus = 'Received' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';

export interface Order {
  id: string;
  store_id: string;
  items: CartItem[];
  status: OrderStatus;
  estimatedArrival: string;
  timestamp: string;
  address?: string;
  tableNumber?: string;
  pickupTime?: string;
  deliveryMethod: 'Delivery' | 'Pickup' | 'DineIn';
  customerName: string;
  notes?: string;
  total: number;
}

export type AppView = 'HOME' | 'REGISTER' | 'MENU' | 'CART' | 'REVIEW' | 'TRACK' | 'ADMIN' | 'PRODUCT_FORM' | 'ADMIN_LOGIN' | 'SAAS_ADMIN' | 'SAAS_LOGIN';

/**
 * Utilitário global para garantir que o slug da URL seja sempre compatível
 * com o que está gravado no banco de dados.
 */
export const sanitizeSlug = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, '-')           // Espaços viram hífens
    .replace(/[^a-z0-9-]/g, '')     // Remove caracteres especiais
    .replace(/-+/g, '-')            // Remove hífens duplicados
    .trim()
    .replace(/^-+|-+$/g, '');       // Remove hífens no início/fim
};
