
import React, { useState } from 'react';
import { Store } from '../types';

interface SaaSAdminDashboardProps {
  stores: Store[];
  saasPassword: string;
  onUpdateSaaSPassword: (pass: string) => void;
  onDeleteStore: (id: string) => void;
  onUpdateStorePassword: (storeId: string, newPass: string) => void;
  onViewStore: (store: Store) => void;
  onBack: () => void;
}

const SaaSAdminDashboard: React.FC<SaaSAdminDashboardProps> = ({ 
  stores, 
  saasPassword, 
  onUpdateSaaSPassword, 
  onDeleteStore, 
  onUpdateStorePassword,
  onViewStore, 
  onBack 
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeNewPass, setStoreNewPass] = useState('');

  const totalGlobalVendas = stores.reduce((acc, s) => acc + (s.orders?.reduce((sum, o) => o.status !== 'Cancelled' ? sum + o.total : sum, 0) || 0), 0);
  const totalGlobalPedidos = stores.reduce((acc, s) => acc + (s.orders?.length || 0), 0);

  const handlePasswordChange = () => {
    if (currentPass !== saasPassword) { alert("Senha atual incorreta."); return; }
    if (newPass !== confirmPass) { alert("As novas senhas não coincidem."); return; }
    onUpdateSaaSPassword(newPass);
    alert("Senha alterada com sucesso!");
    setShowSettings(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md px-6 py-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-black">Painel Master</h1>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full ${showSettings ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/5'}`}>
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      <main className="max-w-5xl mx-auto w-full p-6 space-y-8">
        {showSettings && (
          <section className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-sm border border-primary/20 animate-in slide-in-from-top duration-300">
            <h3 className="text-lg font-black mb-4">Ajustes Master</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} className="w-full bg-gray-50 dark:bg-white/5 rounded-2xl p-4" placeholder="Senha Atual" />
              <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full bg-gray-50 dark:bg-white/5 rounded-2xl p-4" placeholder="Nova Senha" />
              <button onClick={handlePasswordChange} className="bg-primary text-white font-black px-6 rounded-2xl py-4">Salvar Nova Senha Master</button>
            </div>
          </section>
        )}

        {/* Global Stats */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 text-center">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Lanchonetes</p>
            <p className="text-3xl font-black text-primary">{stores.length}</p>
          </div>
          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 text-center">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Pedidos</p>
            <p className="text-3xl font-black">{totalGlobalPedidos}</p>
          </div>
          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 text-center">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Vendas Totais</p>
            <p className="text-3xl font-black text-green-500">R$ {totalGlobalVendas.toFixed(2)}</p>
          </div>
        </section>

        {/* Store Management List */}
        <section className="space-y-4">
          <h3 className="text-lg font-black px-1">Gerenciar Clientes</h3>
          <div className="grid gap-4">
            {stores.map(store => (
              <div key={store.id} className="bg-white dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/5 flex flex-col gap-4 group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-primary">
                      {store.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-lg">{store.name}</h4>
                      <p className="text-xs text-gray-400">@{store.slug} • Whats: {store.whatsapp}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingStoreId(editingStoreId === store.id ? null : store.id)} className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-[10px] font-black uppercase rounded-xl hover:bg-primary/10">
                      {editingStoreId === store.id ? 'Fechar' : 'Gerenciar Senha'}
                    </button>
                    <button onClick={() => onViewStore(store)} className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-xl">
                      Ver Cardápio
                    </button>
                    <button onClick={() => { if(confirm("Excluir definitivamente?")) onDeleteStore(store.id); }} className="p-2 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>

                {editingStoreId === store.id && (
                  <div className="mt-2 p-5 bg-gray-50 dark:bg-black/20 rounded-2xl border border-primary/10 animate-in zoom-in-95 duration-300">
                    <div className="flex flex-col md:flex-row items-end gap-4">
                      <div className="flex-1 space-y-1.5">
                         <label className="text-[10px] font-black uppercase text-primary">Senha Atual Cadastrada:</label>
                         <div className="bg-white dark:bg-white/5 p-3 rounded-xl font-mono text-sm border border-gray-100 dark:border-white/10 flex justify-between">
                            <span>{store.adminPassword}</span>
                            <span className="material-symbols-outlined text-xs text-gray-300">key</span>
                         </div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                         <label className="text-[10px] font-black uppercase text-gray-400">Definir Nova Senha:</label>
                         <input 
                           type="text" 
                           value={storeNewPass} 
                           onChange={(e) => setStoreNewPass(e.target.value)} 
                           placeholder="Nova senha para o cliente"
                           className="w-full bg-white dark:bg-white/5 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20"
                         />
                      </div>
                      <button 
                        onClick={() => { if(storeNewPass) { onUpdateStorePassword(store.id, storeNewPass); setStoreNewPass(''); setEditingStoreId(null); } }}
                        className="bg-primary text-white text-[10px] font-black uppercase px-6 py-3.5 rounded-xl shadow-lg shadow-primary/20"
                      >
                        Resetar Senha
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default SaaSAdminDashboard;
