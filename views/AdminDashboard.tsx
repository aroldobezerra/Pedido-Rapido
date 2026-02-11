
import React, { useState, useMemo } from 'react';
import { Product, Order, OrderStatus } from '../types';

interface AdminDashboardProps {
  slug: string;
  customDomain?: string;
  whatsappNumber: string;
  isOpen: boolean;
  orders: Order[];
  onToggleStoreStatus: () => void;
  onUpdateWhatsApp: (w: string) => void;
  onUpdateStoreSettings: (settings: any) => void;
  onUpdateOrderStatus: (id: string, status: OrderStatus) => void;
  products: Product[];
  categories: string[];
  onAddProduct: () => void;
  onEditProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onToggleAvailability: (id: string) => void;
  onBack: () => void;
  onUpdatePassword: (p: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  slug, whatsappNumber, isOpen, orders, onToggleStoreStatus, onUpdateStoreSettings, onUpdateOrderStatus,
  products, categories, onAddProduct, onEditProduct, onDeleteProduct, onBack
}) => {
  const [activeTab, setActiveTab] = useState<'KITCHEN' | 'PRODUCTS' | 'STATS' | 'SETTINGS'>('KITCHEN');
  const [copied, setCopied] = useState(false);
  
  const [newWA, setNewWA] = useState(whatsappNumber);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Estados locais para categorias
  const [editingCategoryIdx, setEditingCategoryIdx] = useState<number | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  // Categorias "temporárias" são aquelas criadas pelo usuário que ainda não têm produtos vinculados
  const [temporaryCategories, setTemporaryCategories] = useState<string[]>([]);

  const allAvailableCategories = useMemo(() => {
    return Array.from(new Set([...categories, ...temporaryCategories])).filter(Boolean);
  }, [categories, temporaryCategories]);

  const stats = useMemo(() => {
    const totalVendas = orders.reduce((acc, o) => o.status !== 'Cancelled' ? acc + o.total : acc, 0);
    const totalPedidos = orders.length;
    const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;
    
    const productCounts: Record<string, number> = {};
    orders.forEach(o => o.items.forEach(i => {
      productCounts[i.product.name] = (productCounts[i.product.name] || 0) + i.quantity;
    }));
    
    const bestSellers = Object.entries(productCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    return { totalVendas, totalPedidos, ticketMedio, bestSellers };
  }, [orders]);

  const activeOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const storeLink = `https://pedido-rapido.vercel.app/?s=${slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(storeLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = () => {
    const updates: any = {};
    if (newWA !== whatsappNumber) updates.whatsapp = newWA.replace(/\D/g, '');
    if (newPass) {
      if (newPass === confirmPass) {
        updates.adminPassword = newPass;
        setNewPass('');
        setConfirmPass('');
      } else {
        alert("As senhas não coincidem.");
        return;
      }
    }
    if (Object.keys(updates).length > 0) onUpdateStoreSettings(updates);
    else alert("Nenhuma alteração detectada.");
  };

  const handleAddCategory = () => {
    const name = categoryNameInput.trim();
    if (!name) return;
    if (allAvailableCategories.includes(name)) {
      alert("Essa categoria já existe.");
      return;
    }
    setTemporaryCategories(prev => [...prev, name]);
    setCategoryNameInput('');
    setIsAddingCategory(false);
    alert("Pronto! Categoria adicionada à lista. Agora você pode selecioná-la ao criar ou editar um produto.");
  };

  const handleRenameCategoryAction = (index: number) => {
    const oldName = allAvailableCategories[index];
    const newName = categoryNameInput.trim();
    if (!newName || newName === oldName) {
      setEditingCategoryIdx(null);
      return;
    }
    
    // Dispara renomeação em lote no Supabase
    onUpdateStoreSettings({ 
      _categoryMapping: { oldName, newName }
    });

    setEditingCategoryIdx(null);
    setCategoryNameInput('');
    // Remove da lista temporária pois ela agora será detectada nos produtos
    setTemporaryCategories(prev => prev.filter(c => c !== oldName));
  };

  const handleDeleteCategoryAction = (index: number) => {
    const catName = allAvailableCategories[index];
    const hasProducts = products.some(p => p.category === catName);
    
    if (hasProducts) {
      if (!confirm(`Existem produtos na categoria "${catName}". Se excluir, esses produtos ficarão como "Sem Categoria". Continuar?`)) return;
      onUpdateStoreSettings({ _categoryDelete: { catName } });
    } else {
      if (!confirm(`Deseja remover "${catName}" da lista?`)) return;
    }

    setTemporaryCategories(prev => prev.filter(c => c !== catName));
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'Received': return 'Recebido';
      case 'Preparing': return 'Na Cozinha';
      case 'Ready': return 'Pronto';
      case 'Delivered': return 'Entregue';
      case 'Cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-30 bg-white dark:bg-background-dark border-b border-gray-100 dark:border-white/10 px-4 py-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 flex items-center gap-1 text-primary">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-xs font-bold uppercase">Sair</span>
        </button>
        <h2 className="text-sm font-black uppercase tracking-widest">Painel de Gestão</h2>
        <div className="size-8"></div>
      </header>

      <nav className="flex bg-white dark:bg-background-dark px-4 py-2 gap-2 border-b border-gray-100 dark:border-white/10 sticky top-[60px] z-30 overflow-x-auto hide-scrollbar">
        {(['KITCHEN', 'PRODUCTS', 'STATS', 'SETTINGS'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[90px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 bg-gray-50 dark:bg-white/5'}`}
          >
            {tab === 'KITCHEN' ? 'Cozinha' : tab === 'PRODUCTS' ? 'Cardápio' : tab === 'STATS' ? 'Resumo' : 'Ajustes'}
          </button>
        ))}
      </nav>

      <main className="p-4 flex-1 pb-24 max-w-lg mx-auto w-full">
        {activeTab === 'KITCHEN' && (
          <div className="space-y-6">
             <div className="flex justify-between items-end px-1">
                <h3 className="text-xl font-black">Pedidos em Tempo Real</h3>
                <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-1 rounded-full">{activeOrders.length} ativos</span>
             </div>
             {activeOrders.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                  <span className="material-symbols-outlined text-6xl mb-2">restaurant_menu</span>
                  <p className="font-bold">Nenhum pedido pendente</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {activeOrders.map(order => (
                   <div key={order.id} className="bg-white dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                         <div>
                            <p className="text-[10px] font-black uppercase text-gray-400">#{order.id.slice(-6)} • {order.timestamp}</p>
                            <h4 className="font-black text-lg">{order.customerName}</h4>
                            <p className="text-xs text-primary font-bold">{order.deliveryMethod === 'Delivery' ? 'Para Entrega' : order.deliveryMethod === 'Pickup' ? 'Para Retirada' : `Mesa ${order.tableNumber}`}</p>
                         </div>
                         <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                           order.status === 'Received' ? 'bg-yellow-500/10 text-yellow-600' :
                           order.status === 'Preparing' ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'
                         }`}>
                           {translateStatus(order.status)}
                         </div>
                      </div>
                      <div className="space-y-2 border-t border-gray-100 dark:border-white/5 pt-3">
                         {order.items.map((item, idx) => (
                           <div key={idx} className="flex justify-between items-center text-sm">
                             <span className="font-bold text-gray-700 dark:text-gray-200">{item.quantity}x {item.product.name}</span>
                             {item.notes && <span className="text-[10px] italic text-red-500 font-bold">Obs: {item.notes}</span>}
                           </div>
                         ))}
                      </div>
                      <div className="flex gap-2 pt-2">
                        {order.status === 'Received' && (
                          <button onClick={() => onUpdateOrderStatus(order.id, 'Preparing')} className="flex-1 bg-blue-500 text-white text-xs font-black py-4 rounded-xl">Aceitar Pedido</button>
                        )}
                        {order.status === 'Preparing' && (
                          <button onClick={() => onUpdateOrderStatus(order.id, 'Ready')} className="flex-1 bg-green-500 text-white text-xs font-black py-4 rounded-xl">Marcar como Pronto</button>
                        )}
                        {order.status === 'Ready' && (
                          <button onClick={() => onUpdateOrderStatus(order.id, 'Delivered')} className="flex-1 bg-primary text-white text-xs font-black py-4 rounded-xl">Finalizar Entrega</button>
                        )}
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {activeTab === 'PRODUCTS' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-primary/20 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">qr_code_2</span>
                <h4 className="text-xs font-black uppercase text-primary tracking-widest">Seu Link de Vendas</h4>
              </div>
              <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl text-[12px] font-mono break-all border border-gray-100 dark:border-white/5 text-gray-500">
                {storeLink}
              </div>
              <button onClick={handleCopyLink} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 active:scale-95 ${copied ? 'bg-green-500 text-white' : 'bg-primary text-white shadow-xl shadow-primary/20'}`}>
                <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                {copied ? 'Link Copiado!' : 'Copiar Link para o WhatsApp'}
              </button>
            </div>

            <div className={`p-6 rounded-3xl border transition-all ${isOpen ? 'bg-green-50 border-green-100 dark:bg-green-500/5' : 'bg-red-50 border-red-100 dark:bg-red-500/5'}`}>
               <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-black">{isOpen ? 'Loja Aberta' : 'Loja Fechada'}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Visibilidade no Site</p>
                  </div>
                  <button onClick={onToggleStoreStatus} className={`w-14 h-8 rounded-full border-4 transition-colors ${isOpen ? 'bg-green-500 border-transparent' : 'bg-red-500 border-transparent'}`}>
                    <div className={`size-6 bg-white rounded-full transition-transform ${isOpen ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
               </div>
            </div>

            <button onClick={onAddProduct} className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all">
              <span className="material-symbols-outlined">add_circle</span> NOVO ITEM NO CARDÁPIO
            </button>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Itens Atuais</h4>
              {products.map(p => (
                <div key={p.id} className="bg-white dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/10 flex items-center gap-4 group">
                  <div className="size-14 bg-cover bg-center rounded-xl shrink-0" style={{ backgroundImage: `url('${p.image}')` }}></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{p.name}</p>
                    <p className="text-primary font-bold text-xs">R$ {p.price.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => onEditProduct(p)} className="p-3 bg-gray-100 dark:bg-white/10 rounded-xl text-primary active:scale-90 transition-all"><span className="material-symbols-outlined text-sm">edit</span></button>
                    <button onClick={() => onDeleteProduct(p.id)} className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-500 active:scale-90 transition-all"><span className="material-symbols-outlined text-sm">delete</span></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'STATS' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black px-1">Resumo Financeiro</h3>
            <div className="grid grid-cols-1 gap-4">
               <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/10 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Total Vendido</p>
                    <p className="text-3xl font-black text-green-500">R$ {stats.totalVendas.toFixed(2)}</p>
                  </div>
                  <span className="material-symbols-outlined text-4xl text-green-500/20">payments</span>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/10 text-center">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Pedidos</p>
                    <p className="text-2xl font-black">{stats.totalPedidos}</p>
                 </div>
                 <div className="bg-white dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/10 text-center">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Ticket Médio</p>
                    <p className="text-xl font-black text-primary">R$ {stats.ticketMedio.toFixed(2)}</p>
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'SETTINGS' && (
          <div className="space-y-6">
             <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/10 space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-xl font-black flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">category</span>
                      Categorias do Cardápio
                   </h3>
                   {!isAddingCategory && (
                     <button 
                        onClick={() => { setIsAddingCategory(true); setCategoryNameInput(''); }}
                        className="text-[10px] font-black uppercase text-primary border border-primary/20 px-3 py-1 rounded-full hover:bg-primary/5"
                     >
                        + Criar Nova
                     </button>
                   )}
                </div>

                <div className="bg-blue-50 dark:bg-primary/5 p-4 rounded-2xl border border-blue-100 dark:border-primary/10">
                   <p className="text-[11px] text-blue-600 dark:text-primary font-bold uppercase leading-tight flex items-center gap-2">
                     <span className="material-symbols-outlined text-sm">info</span>
                     Nota: As categorias são detectadas pelos produtos. Você pode criar nomes novos ou renomear em massa abaixo.
                   </p>
                </div>

                {isAddingCategory && (
                   <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl flex gap-2 animate-in slide-in-from-right duration-200">
                      <input 
                         value={categoryNameInput}
                         onChange={(e) => setCategoryNameInput(e.target.value)}
                         className="flex-1 bg-white dark:bg-white/5 border-none rounded-xl p-3 text-sm font-bold shadow-inner"
                         placeholder="Nome da categoria..."
                      />
                      <button onClick={handleAddCategory} className="bg-primary text-white p-3 rounded-xl shadow-lg shadow-primary/20"><span className="material-symbols-outlined">check</span></button>
                      <button onClick={() => setIsAddingCategory(false)} className="bg-gray-200 dark:bg-white/10 p-3 rounded-xl"><span className="material-symbols-outlined">close</span></button>
                   </div>
                )}

                <div className="space-y-2">
                   {allAvailableCategories.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-4 rounded-2xl group border border-transparent hover:border-primary/20 transition-all">
                         {editingCategoryIdx === idx ? (
                            <div className="flex-1 flex gap-2">
                               <input 
                                  value={categoryNameInput}
                                  onChange={(e) => setCategoryNameInput(e.target.value)}
                                  className="flex-1 bg-white dark:bg-white/5 border-none rounded-xl p-2 text-sm font-bold shadow-inner"
                                  autoFocus
                               />
                               <button onClick={() => handleRenameCategoryAction(idx)} className="text-green-500 p-1"><span className="material-symbols-outlined">check</span></button>
                               <button onClick={() => setEditingCategoryIdx(null)} className="text-gray-400 p-1"><span className="material-symbols-outlined">close</span></button>
                            </div>
                         ) : (
                            <>
                               <div className="flex flex-col">
                                 <span className="font-bold text-sm">{cat}</span>
                                 <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider">{products.filter(p => p.category === cat).length} Produtos Vinculados</span>
                               </div>
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingCategoryIdx(idx); setCategoryNameInput(cat); }} className="text-primary p-2 hover:bg-white/10 rounded-lg"><span className="material-symbols-outlined text-sm">edit</span></button>
                                  <button onClick={() => handleDeleteCategoryAction(idx)} className="text-red-500 p-2 hover:bg-white/10 rounded-lg"><span className="material-symbols-outlined text-sm">delete</span></button>
                               </div>
                            </>
                         )}
                      </div>
                   ))}
                </div>
             </div>

             <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/10 space-y-6">
                <h3 className="text-xl font-black flex items-center gap-2">
                   <span className="material-symbols-outlined text-primary">settings_applications</span>
                   Ajustes de Acesso
                </h3>
                <div className="space-y-4">
                   <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 px-1">WhatsApp de Vendas</label>
                      <input type="tel" value={newWA} onChange={(e) => setNewWA(e.target.value)} className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl p-4 font-bold text-primary shadow-inner" />
                   </div>
                   <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Segurança</p>
                      <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl p-4 shadow-inner" placeholder="Nova senha da cozinha" />
                      <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl p-4 shadow-inner" placeholder="Confirme a nova senha" />
                   </div>
                </div>
                <button onClick={handleSaveSettings} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all">Salvar Tudo</button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
