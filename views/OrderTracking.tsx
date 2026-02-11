
import React from 'react';
import { Order, OrderStatus } from '../types';

interface OrderTrackingProps {
  order: Order;
  onBack: () => void;
}

const OrderTracking: React.FC<OrderTrackingProps> = ({ order, onBack }) => {
  const getStatusStep = (status: OrderStatus) => {
    switch (status) {
      case 'Received': return 1;
      case 'Preparing': return 2;
      case 'Ready': return 3;
      case 'Delivered': return 4;
      default: return 1;
    }
  };

  const currentStep = getStatusStep(order.status);

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen">
      <header className="sticky top-0 z-10 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-200 dark:border-gray-800">
        <button onClick={onBack} className="text-primary cursor-pointer flex size-10 items-center justify-center">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-10">Acompanhar Pedido</h2>
      </header>

      <main className="max-w-md mx-auto pb-24">
        <div className="px-6 py-8">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Pedido #{order.id.slice(-6)}</p>
          <h1 className="text-3xl font-black leading-tight">
            {order.status === 'Received' && 'Aguardando confirmação...'}
            {order.status === 'Preparing' && 'Sua comida está sendo preparada!'}
            {order.status === 'Ready' && 'Seu pedido está pronto para sair!'}
            {order.status === 'Delivered' && 'Pedido entregue. Bom apetite!'}
          </h1>
        </div>

        <div className="px-6 space-y-8 relative">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`size-10 rounded-full flex items-center justify-center border-2 transition-all ${currentStep >= 1 ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-gray-300'}`}>
                <span className="material-symbols-outlined text-xl">check_circle</span>
              </div>
              <div className={`w-0.5 h-12 ${currentStep > 1 ? 'bg-green-500' : 'bg-gray-100'}`}></div>
            </div>
            <div className="pt-2">
              <p className={`font-black text-sm ${currentStep >= 1 ? 'text-gray-900 dark:text-white' : 'text-gray-300'}`}>Pedido Recebido</p>
              <p className="text-xs text-gray-400">{order.timestamp}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`size-10 rounded-full flex items-center justify-center border-2 transition-all ${currentStep >= 2 ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 animate-pulse' : 'border-gray-200 text-gray-300'}`}>
                <span className="material-symbols-outlined text-xl">cooking</span>
              </div>
              <div className={`w-0.5 h-12 ${currentStep > 2 ? 'bg-green-500' : 'bg-gray-100'}`}></div>
            </div>
            <div className="pt-2">
              <p className={`font-black text-sm ${currentStep >= 2 ? 'text-gray-900 dark:text-white' : 'text-gray-300'}`}>Em Preparação</p>
              {currentStep === 2 && <p className="text-[10px] text-primary font-bold uppercase">Cozinha trabalhando...</p>}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`size-10 rounded-full flex items-center justify-center border-2 transition-all ${currentStep >= 3 ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-gray-300'}`}>
                <span className="material-symbols-outlined text-xl">restaurant</span>
              </div>
              <div className={`w-0.5 h-12 ${currentStep > 3 ? 'bg-green-500' : 'bg-gray-100'}`}></div>
            </div>
            <div className="pt-2">
              <p className={`font-black text-sm ${currentStep >= 3 ? 'text-gray-900 dark:text-white' : 'text-gray-300'}`}>Pronto / Saiu para Entrega</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`size-10 rounded-full flex items-center justify-center border-2 transition-all ${currentStep >= 4 ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-gray-300'}`}>
                <span className="material-symbols-outlined text-xl">home</span>
              </div>
            </div>
            <div className="pt-2">
              <p className={`font-black text-sm ${currentStep >= 4 ? 'text-gray-900 dark:text-white' : 'text-gray-300'}`}>Entregue</p>
            </div>
          </div>
        </div>

        <div className="px-6 mt-12">
          <div className="bg-primary/5 border border-primary/10 p-6 rounded-[2rem] text-center">
             <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Previsão</p>
             <p className="text-4xl font-black text-primary">20-30 min</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderTracking;
