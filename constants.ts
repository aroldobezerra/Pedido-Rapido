
import { Category, Product } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Cheeseburger Artesanal',
    price: 32.00,
    category: Category.BURGERS,
    description: 'Blend de 180g de carne bovina, queijo cheddar derretido, cebola caramelizada e maionese da casa no pão brioche.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    extras: [
      { id: 'e1', name: 'Queijo Extra', price: 4.50 },
      { id: 'e2', name: 'Bacon Crocante', price: 6.00 }
    ],
    isAvailable: true,
    trackInventory: true
  },
  {
    id: '2',
    name: 'Double Bacon Monster',
    price: 45.50,
    category: Category.BURGERS,
    description: 'Dois hambúrgueres de 180g, muito bacon, queijo dobro e molho especial BBQ.',
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=800',
    extras: [],
    isAvailable: true,
    trackInventory: true
  },
  {
    id: '3',
    name: 'Batata Rústica com Alecrim',
    price: 18.00,
    category: Category.SIDES,
    description: 'Batatas rústicas fritas na hora com sal grosso e alecrim fresco.',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800',
    extras: [],
    isAvailable: true,
    trackInventory: false
  },
  {
    id: '4',
    name: 'Milkshake de Nutella',
    price: 24.50,
    category: Category.DRINKS,
    description: 'Gelado e cremoso milkshake feito com sorvete de baunilha e Nutella original.',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=800',
    extras: [],
    isAvailable: true,
    trackInventory: true
  }
];
