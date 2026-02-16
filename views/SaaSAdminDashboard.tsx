
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
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeNewPass, setStoreNewPass] = useState('');

  const totalGlobalVendas = stores.reduce((acc, s) => acc + (s.orders?.reduce((sum, o) => o.status !== 'Cancelled' ? sum + o.total : sum, 0) || 0), 0);
  const totalGlobalPedidos = stores.reduce((acc, s) => acc + (s.orders?.length || 0), 0);

  const handlePasswordChange = () => {
    if (!currentPass || !newPass) {
      alert("Por favor, preencha a senha atual e a nova senha.");
      return;
    }
    if (currentPass !== saasPassword) { 
      alert("Senha mestre atual incorreta."); 
      return; 
    }
    if (newPass.length < 4) {
      alert("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }
    
    onUpdateSaaSPassword(newPass);
    alert("Senha mestre alterada com sucesso!");
    
    // Limpar campos
    setCurrentPass('');
    setNewPass('');
    setShowSettings(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md px-6 py-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-primary/10 transition-colors active:scale-90">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight leading-none">Painel Mestre</h1>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Gestão da Plataforma</span>
          </div>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-full transition-all ${showSettings ? 'bg-primary text-white rotate-90 shadow-lg shadow-primary/20' : 'bg-gray-100 dark:bg-white/5'}`}>
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      <main className="max-w-5xl mx-auto w-full p-6 space-y-8">
        {showSettings && (
          <section className="bg-white dark:bg-white/5 p-8 rounded-[2.5rem] shadow-2xl border border-primary/20 animate-in slide-in-from-top duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary">security</span>
                 <h3 className="text-lg font-black">Alterar Senha Master</h3>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 px-2 tracking-widest">Senha Master Atual</label>
                <input 
                  type="password" 
                  value={currentPass} 
                  onChange={(e) => setCurrentPass(e.target.value)} 
                  className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-primary/20 outline-none rounded-2xl p-4 text-sm font-bold transition-all" 
                  placeholder="Sua senha atual" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 px-2 tracking-widest">Nova Senha Master</label>
                <input 
                  type="password" 
                  value={newPass} 
                  onChange={(e) => setNewPass(e.target.value)} 
                  className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-primary/20 outline-none rounded-2xl p-4 text-sm font-bold transition-all" 
                  placeholder="Mínimo 4 caracteres" 
                />
              </div>
              <button 
                onClick={handlePasswordChange} 
                className="bg-primary text-white font-black px-6 rounded-2xl py-4 shadow-xl shadow-primary/20 active:scale-95 transition-all w-full flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                Atualizar Acesso
              </button>
            </div>
            <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
              Atenção: Esta senha dá acesso total a todas as lojas cadastradas na plataforma.
            </p>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-white/5 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 text-center flex flex-col items-center group hover:border-primary/30 transition-all">
            <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl">store</span>
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Lanchonetes Ativas</p>
            <p className="text-4xl font-black text-primary">{stores.length}</p>
          </div>
          <div className="bg-white dark:bg-white/5 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 text-center flex flex-col items-center group hover:border-gray-400 transition-all">
            <div className="size-16 bg-gray-100 dark:bg-white/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-gray-500 text-3xl">list_alt</span>
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Pedidos Totais</p>
            <p className="text-4xl font-black">{totalGlobalPedidos}</p>
          </div>
          <div className="bg-white dark:bg-white/5 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 text-center flex flex-col items-center group hover:border-green-400/30 transition-all">
            <div className="size-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-green-500 text-3xl">trending_up</span>
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Faturamento Global</p>
            <p className="text-3xl font-black text-green-500">R$ {totalGlobalVendas.toFixed(2)}</p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xl font-black tracking-tight">Base de Clientes</h3>
            <span className="text-[10px] font-black bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full uppercase text-gray-400">Tempo Real</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {stores.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center opacity-20">
                <span className="material-symbols-outlined text-6xl">cloud_off</span>
                <p className="font-black mt-2">Nenhuma loja cadastrada</p>
              </div>
            ) : stores.map(store => (
              <div key={store.id} className="bg-white dark:bg-white/5 p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5 flex flex-col gap-6 group transition-all hover:shadow-xl hover:border-primary/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="size-16 bg-primary/10 rounded-[1.25rem] flex items-center justify-center font-black text-primary text-2xl shadow-inner">
                      {store.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-xl leading-tight text-gray-900 dark:text-white">{store.name}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="text-[10px] bg-primary/5 text-primary px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-primary/10">@{store.slug}</span>
                        <div className="flex items-center gap-1 text-gray-400">
                          <span className="material-symbols-outlined text-sm">call</span>
                          <span className="text-xs font-bold">{store.whatsapp}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <span className="material-symbols-outlined text-sm">calendar_month</span>
                          <span className="text-[10px] font-bold">{new Date(store.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setEditingStoreId(editingStoreId === store.id ? null : store.id)} 
                      className={`shrink-0 px-5 py-3.5 text-[10px] font-black uppercase rounded-2xl transition-all active:scale-95 ${editingStoreId === store.id ? 'bg-black text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {editingStoreId === store.id ? 'Cancelar' : 'Gerenciar Acesso'}
                    </button>
                    <button 
                      onClick={() => onViewStore(store)} 
                      className="shrink-0 px-5 py-3.5 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-95 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      Ver Cardápio
                    </button>
                    <button 
                      onClick={() => { if(confirm("Deseja EXCLUIR permanentemente esta lanchonete? Esta ação não pode ser desfeita.")) onDeleteStore(store.id); }} 
                      className="shrink-0 p-3.5 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>

                {editingStoreId === store.id && (
                  <div className="p-8 bg-gray-50 dark:bg-black/20 rounded-[2rem] border-2 border-primary/20 animate-in zoom-in-95 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                      <div className="space-y-3">
                         <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-primary text-sm">key</span>
                            <label className="text-[10px] font-black uppercase text-primary tracking-widest">Senha Atual da Loja</label>
                         </div>
                         <div className="bg-white dark:bg-white/10 p-5 rounded-2xl font-mono text-base border-2 border-gray-100 dark:border-white/5 flex justify-between items-center shadow-inner">
                            <span className="font-black tracking-widest">{store.adminPassword}</span>
                            <span className="material-symbols-outlined text-sm text-gray-300">lock_open</span>
                         </div>
                      </div>
                      <div className="space-y-3">
                         <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-gray-400 text-sm">new_releases</span>
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Definir Nova Senha</label>
                         </div>
                         <div className="flex gap-2">
                           <input 
                             type="text" 
                             value={storeNewPass} 
                             onChange={(e) => setStoreNewPass(e.target.value)} 
                             placeholder="Ex: nova123"
                             className="flex-1 bg-white dark:bg-white/10 border-2 border-transparent focus:border-primary/20 outline-none rounded-2xl p-5 text-sm font-bold shadow-sm"
                           />
                           <button 
                             onClick={() => { if(storeNewPass) { onUpdateStorePassword(store.id, storeNewPass); setStoreNewPass(''); setEditingStoreId(null); } }}
                             className="bg-primary text-white text-[10px] font-black uppercase px-8 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                           >
                             Salvar
                           </button>
                         </div>
                      </div>
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
