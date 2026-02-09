
import React from 'react';
import { CartItem } from '../types';

interface OrderReviewProps {
  items: CartItem[];
  customerName: string;
  address: string;
  method: 'Delivery' | 'Pickup' | 'DineIn';
  tableNumber?: string;
  pickupTime?: string;
  orderNotes?: string;
  onBack: () => void;
  onConfirm: (message: string) => void;
  subtotal: number;
}

const OrderReview: React.FC<OrderReviewProps> = ({ 
  items, customerName, address, method, tableNumber, pickupTime, orderNotes, onBack, onConfirm, subtotal 
}) => {
  const deliveryFee = method === 'Delivery' ? 5.00 : 0;
  const total = subtotal + deliveryFee;

  const generateWAMessage = () => {
    let msg = `🍔 *NOVO PEDIDO - SnackDash AI*\n\n`;
    msg += `👤 *Cliente:* ${customerName}\n`;
    
    if (method === 'DineIn') msg += `📍 *Mesa:* ${tableNumber}\n`;
    else if (method === 'Pickup') msg += `📍 *Retirada:* Às ${pickupTime}\n`;
    else msg += `📍 *Entrega:* ${address}\n`;
    
    msg += `\n*ÍTENS DO PEDIDO:*\n`;
    items.forEach(item => {
      msg += `• ${item.quantity}x ${item.product.name} (R$ ${(item.product.price * item.quantity).toFixed(2)})\n`;
    });

    if (orderNotes) msg += `\n📝 *Observação:* ${orderNotes}\n`;
    
    msg += `\n💰 *Total:* R$ ${total.toFixed(2)}\n\n`;
    msg += `_Sistema SnackDash AI_`;
    return msg;
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-background-light dark:bg-background-dark">
      <header className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-white/10">
        <button onClick={onBack} className="size-10 flex items-center justify-center"><span className="material-symbols-outlined">arrow_back</span></button>
        <h1 className="flex-1 text-center font-bold">Resumo do Pedido</h1>
      </header>

      <main className="flex-1 px-6 py-6 space-y-6">
        <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm">
           <div className="flex items-center gap-2 mb-4">
              <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
              <h3 className="text-xs font-black uppercase text-primary tracking-widest">Visualização do WhatsApp</h3>
           </div>
           <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed opacity-80 font-mono bg-gray-50 dark:bg-black/20 p-4 rounded-xl">
              {generateWAMessage()}
           </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => onConfirm(generateWAMessage())}
            className="w-full bg-[#25D366] text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">send</span>
            CONFIRMAR PEDIDO
          </button>
          <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest px-4">Ao confirmar, você será redirecionado para o WhatsApp da lanchonete.</p>
        </div>
      </main>
    </div>
  );
};

export default OrderReview;
