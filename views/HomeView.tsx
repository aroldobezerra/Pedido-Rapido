
import React from 'react';

interface HomeViewProps {
  onRegister: () => void;
  onSaaSAdmin: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onRegister, onSaaSAdmin }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <section className="px-6 pt-16 pb-20 max-w-4xl mx-auto text-center">
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 bg-primary rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/30 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
            <span className="material-symbols-outlined text-white text-6xl">rocket_launch</span>
          </div>
          <span className="text-primary font-black uppercase tracking-[0.3em] text-[10px] mb-2">Plataforma SaaS Premium</span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] text-gray-900 dark:text-white">
            Transforme sua lanchonete em um <span className="text-primary">Império Digital.</span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto font-medium">
            Cardápios inteligentes com IA, pedidos via WhatsApp e gestão profissional. Tudo pronto em menos de 2 minutos.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <button 
            onClick={onRegister}
            className="w-full md:w-auto bg-primary text-white font-black px-10 py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg"
          >
            <span className="material-symbols-outlined">add_business</span>
            Criar Minha Lanchonete Grátis
          </button>
          <a href="#beneficios" className="text-sm font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">
            Ver Benefícios
          </a>
        </div>
      </section>

      <section id="beneficios" className="px-6 py-20 bg-white dark:bg-white/5 border-y border-gray-100 dark:border-white/5">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="size-14 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">auto_awesome</span>
            </div>
            <h3 className="text-xl font-black">Fotos com IA</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Geramos imagens apetitosas para seus produtos usando inteligência artificial avançada.</p>
          </div>
          <div className="space-y-4">
            <div className="size-14 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">chat</span>
            </div>
            <h3 className="text-xl font-black">Pedidos no WhatsApp</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Seus clientes escolhem no cardápio e o pedido chega formatado direto no seu WhatsApp.</p>
          </div>
          <div className="space-y-4">
            <div className="size-14 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">dashboard_customize</span>
            </div>
            <h3 className="text-xl font-black">Painel de Gestão</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Gerencie produtos, horários, estoque e veja relatórios de vendas em tempo real.</p>
          </div>
        </div>
      </section>

      <footer className="mt-auto py-10 px-6 flex flex-col items-center gap-4">
        <p className="text-xs text-gray-400 font-medium">© 2024 Pedido Rápido AI - A tecnologia por trás do seu sucesso.</p>
        <button 
          onClick={onSaaSAdmin}
          className="text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:text-primary transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
          Acesso Proprietário SaaS
        </button>
      </footer>
    </div>
  );
};

export default HomeView;
