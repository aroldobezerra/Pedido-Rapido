
import React, { useState } from 'react';
import { CartItem, Order } from '../types';

interface CartViewProps {
  items: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  onBack: () => void;
  onProceed: (meta: Partial<Order>) => void;
  subtotal: number;
}

const CartView: React.FC<CartViewProps> = ({ 
  items, 
  updateQuantity, 
  clearCart, 
  onBack, 
  onProceed, 
  subtotal 
}) => {
  const [method, setMethod] = useState<'Delivery' | 'Pickup' | 'DineIn'>('Delivery');
  const [address, setAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  
  const deliveryFee = method === 'Delivery' ? 5.00 : 0;
  const total = subtotal + deliveryFee;

  const isFormValid = () => {
    if (!customerName) return false;
    if (method === 'Delivery' && !address) return false;
    if (method === 'DineIn' && !tableNumber) return false;
    if (method === 'Pickup' && !pickupTime) return false;
    return true;
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-gray-200 dark:border-white/10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">Carrinho</h1>
        <button onClick={clearCart} className="text-primary text-sm font-bold">Limpar</button>
      </header>

      <main className="flex-1 pb-40 px-4 py-6 space-y-6">
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.product.id} className="flex items-center gap-4 bg-white dark:bg-white/5 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
              <div className="bg-center bg-cover rounded-xl size-16 shrink-0" style={{ backgroundImage: `url("${item.product.image}")` }}></div>
              <div className="flex-1">
                <p className="font-bold text-sm">{item.product.name}</p>
                <p className="text-primary text-xs font-bold">R$ {item.product.price.toFixed(2)}</p>
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/10 rounded-full px-3 py-1 w-fit mt-1">
                  <button onClick={() => updateQuantity(item.product.id, -1)} className="text-primary font-bold">-</button>
                  <span className="text-xs font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, 1)} className="text-primary font-bold">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="space-y-6 bg-white dark:bg-white/5 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-white/10">
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-[#9c7349]">Seu Nome</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 border-none rounded-2xl" placeholder="Nome para o pedido" />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold uppercase text-[#9c7349]">Como prefere?</label>
                <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-white/10 p-1 rounded-2xl">
                  {(['Delivery', 'Pickup', 'DineIn'] as const).map(m => (
                    <button key={m} onClick={() => setMethod(m)} className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${method === m ? 'bg-primary text-white shadow-lg' : 'text-gray-400'}`}>
                      {m === 'Delivery' ? 'Entrega' : m === 'Pickup' ? 'Viagem' : 'Mesa'}
                    </button>
                  ))}
                </div>
              </div>

              {method === 'Delivery' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-[#9c7349]">Endereço</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 border-none rounded-2xl" placeholder="Rua, número, complemento..." />
                </div>
              )}

              {method === 'DineIn' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-[#9c7349]">Número da Mesa</label>
                  <input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 border-none rounded-2xl text-center text-xl font-bold" placeholder="00" />
                </div>
              )}

              {method === 'Pickup' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-[#9c7349]">Horário de Retirada</label>
                  <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 border-none rounded-2xl" />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-[#9c7349]">Observações Gerais</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 border-none rounded-2xl resize-none" placeholder="Sem cebola, bem passado..." rows={2} />
              </div>
            </div>
          </div>
        )}
      </main>

      {items.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-background-dark/95 border-t border-gray-200 dark:border-white/10 px-6 py-6 space-y-4 z-30">
          <div className="flex justify-between items-center px-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Subtotal R$ {subtotal.toFixed(2)}</span>
              {method === 'Delivery' && <span className="text-[10px] font-bold text-primary uppercase">Taxa Entrega R$ {deliveryFee.toFixed(2)}</span>}
            </div>
            <span className="text-2xl font-black text-primary">R$ {total.toFixed(2)}</span>
          </div>
          <button 
            disabled={!isFormValid()}
            onClick={() => onProceed({ customerName, address, deliveryMethod: method, tableNumber, pickupTime, notes })}
            className="w-full bg-[#25D366] disabled:opacity-50 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">send</span>
            REVISAR E ENVIAR
          </button>
        </footer>
      )}
    </div>
  );
};

export default CartView;
