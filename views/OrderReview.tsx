
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
    let msg = `🍔 *NOVO PEDIDO - Pedido Rápido AI*\n\n`;
    msg += `👤 *Cliente:* ${customerName}\n`;
    
    if (method === 'DineIn') msg += `📍 *Local:* Na Mesa ${tableNumber}\n`;
    else if (method === 'Pickup') msg += `📍 *Retirada:* No Balcão às ${pickupTime}\n`;
    else msg += `📍 *Entrega:* ${address}\n`;
    
    msg += `\n*ÍTEMS DO PEDIDO:*\n`;
    items.forEach(item => {
      msg += `• ${item.quantity}x ${item.product.name} (R$ ${(item.product.price * item.quantity).toFixed(2)})\n`;
      if (item.notes) msg += `  _Obs: ${item.notes}_\n`;
    });

    if (orderNotes) msg += `\n📝 *Observações Gerais:* ${orderNotes}\n`;
    
    msg += `\n💰 *Total:* R$ ${total.toFixed(2)}\n\n`;
    msg += `_Enviado via App Pedido Rápido AI_`;
    return msg;
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-background-light dark:bg-background-dark">
      <header className="flex items-center px-4 py-4 border-b border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-sm sticky top-0 z-50">
        <button onClick={onBack} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-90 transition-all"><span className="material-symbols-outlined">arrow_back</span></button>
        <h1 className="flex-1 text-center font-black tracking-tight">Revisar Pedido</h1>
        <div className="size-10"></div>
      </header>

      <main className="flex-1 px-6 py-8 space-y-8">
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <div className="size-10 bg-[#25D366]/10 rounded-full flex items-center justify-center">
                 <span className="material-symbols-outlined text-[#25D366]">chat</span>
              </div>
              <div>
                 <h3 className="font-black text-lg leading-tight">Quase lá!</h3>
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Veja como o pedido chegará no WhatsApp</p>
              </div>
           </div>

           <div className="bg-white dark:bg-[#2d2218] p-6 rounded-[2.5rem] border border-[#e8dbce] dark:border-[#3d2b1d] shadow-2xl shadow-black/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#25D366]/5 rounded-full -mr-16 -mt-16"></div>
              <div className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed opacity-90 font-mono bg-gray-50 dark:bg-black/30 p-5 rounded-2xl border border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300">
                 {generateWAMessage()}
              </div>
           </div>
        </div>

        <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20 space-y-3">
           <div className="flex justify-between items-center text-sm font-bold opacity-60">
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
           </div>
           {method === 'Delivery' && (
             <div className="flex justify-between items-center text-sm font-bold text-primary">
                <span>Taxa de Entrega</span>
                <span>R$ {deliveryFee.toFixed(2)}</span>
             </div>
           )}
           <div className="flex justify-between items-center text-2xl font-black pt-2 border-t border-primary/10">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
           </div>
        </div>
      </main>

      <footer className="p-6 pb-10 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95">
        <button 
          onClick={() => onConfirm(generateWAMessage())}
          className="w-full bg-[#25D366] text-white font-black py-6 rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-[#25D366]/30 active:scale-95 transition-all text-lg"
        >
          <span className="material-symbols-outlined">send</span>
          ENVIAR PARA WHATSAPP
        </button>
        <p className="mt-4 text-[10px] text-center text-gray-400 font-black uppercase tracking-widest leading-relaxed">
           AO CLICAR, ABRIREMOS SEU WHATSAPP COM A MENSAGEM ACIMA PRONTA PARA ENVIAR.
        </p>
      </footer>
    </div>
  );
};

export default OrderReview;
