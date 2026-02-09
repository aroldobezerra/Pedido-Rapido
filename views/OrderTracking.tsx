
import React from 'react';
import { Order } from '../types';

interface OrderTrackingProps {
  order: Order;
  onBack: () => void;
}

const OrderTracking: React.FC<OrderTrackingProps> = ({ order, onBack }) => {
  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen">
      <header className="sticky top-0 z-10 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-200 dark:border-gray-800">
        <button onClick={onBack} className="text-primary cursor-pointer flex size-10 shrink-0 items-center justify-center">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <h2 className="text-gray-900 dark:text-white text-lg font-bold flex-1 text-center pr-10">Acompanhar Pedido</h2>
      </header>

      <main className="max-w-md mx-auto pb-24">
        <div className="px-4 py-6">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">Pedido #{order.id}</p>
          <h1 className="text-gray-900 dark:text-white text-2xl font-extrabold leading-tight">Prepare seu apetite!<br/>Seu lanche está a caminho.</h1>
        </div>

        <div className="px-4 mb-8">
          <div className="flex flex-col gap-2 rounded-2xl p-6 bg-primary/10 border border-primary/20 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">schedule</span>
              <p className="text-gray-800 dark:text-gray-200 text-sm font-bold uppercase">Previsão de Entrega</p>
            </div>
            <p className="text-primary tracking-tighter text-4xl font-black">{order.estimatedArrival}</p>
          </div>
        </div>

        <div className="px-4 mb-10">
          <h3 className="text-gray-900 dark:text-white text-lg font-bold mb-6 flex items-center gap-2">
            <span className="size-2 bg-primary rounded-full"></span>
            Status do Pedido
          </h3>
          <div className="grid grid-cols-[48px_1fr] gap-x-2">
            {/* Step 1: Completed */}
            <div className="flex flex-col items-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-green-500 text-white shadow-lg">
                <span className="material-symbols-outlined text-[20px]">check</span>
              </div>
              <div className="w-[2.5px] bg-green-500 h-10"></div>
            </div>
            <div className="flex flex-col pb-6 pt-1">
              <p className="text-gray-900 dark:text-white text-base font-bold">Pedido Recebido</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">{order.timestamp}</p>
            </div>

            {/* Step 2: Active */}
            <div className="flex flex-col items-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary text-white ring-8 ring-primary/20 shadow-lg animate-pulse">
                <span className="material-symbols-outlined text-[20px] FILL-1">cooking</span>
              </div>
              <div className="w-[2.5px] bg-gray-200 dark:bg-gray-700 h-10"></div>
            </div>
            <div className="flex flex-col pb-6 pt-1">
              <p className="text-gray-900 dark:text-white text-base font-bold">Em Preparação</p>
              <p className="text-primary text-xs font-black uppercase tracking-widest">A cozinha está a todo vapor</p>
            </div>

            {/* Step 3: Pending */}
            <div className="flex flex-col items-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                <span className="material-symbols-outlined text-[20px]">delivery_dining</span>
              </div>
              <div className="w-[2.5px] bg-gray-200 dark:bg-gray-700 h-10"></div>
            </div>
            <div className="flex flex-col pb-6 pt-1">
              <p className="text-gray-400 dark:text-gray-600 text-base font-bold">Saiu para Entrega</p>
            </div>

            {/* Step 4: Pending */}
            <div className="flex flex-col items-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                <span className="material-symbols-outlined text-[20px]">restaurant</span>
              </div>
            </div>
            <div className="flex flex-col pt-1">
              <p className="text-gray-400 dark:text-gray-600 text-base font-bold">Entregue</p>
            </div>
          </div>
        </div>

        <div className="px-4 mb-6">
          <div className="relative w-full h-44 bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden shadow-inner border border-gray-200 dark:border-white/5">
            <img 
              className="w-full h-full object-cover opacity-60 grayscale-[0.5]" 
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800" 
              alt="Mapa" 
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-full shadow-2xl border-2 border-primary animate-bounce">
                <span className="material-symbols-outlined text-primary text-3xl">restaurant</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 flex justify-center max-w-md mx-auto z-50">
        <button className="w-full bg-[#25D366] text-white flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all shadow-xl active:scale-95">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"></path>
          </svg>
          Precisa de ajuda? Chamar no WhatsApp
        </button>
      </div>
    </div>
  );
};

export default OrderTracking;
