
import React, { useState } from 'react';
import { Store } from '../types';

interface SaaSAdminDashboardProps {
  stores: Store[];
  saasPassword: string;
  onUpdateSaaSPassword: (pass: string) => void;
  onDeleteStore: (id: string) => void;
  onViewStore: (store: Store) => void;
  onBack: () => void;
}

const SaaSAdminDashboard: React.FC<SaaSAdminDashboardProps> = ({ 
  stores, 
  saasPassword, 
  onUpdateSaaSPassword, 
  onDeleteStore, 
  onViewStore, 
  onBack 
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const totalGlobalVendas = stores.reduce((acc, s) => acc + (s.orders?.reduce((sum, o) => o.status !== 'Cancelled' ? sum + o.total : sum, 0) || 0), 0);
  const totalGlobalPedidos = stores.reduce((acc, s) => acc + (s.orders?.length || 0), 0);

  const handlePasswordChange = () => {
    if (currentPass !== saasPassword) {
      alert("Senha atual incorreta.");
      return;
    }
    if (newPass !== confirmPass) {
      alert("As novas senhas não coincidem.");
      return;
    }
    if (newPass.length < 4) {
      alert("A senha deve ter pelo menos 4 caracteres.");
      return;
    }
    onUpdateSaaSPassword(newPass);
    alert("Senha alterada com sucesso!");
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setShowSettings(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md px-6 py-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-black">Painel do Dono SaaS</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-all ${showSettings ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200'}`}
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full hidden sm:flex">
            <span className="size-2 bg-primary rounded-full animate-ping"></span>
            <span className="text-[10px] font-black text-primary uppercase">Plataforma Live</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full p-6 space-y-8">
        {showSettings && (
          <section className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-sm border border-primary/20 animate-in slide-in-from-top duration-300">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">security</span>
              Configurações de Segurança
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Senha Atual</label>
                <input 
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl p-4 focus:ring-4 focus:ring-primary/10"
                  placeholder="••••••"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Nova Senha</label>
                <input 
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl p-4 focus:ring-4 focus:ring-primary/10"
                  placeholder="••••••"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 px-1">Confirmar Nova Senha</label>
                <div className="flex gap-2">
                  <input 
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-white/5 border-none rounded-2xl p-4 focus:ring-4 focus:ring-primary/10"
                    placeholder="••••••"
                  />
                  <button 
                    onClick={handlePasswordChange}
                    className="bg-primary text-white font-black px-6 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Global Stats */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Lanchonetes Ativas</p>
            <p className="text-3xl font-black">{stores.length}</p>
          </div>
          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Pedidos Processados</p>
            <p className="text-3xl font-black text-green-500">{totalGlobalPedidos}</p>
          </div>
          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">GMV Total (Vendas)</p>
            <p className="text-3xl font-black text-primary">R$ {totalGlobalVendas.toFixed(2)}</p>
          </div>
        </section>

        {/* Store Management List */}
        <section className="space-y-4">
          <h3 className="text-lg font-black px-1">Gerenciar Clientes (Lanchonetes)</h3>
          <div className="grid gap-4">
            {stores.length === 0 ? (
              <div className="py-20 text-center opacity-30 italic">Nenhum cliente cadastrado ainda.</div>
            ) : (
              stores.map(store => (
                <div key={store.id} className="bg-white dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {store.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-lg">{store.name}</h4>
                      <p className="text-xs text-gray-400">Slug: @{store.slug} • Criado em: {new Date(store.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 bg-gray-50 dark:bg-white/5 p-3 rounded-2xl md:bg-transparent md:p-0">
                    <div className="text-center md:text-right">
                      <p className="text-[10px] font-black uppercase text-gray-400">Vendas</p>
                      <p className="text-sm font-bold">R$ {(store.orders?.reduce((sum, o) => o.status !== 'Cancelled' ? sum + o.total : sum, 0) || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-center md:text-right">
                      <p className="text-[10px] font-black uppercase text-gray-400">Pedidos</p>
                      <p className="text-sm font-bold">{store.orders?.length || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onViewStore(store)}
                      className="flex-1 md:flex-none px-4 py-2 bg-gray-100 dark:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      Acessar Loja
                    </button>
                    <button 
                      onClick={() => { if(confirm(`Excluir a lanchonete "${store.name}" permanentemente?`)) onDeleteStore(store.id); }}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default SaaSAdminDashboard;
