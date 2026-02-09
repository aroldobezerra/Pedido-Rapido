
import React, { useState, useMemo } from 'react';
import { Product, Order, OrderStatus } from '../types';

interface AdminDashboardProps {
  whatsappNumber: string;
  isOpen: boolean;
  orders: Order[];
  onToggleStoreStatus: () => void;
  onUpdateWhatsApp: (w: string) => void;
  onUpdateOrderStatus: (id: string, status: OrderStatus) => void;
  products: Product[];
  onAddProduct: () => void;
  onEditProduct: (p: Product) => void;
  onToggleAvailability: (id: string) => void;
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  whatsappNumber, isOpen, orders, onToggleStoreStatus, onUpdateWhatsApp, onUpdateOrderStatus,
  products, onAddProduct, onEditProduct, onToggleAvailability, onBack 
}) => {
  const [activeTab, setActiveTab] = useState<'KITCHEN' | 'PRODUCTS' | 'STATS'>('KITCHEN');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => {
    const totalVendas = orders.reduce((acc, o) => o.status !== 'Cancelled' ? acc + o.total : acc, 0);
    const totalPedidos = orders.length;
    const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;
    
    // Contagem por categoria de produto nos pedidos
    const productCounts: Record<string, number> = {};
    orders.forEach(o => o.items.forEach(i => {
      productCounts[i.product.name] = (productCounts[i.product.name] || 0) + i.quantity;
    }));
    
    const bestSellers = Object.entries(productCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    return { totalVendas, totalPedidos, ticketMedio, bestSellers };
  }, [orders]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const activeOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-30 bg-white dark:bg-background-dark border-b border-gray-100 dark:border-white/10 px-4 py-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2"><span className="material-symbols-outlined">arrow_back</span></button>
        <h2 className="text-sm font-black uppercase tracking-widest">Gestão SnackDash</h2>
        <div className="size-8"></div>
      </header>

      {/* Main Tabs */}
      <nav className="flex bg-white dark:bg-background-dark px-4 py-2 gap-2 border-b border-gray-100 dark:border-white/10 sticky top-[60px] z-30">
        {(['KITCHEN', 'PRODUCTS', 'STATS'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-white' : 'text-gray-400 bg-gray-50 dark:bg-white/5'}`}
          >
            {tab === 'KITCHEN' ? 'Cozinha' : tab === 'PRODUCTS' ? 'Cardápio' : 'Relatórios'}
          </button>
        ))}
      </nav>

      <main className="p-4 flex-1 pb-24 max-w-lg mx-auto w-full">
        {activeTab === 'KITCHEN' && (
          <div className="space-y-6">
             <div className="flex justify-between items-end px-1">
                <h3 className="text-xl font-black">Pedidos Ativos</h3>
                <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-1 rounded-full">{activeOrders.length} em preparo</span>
             </div>
             
             {activeOrders.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 opacity-30">
                  <span className="material-symbols-outlined text-6xl mb-2">restaurant_menu</span>
                  <p className="font-bold">Nenhum pedido ativo</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {activeOrders.map(order => (
                   <div key={order.id} className="bg-white dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                         <div>
                            <p className="text-[10px] font-black uppercase text-gray-400">#{order.id} • {order.timestamp}</p>
                            <h4 className="font-black text-lg">{order.customerName}</h4>
                            <p className="text-xs font-bold text-primary">
                              {order.deliveryMethod === 'DineIn' ? `📍 Mesa ${order.tableNumber}` : 
                               order.deliveryMethod === 'Pickup' ? `🕒 Retirada ${order.pickupTime}` : `🏠 Entrega`}
                            </p>
                         </div>
                         <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                           order.status === 'Received' ? 'bg-yellow-500/10 text-yellow-600' :
                           order.status === 'Preparing' ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'
                         }`}>
                           {order.status === 'Received' ? 'Aguardando' : order.status === 'Preparing' ? 'Preparando' : 'Pronto'}
                         </div>
                      </div>
                      
                      <div className="space-y-2 border-t border-gray-100 dark:border-white/5 pt-3">
                         {order.items.map((item, idx) => (
                           <div key={idx} className="flex justify-between text-sm">
                             <span className="font-bold">{item.quantity}x {item.product.name}</span>
                             {item.notes && <span className="text-[10px] italic text-red-500">[{item.notes}]</span>}
                           </div>
                         ))}
                         {order.notes && <p className="text-[10px] bg-gray-50 dark:bg-black/20 p-2 rounded-lg italic">Obs: {order.notes}</p>}
                      </div>

                      <div className="flex gap-2 pt-2">
                        {order.status === 'Received' && (
                          <button onClick={() => onUpdateOrderStatus(order.id, 'Preparing')} className="flex-1 bg-blue-500 text-white text-xs font-black py-3 rounded-xl">Iniciar Preparo</button>
                        )}
                        {order.status === 'Preparing' && (
                          <button onClick={() => onUpdateOrderStatus(order.id, 'Ready')} className="flex-1 bg-green-500 text-white text-xs font-black py-3 rounded-xl">Marcar como Pronto</button>
                        )}
                        {order.status === 'Ready' && (
                          <button onClick={() => onUpdateOrderStatus(order.id, 'Delivered')} className="flex-1 bg-primary text-white text-xs font-black py-3 rounded-xl">Finalizar Pedido</button>
                        )}
                        <button onClick={() => onUpdateOrderStatus(order.id, 'Cancelled')} className="p-3 bg-red-100 text-red-600 rounded-xl"><span className="material-symbols-outlined text-sm">close</span></button>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {activeTab === 'PRODUCTS' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-3xl border transition-all ${isOpen ? 'bg-green-50 border-green-100 dark:bg-green-500/5' : 'bg-red-50 border-red-100 dark:bg-red-500/5'}`}>
               <div className="flex items-center justify-between">
                  <p className="text-xl font-black">Lanchonete {isOpen ? 'Aberta' : 'Fechada'}</p>
                  <button onClick={onToggleStoreStatus} className={`w-14 h-8 rounded-full border-4 transition-colors ${isOpen ? 'bg-green-500 border-transparent' : 'bg-red-500 border-transparent'}`}>
                    <div className={`size-6 bg-white rounded-full transition-transform ${isOpen ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
               </div>
            </div>

            <button onClick={onAddProduct} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">add_circle</span> NOVO PRODUTO
            </button>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Seu Cardápio</h4>
              {products.map(p => (
                <div key={p.id} className="bg-white dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/10 flex items-center gap-4">
                  <div className="size-14 bg-cover bg-center rounded-xl" style={{ backgroundImage: `url('${p.image}')` }}></div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{p.name}</p>
                    <p className="text-primary font-bold text-xs">R$ {p.price.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onToggleAvailability(p.id)} className={`p-2 rounded-lg ${p.isAvailable ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      <span className="material-symbols-outlined text-sm">{p.isAvailable ? 'visibility' : 'visibility_off'}</span>
                    </button>
                    <button onClick={() => onEditProduct(p)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg"><span className="material-symbols-outlined text-sm">edit</span></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'STATS' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black">Performance Financeira</h3>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/10">
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Total Vendas</p>
                  <p className="text-2xl font-black text-primary">R$ {stats.totalVendas.toFixed(2)}</p>
               </div>
               <div className="bg-white dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/10">
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Pedidos Totais</p>
                  <p className="text-2xl font-black">{stats.totalPedidos}</p>
               </div>
            </div>

            <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/10">
               <h4 className="text-xs font-black uppercase text-[#9c7349] mb-4">Mais Vendidos</h4>
               <div className="space-y-4">
                  {stats.bestSellers.map(([name, count], i) => (
                    <div key={i} className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          <span className="size-6 bg-primary/10 text-primary flex items-center justify-center rounded-lg text-xs font-black">{i+1}º</span>
                          <span className="font-bold text-sm">{name}</span>
                       </div>
                       <span className="text-xs font-black bg-gray-50 dark:bg-white/5 px-3 py-1 rounded-full">{count}x</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/10">
               <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Ticket Médio por Pedido</p>
               <p className="text-xl font-black">R$ {stats.ticketMedio.toFixed(2)}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
