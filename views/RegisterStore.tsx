
import React, { useState, useEffect } from 'react';
import { Store, sanitizeSlug } from '../types';
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

  // Sanitização automática do slug enquanto digita o nome (opcional)
  useEffect(() => {
    if (name && !slug) {
      // Sugestão inicial de slug baseada no nome
      // mas deixamos o usuário editar depois
    }
  }, [name]);

  const finalSlug = sanitizeSlug(slug || name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !finalSlug || !whatsapp || !password) {
      alert("Preencha todos os campos corretamente.");
      return;
    }

    setIsSubmitting(true);

    const newStore: Store = {
      id: Date.now().toString(),
      name: name.trim(),
      slug: finalSlug,
      whatsapp: whatsapp.replace(/\D/g, '').trim(),
      adminPassword: password.trim(),
      products: [...INITIAL_PRODUCTS],
      orders: [],
      createdAt: Date.now(),
      isOpen: true,
      categories: ['Hambúrgueres', 'Acompanhamentos', 'Bebidas']
    };

    try {
      await onRegister(newStore);
    } catch (err) {
      alert("Erro ao cadastrar. Verifique sua internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark px-6 py-12">
      <header className="max-w-md mx-auto w-full flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="text-primary p-2 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-black tracking-tight">Criar Lanchonete</h1>
      </header>

      {isSubmitting ? (
        <div className="max-w-md mx-auto w-full flex flex-col items-center justify-center py-20 text-center">
           <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
           <h3 className="text-xl font-black mb-2">Sincronizando Link...</h3>
           <p className="text-sm text-gray-400">Garantindo que seu cardápio seja acessível globalmente.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto w-full space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-[#9c7349]">Nome Comercial</label>
              <input 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 font-bold"
                placeholder="Ex: Burger Prime"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-[#9c7349]">Identificador do Link (@)</label>
              <input 
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 font-mono font-bold"
                placeholder="Ex: burger-prime"
              />
              <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                 <p className="text-[10px] font-black uppercase text-primary mb-1">Seu link será:</p>
                 <p className="text-[12px] font-mono break-all opacity-60">
                    {window.location.origin}/?s=<span className="text-primary font-bold">{finalSlug || '...'}</span>
                 </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-[#9c7349]">WhatsApp de Vendas</label>
              <input 
                required
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 font-bold"
                placeholder="DDD + Número"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-[#9c7349]">Senha de Acesso ao Painel</label>
              <div className="relative">
                <input 
                  required
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 font-bold"
                  placeholder="Min. 4 caracteres"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  className="absolute right-4 top-4 text-gray-400"
                >
                  <span className="material-symbols-outlined text-sm">{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all mt-8"
          >
            Confirmar e Ativar Agora
          </button>
        </form>
      )}
    </div>
  );
};

export default RegisterStore;
