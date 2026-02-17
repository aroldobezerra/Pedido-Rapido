
import React, { useState, useEffect, useMemo } from 'react';
import { Product, CartItem, Order, AppView, Store, OrderStatus, sanitizeSlug } from './types';
import CustomerMenu from './views/CustomerMenu';
import CartView from './views/CartView';
import OrderReview from './views/OrderReview';
import OrderTracking from './views/OrderTracking';
import AdminDashboard from './views/AdminDashboard';
import ProductForm from './views/ProductForm';
import HomeView from './views/HomeView';
import RegisterStore from './views/RegisterStore';
import SaaSAdminDashboard from './views/SaaSAdminDashboard';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('HOME');
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [saasPassword, setSaasPassword] = useState(() => {
    return localStorage.getItem('saas_master_pass') || 'admin123';
  });

  const syncStoreToCloud = async (store: Store) => {
    if (!isSupabaseConfigured()) return false;
    try {
      setIsSyncing(true);
      
      // Upsert robusto: tenta salvar tudo no JSONB 'content' mas garante as colunas de busca (id, slug)
      const { error } = await supabase.from('stores').upsert({
        id: store.id,
        slug: store.slug,
        name: store.name,
        content: store 
      }, { onConflict: 'slug' });
      
      if (error) {
        console.warn("Erro ao salvar coluna 'content', tentando modo compatibilidade:", error.message);
        // Fallback: se a coluna content não existir, salva o básico para o link não quebrar
        const { error: error2 } = await supabase.from('stores').upsert({
          id: store.id,
          slug: store.slug,
          name: store.name
        }, { onConflict: 'slug' });
        if (error2) throw error2;
      }
      return true;
    } catch (e) {
      console.error("Falha crítica na nuvem:", e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      setErrorStatus(null);
      
      const urlParams = new URLSearchParams(window.location.search);
      const rawSlug = urlParams.get('s');
      
      // Carrega cache local primeiro para velocidade e redundância
      const savedStores = localStorage.getItem('saas_stores');
      let localStores: Store[] = [];
      if (savedStores) {
        try {
          localStores = JSON.parse(savedStores);
          setStores(localStores);
        } catch (e) { console.error("Erro cache local"); }
      }
      
      if (rawSlug) {
        const storeSlug = sanitizeSlug(rawSlug);
        
        // 1. Prioridade para Cache Local (Se o dono estiver acessando, funciona sempre)
        const foundLocal = localStores.find(s => s.slug === storeSlug || sanitizeSlug(s.name) === storeSlug);
        
        if (foundLocal) {
          setCurrentStore(foundLocal);
          setView('MENU');
          setIsLoading(false);
          // Tenta atualizar em background sem bloquear
          fetchRemoteStore(storeSlug);
        } else {
          // 2. Busca na Nuvem - Se não tem cache, busca no banco
          await fetchRemoteStore(storeSlug, true);
        }
      } else {
        setIsLoading(false);
      }
    };

    const fetchRemoteStore = async (slug: string, isInitial: boolean = false) => {
      try {
        // Busca com '*' para não errar nomes de colunas
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .ilike('slug', slug) 
          .maybeSingle();

        if (error) {
          console.error("Erro Supabase:", error);
          if (isInitial) setErrorStatus(`Erro técnico (Cód: ${error.code}). Estamos verificando o servidor.`);
          return;
        }

        if (data) {
          // Mapeador Inteligente: Constrói a loja do que estiver disponível no banco
          const mappedStore: Store = data.content || {
            id: data.id,
            slug: data.slug,
            name: data.name || 'Sua Lanchonete',
            whatsapp: data.whatsapp || '',
            adminPassword: data.admin_password || data.adminPassword || '',
            products: data.products || [],
            orders: data.orders || [],
            isOpen: data.is_open ?? true,
            categories: data.categories || ['Hambúrgueres', 'Acompanhamentos', 'Bebidas'],
            createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now()
          };
          
          setCurrentStore(mappedStore);
          if (isInitial) setView('MENU');
          
          // Atualiza lista de lojas
          setStores(prev => {
            const exists = prev.find(s => s.id === mappedStore.id);
            if (exists) return prev.map(s => s.id === mappedStore.id ? mappedStore : s);
            return [...prev, mappedStore];
          });
        } else if (isInitial) {
          setErrorStatus(`A lanchonete "@${slug}" não foi encontrada. Verifique se o link está correto.`);
        }
      } catch (e) {
        if (isInitial) setErrorStatus("Conexão instável. Tente recarregar a página.");
      } finally {
        if (isInitial) setIsLoading(false);
      }
    };

    initApp();
  }, []);

  useEffect(() => {
    if (stores.length > 0) {
      localStorage.setItem('saas_stores', JSON.stringify(stores));
    }
  }, [stores]);

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, selectedExtras: [] }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handlePlaceOrder = (orderMeta: Partial<Order>) => {
    if (!currentStore) return;
    const newOrder: Order = {
      id: Date.now().toString(),
      store_id: currentStore.id,
      items: [...cart],
      status: 'Received',
      estimatedArrival: '20-30 min',
      timestamp: new Date().toLocaleTimeString(),
      customerName: orderMeta.customerName || 'Cliente',
      address: orderMeta.address,
      deliveryMethod: (orderMeta.deliveryMethod as any) || 'Delivery',
      tableNumber: orderMeta.tableNumber,
      pickupTime: orderMeta.pickupTime,
      notes: orderMeta.notes,
      total: cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) + (orderMeta.deliveryMethod === 'Delivery' ? 5 : 0)
    };

    const updatedStore = { ...currentStore, orders: [...(currentStore.orders || []), newOrder] };
    setStores(prev => prev.map(s => s.id === currentStore.id ? updatedStore : s));
    setCurrentStore(updatedStore);
    syncStoreToCloud(updatedStore); 
    setActiveOrder(newOrder);
    setCart([]);
    setView('TRACK');
  };

  const handleRegisterStore = async (store: Store) => {
    setIsLoading(true);
    const success = await syncStoreToCloud(store);
    setIsLoading(false);

    setStores(prev => [...prev, store]);
    setCurrentStore(store);
    setView('ADMIN');
    
    if (!success) {
      alert("Loja criada localmente! O link online será ativado automaticamente assim que a sincronização completar.");
    }
  };

  const handleUpdateStoreSettings = async (settings: any) => {
    if (!currentStore) return;
    const updatedStore = { ...currentStore, ...settings };
    setStores(prev => prev.map(s => s.id === currentStore.id ? updatedStore : s));
    setCurrentStore(updatedStore);
    await syncStoreToCloud(updatedStore);
  };

  const handleAdminLogin = () => {
    if (adminPasswordInput === currentStore?.adminPassword) {
      setAdminPasswordInput('');
      setView('ADMIN');
    } else {
      alert("Senha incorreta");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black text-[10px] uppercase tracking-[0.3em] text-primary">Carregando Cardápio...</p>
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-8 text-center animate-in fade-in duration-700">
        <div className="size-24 bg-red-500/10 text-red-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-red-500/5">
          <span className="material-symbols-outlined text-5xl">error</span>
        </div>
        <h2 className="text-3xl font-black mb-3 tracking-tighter">Ops! Link Não Ativado</h2>
        <p className="text-gray-500 text-sm mb-10 max-w-xs leading-relaxed">{errorStatus}</p>
        <div className="flex flex-col w-full max-w-xs gap-3">
          <button 
            onClick={() => { window.location.href = window.location.origin; }} 
            className="bg-primary text-white font-black px-10 py-5 rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            Ir para o Início
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="text-[10px] font-black uppercase text-[#9c7349] tracking-widest py-2"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'HOME':
        return <HomeView onRegister={() => setView('REGISTER')} onSaaSAdmin={() => setView('SAAS_LOGIN')} />;
      case 'REGISTER':
        return <RegisterStore onRegister={handleRegisterStore} onCancel={() => setView('HOME')} />;
      case 'SAAS_LOGIN':
        const masterPass = prompt("Senha Mestre:");
        if (masterPass === saasPassword) setView('SAAS_ADMIN');
        else if (masterPass !== null) { alert("Senha mestre inválida."); setView('HOME'); }
        else setView('HOME');
        return null;
      case 'SAAS_ADMIN':
        return (
          <SaaSAdminDashboard 
            stores={stores} 
            saasPassword={saasPassword}
            onUpdateSaaSPassword={setSaasPassword}
            onDeleteStore={(id) => setStores(prev => prev.filter(s => s.id !== id))}
            onUpdateStorePassword={(id, p) => setStores(prev => prev.map(s => s.id === id ? {...s, adminPassword: p} : s))}
            onViewStore={(s) => { setCurrentStore(s); setView('MENU'); }}
            onBack={() => setView('HOME')}
          />
        );
      case 'ADMIN_LOGIN':
        return (
          <div className="flex flex-col items-center justify-center h-screen p-8 bg-background-light dark:bg-background-dark">
            <div className="w-full max-w-sm flex flex-col items-center space-y-8 text-center animate-in zoom-in duration-300">
              <h2 className="text-2xl font-black">Área do Lojista</h2>
              <input 
                type="password" 
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Senha de Acesso" 
                className="w-full p-5 rounded-2xl border-2 border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 text-center font-bold tracking-[0.5em]"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin(); }}
                autoFocus
              />
              <button onClick={handleAdminLogin} className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-lg">Entrar no Painel</button>
              <button onClick={() => setView('MENU')} className="text-gray-400 text-xs font-black uppercase">Voltar ao Cardápio</button>
            </div>
          </div>
        );
      case 'MENU':
        if (!currentStore) return null;
        return (
          <CustomerMenu 
            storeName={currentStore.name}
            isOpen={currentStore.isOpen}
            products={currentStore.products || []}
            categories={currentStore.categories || ['Hambúrgueres', 'Acompanhamentos', 'Bebidas']}
            onAddToCart={handleAddToCart}
            cartCount={cart.length}
            subtotal={cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)}
            onViewCart={() => setView('CART')}
            onViewAdmin={() => setView('ADMIN_LOGIN')}
            onBack={() => { window.location.href = window.location.origin; }}
          />
        );
      case 'CART':
        return <CartView items={cart} updateQuantity={handleUpdateQuantity} clearCart={() => setCart([])} onBack={() => setView('MENU')} onProceed={(meta) => { setActiveOrder({ ...meta, items: cart } as Order); setView('REVIEW'); }} subtotal={cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)} />;
      case 'REVIEW':
        if (!activeOrder) return null;
        return <OrderReview items={cart} customerName={activeOrder.customerName} address={activeOrder.address || ''} method={activeOrder.deliveryMethod} tableNumber={activeOrder.tableNumber} pickupTime={activeOrder.pickupTime} orderNotes={activeOrder.notes} onBack={() => setView('CART')} onConfirm={(msg) => handlePlaceOrder({ ...activeOrder, notes: msg })} subtotal={cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)} />;
      case 'TRACK':
        if (!activeOrder) return null;
        return <OrderTracking order={activeOrder} onBack={() => setView('MENU')} />;
      case 'ADMIN':
        if (!currentStore) return null;
        return (
          <AdminDashboard 
            slug={currentStore.slug}
            whatsappNumber={currentStore.whatsapp}
            isOpen={currentStore.isOpen}
            orders={currentStore.orders || []}
            onToggleStoreStatus={() => handleUpdateStoreSettings({ isOpen: !currentStore.isOpen })}
            onUpdateWhatsApp={(w) => handleUpdateStoreSettings({ whatsapp: w })}
            onUpdateStoreSettings={handleUpdateStoreSettings}
            onUpdateOrderStatus={async (id, s) => {
               const updatedOrders = currentStore.orders.map(o => o.id === id ? {...o, status: s} : o);
               await handleUpdateStoreSettings({ orders: updatedOrders });
            }}
            products={currentStore.products || []}
            categories={currentStore.categories || ['Hambúrgueres', 'Acompanhamentos', 'Bebidas']}
            onAddProduct={() => { setEditingProduct(null); setView('PRODUCT_FORM'); }}
            onEditProduct={(p) => { setEditingProduct(p); setView('PRODUCT_FORM'); }}
            onDeleteProduct={async (id) => {
               const updated = currentStore.products.filter(p => p.id !== id);
               await handleUpdateStoreSettings({ products: updated });
            }}
            onToggleAvailability={() => {}}
            onBack={() => setView('MENU')}
            onUpdatePassword={(p) => handleUpdateStoreSettings({ adminPassword: p })}
            onManualSync={() => syncStoreToCloud(currentStore)}
            isSyncing={isSyncing}
          />
        );
      case 'PRODUCT_FORM':
        return (
          <ProductForm 
            categories={currentStore?.categories || ['Hambúrgueres', 'Acompanhamentos', 'Bebidas']} 
            product={editingProduct} 
            onSave={async (p) => {
              let updatedProducts;
              if (p.id === 'new') {
                updatedProducts = [...(currentStore?.products || []), {...p, id: Date.now().toString()}];
              } else {
                updatedProducts = currentStore?.products.map(x => x.id === p.id ? p : x) || [];
              }
              await handleUpdateStoreSettings({ products: updatedProducts });
              setView('ADMIN');
            }} 
            onCancel={() => setView('ADMIN')} 
          />
        );
      default:
        return <HomeView onRegister={() => setView('REGISTER')} onSaaSAdmin={() => setView('SAAS_LOGIN')} />;
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 font-sans">
      {renderView()}
    </div>
  );
};

export default App;
