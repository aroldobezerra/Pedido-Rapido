
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
    if (currentPass !== saasPassword) { alert("Senha mestre atual incorreta."); return; }
    if (newPass !== confirmPass) { alert("As novas senhas não coincidem."); return; }
    onUpdateSaaSPassword(newPass);
    alert("Senha mestre alterada com sucesso!");
    setShowSettings(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md px-6 py-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-primary/10 transition-colors active:scale-90">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-black tracking-tight">Painel Mestre</h1>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-full transition-all ${showSettings ? 'bg-primary text-white rotate-90' : 'bg-gray-100 dark:bg-white/5'}`}>
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      <main className="max-w-5xl mx-auto w-full p-6 space-y-8">
        {showSettings && (
          <section className="bg-white dark:bg-white/5 p-6 rounded-[2rem] shadow-sm border border-primary/30 animate-in slide-in-from-top duration-300">
            <h3 className="text-lg font-black mb-4">Segurança Master</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl p-4 text-sm" placeholder="Senha Mestre Atual" />
              <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl p-4 text-sm" placeholder="Nova Senha Mestre" />
              <button onClick={handlePasswordChange} className="bg-primary text-white font-black px-6 rounded-2xl py-4 shadow-xl shadow-primary/20 active:scale-95 transition-all">Salvar Acesso Master</button>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 text-center flex flex-col items-center">
            <span className="material-symbols-outlined text-primary text-4xl mb-2">store</span>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Lanchonetes Ativas</p>
            <p className="text-4xl font-black text-primary">{stores.length}</p>
          </div>
          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 text-center flex flex-col items-center">
            <span className="material-symbols-outlined text-gray-500 text-4xl mb-2">list_alt</span>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Pedidos Totais</p>
            <p className="text-4xl font-black">{totalGlobalPedidos}</p>
          </div>
          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 text-center flex flex-col items-center">
            <span className="material-symbols-outlined text-green-500 text-4xl mb-2">trending_up</span>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Faturamento Global</p>
            <p className="text-3xl font-black text-green-500">R$ {totalGlobalVendas.toFixed(2)}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black px-1">Base de Clientes</h3>
          <div className="grid grid-cols-1 gap-4">
            {stores.map(store => (
              <div key={store.id} className="bg-white dark:bg-white/5 p-5 rounded-[2rem] border border-gray-100 dark:border-white/5 flex flex-col gap-4 group transition-all hover:shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-primary text-xl">
                      {store.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-lg leading-tight">{store.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded font-mono text-gray-500">@{store.slug}</span>
                        <span className="text-[10px] text-primary font-bold">{store.whatsapp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 md:pb-0">
                    <button onClick={() => setEditingStoreId(editingStoreId === store.id ? null : store.id)} className="shrink-0 px-4 py-3 bg-gray-100 dark:bg-white/10 text-[10px] font-black uppercase rounded-xl hover:bg-primary/10 active:scale-95 transition-all">
                      {editingStoreId === store.id ? 'Fechar' : 'Resetar Senha'}
                    </button>
                    <button onClick={() => onViewStore(store)} className="shrink-0 px-4 py-3 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-xl active:scale-95 transition-all">
                      Ver Cardápio
                    </button>
                    <button onClick={() => { if(confirm("Deseja EXCLUIR permanentemente esta lanchonete e todos os seus produtos/pedidos?")) onDeleteStore(store.id); }} className="shrink-0 p-3 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl active:scale-95 transition-all">
                      <span className="material-symbols-outlined text-sm">delete_forever</span>
                    </button>
                  </div>
                </div>

                {editingStoreId === store.id && (
                  <div className="mt-2 p-6 bg-gray-50 dark:bg-black/20 rounded-[1.5rem] border border-primary/20 animate-in zoom-in-95 duration-300">
                    <div className="flex flex-col md:flex-row items-end gap-4">
                      <div className="flex-1 w-full space-y-2">
                         <label className="text-[10px] font-black uppercase text-primary px-1">Senha Atual do Cliente:</label>
                         <div className="bg-white dark:bg-white/5 p-4 rounded-xl font-mono text-sm border border-gray-100 dark:border-white/10 flex justify-between items-center shadow-inner">
                            <span className="font-bold">{store.adminPassword}</span>
                            <span className="material-symbols-outlined text-xs text-gray-300">vpn_key</span>
                         </div>
                      </div>
                      <div className="flex-1 w-full space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400 px-1">Definir Nova Senha de Acesso:</label>
                         <input 
                           type="text" 
                           value={storeNewPass} 
                           onChange={(e) => setStoreNewPass(e.target.value)} 
                           placeholder="Nova senha temporária"
                           className="w-full bg-white dark:bg-white/5 border-none rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                         />
                      </div>
                      <button 
                        onClick={() => { if(storeNewPass) { onUpdateStorePassword(store.id, storeNewPass); setStoreNewPass(''); setEditingStoreId(null); } }}
                        className="w-full md:w-auto bg-primary text-white text-[10px] font-black uppercase px-8 py-4 rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                      >
                        Confirmar Reset
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
