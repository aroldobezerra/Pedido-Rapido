
import React, { useState } from 'react';
import { Store } from '../types';
import { INITIAL_PRODUCTS } from '../constants';

interface RegisterStoreProps {
  onRegister: (store: Store) => void;
  onCancel: () => void;
}

const RegisterStore: React.FC<RegisterStoreProps> = ({ onRegister, onCancel }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !whatsapp || !password) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    setIsSubmitting(true);

    try {
      const newStore: Store = {
        id: Date.now().toString(),
        name: name.trim(),
        slug: slug.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, '').trim(),
        whatsapp: whatsapp.replace(/\D/g, '').trim(),
        adminPassword: password.trim(),
        products: [...INITIAL_PRODUCTS],
        orders: [],
        createdAt: Date.now(),
        isOpen: true
      };

      await onRegister(newStore);
    } catch (err) {
      console.error("Erro ao cadastrar loja:", err);
      alert("Ocorreu um erro ao processar os dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark px-6 py-12">
      <header className="max-w-md mx-auto w-full flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-black tracking-tight">Novo Cadastro</h1>
      </header>

      {isSubmitting ? (
        <div className="max-w-md mx-auto w-full flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
           <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
           <h3 className="text-xl font-black mb-2">Criando seu Império...</h3>
           <p className="text-sm text-gray-500 font-bold uppercase tracking-widest text-center">Estamos ativando seu link global e preparando seu cardápio com IA.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto w-full space-y-6 animate-in slide-in-from-bottom duration-500">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-[#9c7349]">Nome da Lanchonete</label>
              <input 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                placeholder="Ex: Burger King Gourmet"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-[#9c7349]">Identificador (Slug para URL)</label>
              <div className="relative">
                <span className="absolute left-4 top-4 text-gray-400 font-bold">@</span>
                <input 
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 pl-9 focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                  placeholder="Ex: burger-king-gourmet"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-[#9c7349]">WhatsApp (com DDD)</label>
              <input 
                required
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                placeholder="Ex: 5511999999999"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-[#9c7349]">Senha de Admin</label>
              <div className="relative">
                <input 
                  required
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                  placeholder="Sua senha secreta"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  className="absolute right-4 top-4 text-gray-400"
                >
                  <span className="material-symbols-outlined text-sm">{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-400 px-1 italic">Essa senha será usada para acessar seu painel de vendas.</p>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all mt-8"
          >
            Finalizar e Ativar Link
          </button>
        </form>
      )}
    </div>
  );
};

export default RegisterStore;
