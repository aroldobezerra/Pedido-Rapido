
import React, { useState, useMemo } from 'react';
import { Product, Category } from '../types';

interface CustomerMenuProps {
  storeName: string;
  isOpen: boolean;
  products: Product[];
  onAddToCart: (p: Product) => void;
  cartCount: number;
  subtotal: number;
  onViewCart: () => void;
  onViewAdmin: () => void;
  onBack: () => void;
}

const CustomerMenu: React.FC<CustomerMenuProps> = ({ 
  storeName,
  isOpen,
  products, 
  onAddToCart, 
  cartCount, 
  subtotal, 
  onViewCart,
  onViewAdmin,
  onBack
}) => {
  const [activeCategory, setActiveCategory] = useState<Category>(Category.BURGERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Normalização para evitar erros de case-sensitive no banco
      const matchesCategory = String(p.category).toLowerCase() === String(activeCategory).toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return (p.isAvailable !== false) && matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen pb-32">
      <header className="sticky top-0 z-50 bg-background-light/90 dark:bg-background-dark/95 backdrop-blur-md border-b border-[#e8dbce] dark:border-[#3d2b1d]">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 hover:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">home</span>
            </button>
            <div onClick={onViewAdmin} className="cursor-pointer">
              <h1 className="text-lg font-black leading-tight tracking-tight">{storeName}</h1>
              <div className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9c7349]">{isOpen ? 'Aberto Agora' : 'Fechado'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSearching(!isSearching)}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all shadow-sm ${isSearching ? 'bg-primary text-white' : 'bg-white dark:bg-[#3d2b1d]'}`}
            >
              <span className="material-symbols-outlined text-xl">{isSearching ? 'close' : 'search'}</span>
            </button>
          </div>
        </div>

        {isSearching && (
          <div className="px-4 pb-4 animate-in slide-in-from-top duration-300">
            <input 
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="O que vamos comer hoje?"
              className="w-full pl-4 pr-4 py-3 bg-white dark:bg-[#2d2116] border border-primary/20 rounded-2xl outline-none shadow-inner"
            />
          </div>
        )}
        
        <div className="flex overflow-x-auto hide-scrollbar px-4 pb-2 gap-6">
          {Object.values(Category).map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex flex-col items-center shrink-0 border-b-2 pb-2 transition-all ${
                activeCategory === cat ? 'border-primary' : 'border-transparent'
              }`}
            >
              <span className={`text-xs font-black uppercase tracking-widest ${activeCategory === cat ? 'text-primary' : 'text-[#9c7349]'}`}>
                {cat}
              </span>
            </button>
          ))}
        </div>
      </header>

      {!isOpen && (
        <div className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest py-2 text-center sticky top-[110px] z-40">
           Lanchonete Fechada no momento. Apenas visualização disponível.
        </div>
      )}

      <main className="px-4 space-y-8 mt-6 max-w-lg mx-auto w-full">
        <section className="space-y-4">
          <h2 className="text-xl font-black tracking-tight px-1">{activeCategory}</h2>
          
          <div className="grid gap-6">
            {filteredProducts.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                 <span className="material-symbols-outlined text-6xl mb-4">info</span>
                 <p className="font-bold text-sm">Nenhum produto disponível em {activeCategory} no momento.</p>
              </div>
            ) : (
              filteredProducts.map(product => (
                <div key={product.id} className="flex flex-col bg-white dark:bg-[#2d2218] rounded-3xl overflow-hidden shadow-sm border border-[#e8dbce]/50 dark:border-[#3d2b1d] group hover:shadow-xl transition-all duration-300">
                  <div 
                    className="h-52 w-full bg-center bg-cover transition-transform duration-700 group-hover:scale-105" 
                    style={{ backgroundImage: `url('${product.image}')` }}
                  ></div>
                  <div className="p-5 flex flex-col gap-2 bg-white dark:bg-[#2d2218]">
                    <div className="flex justify-between items-start">
                      <h3 className="font-black text-lg leading-tight">{product.name}</h3>
                      <span className="font-black text-primary text-lg">R$ {product.price.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-[#9c7349] dark:text-[#cbb094] line-clamp-2 leading-relaxed">{product.description}</p>
                    <button 
                      onClick={() => onAddToCart(product)}
                      disabled={!isOpen}
                      className={`mt-4 w-full text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg ${isOpen ? 'bg-primary shadow-primary/20' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}
                    >
                      <span className="material-symbols-outlined">add_shopping_cart</span>
                      {isOpen ? 'Adicionar ao Pedido' : 'Loja Fechada'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-background-light dark:from-background-dark via-transparent pointer-events-none">
          <button 
            onClick={onViewCart}
            className="max-w-md mx-auto w-full bg-primary text-white p-5 rounded-2xl shadow-2xl flex items-center justify-between pointer-events-auto animate-in slide-in-from-bottom duration-500"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-2.5 py-1 rounded-lg font-black text-sm">{cartCount}</div>
              <span className="font-black tracking-tight">Ver Meu Carrinho</span>
            </div>
            <span className="font-black text-lg">R$ {subtotal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
