import React, { useState } from 'react';
import { Store, Category } from '../types';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !whatsapp || !password) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Fix: Added missing 'orders' property to match Store interface requirements.
      const newStore: Store = {
        id: Date.now().toString(),
        name,
        slug: slug.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, ''),
        whatsapp: whatsapp.replace(/\D/g, ''),
        adminPassword: password,
        products: [...INITIAL_PRODUCTS],
        orders: [],
        createdAt: Date.now(),
        isOpen: true
      };

      onRegister(newStore);
    } catch (err) {
      console.error("Erro ao criar objeto da loja:", err);
      alert("Ocorreu um erro ao processar os dados da lanchonete.");
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

      <form onSubmit={handleSubmit} className="max-w-md mx-auto w-full space-y-6">
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
            <p className="text-[10px] text-gray-400 px-1 italic">Este será seu link: seuapp.com/?s={slug || 'identificador'}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-[#9c7349]">WhatsApp (com DDD)</label>
            <input 
              required
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 focus:ring-4 focus:ring-primary/20 outline-none transition-all"
              placeholder="Ex: 5511999999999"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-[#9c7349]">Senha de Admin</label>
            <input 
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 focus:ring-4 focus:ring-primary/20 outline-none transition-all"
              placeholder="Sua senha secreta"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all mt-8 disabled:opacity-50"
        >
          {isSubmitting ? 'Processando...' : 'Finalizar Cadastro'}
        </button>
      </form>
    </div>
  );
};

export default RegisterStore;