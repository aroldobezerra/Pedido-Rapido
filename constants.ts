
import { Category, Product } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Classic Cheeseburger',
    price: 12.00,
    category: Category.BURGERS,
    description: 'Juicy flame-grilled beef patty, melted cheddar, crisp lettuce, tomato, and our signature sauce.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    extras: [
      { id: 'e1', name: 'Extra Cheese', price: 1.50 },
      { id: 'e2', name: 'Crispy Bacon', price: 2.00 }
    ],
    isAvailable: true,
    trackInventory: true
  },
  {
    id: '2',
    name: 'BBQ Bacon King',
    price: 14.50,
    category: Category.BURGERS,
    description: 'Double beef patty, crispy smoked bacon, honey BBQ glaze, and crunchy golden onion rings.',
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=800',
    extras: [],
    isAvailable: true,
    trackInventory: true
  },
  {
    id: '3',
    name: 'Truffle Fries',
    price: 5.00,
    category: Category.SIDES,
    description: 'Golden crispy french fries with truffle oil and parmesan.',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800',
    extras: [],
    isAvailable: true,
    trackInventory: false
  },
  {
    id: '4',
    name: 'Classic Milkshake',
    price: 6.50,
    category: Category.DRINKS,
    description: 'Creamy vanilla, chocolate or strawberry milkshake.',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=800',
    extras: [],
    isAvailable: true,
    trackInventory: true
  }
];
