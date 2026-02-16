
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

  /**
   * Sincroniza a loja com a nuvem de forma segura.
   * Removido 'updated_at' para evitar erro 42703 (coluna inexistente).
   */
  const syncStoreToCloud = async (store: Store) => {
    if (!isSupabaseConfigured()) return false;
    try {
      setIsSyncing(true);
      // Usando apenas colunas essenciais que existem por padrão em tabelas de integração rápida
      const { error } = await supabase.from('stores').upsert({ 
        id: store.id, 
        slug: store.slug, 
        content: store
      }, { onConflict: 'slug' });
      
      if (error) {
        console.error("Erro Supabase:", error.message);
        throw error;
      }
      return true;
    } catch (e) {
      console.error("Falha na sincronização crítica:", e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Inicialização do App com foco em Roteamento Robusto
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      setErrorStatus(null);
      
      const urlParams = new URLSearchParams(window.location.search);
      const rawSlug = urlParams.get('s');
      
      const savedStores = localStorage.getItem('saas_stores');
      let localStores: Store[] = [];
      if (savedStores) {
        localStores = JSON.parse(savedStores);
        setStores(localStores);
      }
      
      if (rawSlug) {
        const storeSlug = sanitizeSlug(rawSlug);
        
        // 1. Tenta encontrar localmente primeiro (UX instantânea para o dono)
        const foundLocal = localStores.find(s => s.slug === storeSlug);
        
        if (foundLocal) {
          setCurrentStore(foundLocal);
          setView('MENU');
          setIsLoading(false);
        } else {
          // 2. Busca na Nuvem com tratamento de erro específico para colunas (42703)
          try {
            const { data, error } = await supabase
              .from('stores')
              .select('content')
              .eq('slug', storeSlug)
              .maybeSingle();
            
            if (error) {
              console.error("Erro de busca remota:", error);
              setErrorStatus(`Erro no servidor de dados (Cód: ${error.code}). Por favor, contate o suporte.`);
            } else if (data) {
              const remoteStore = data.content as Store;
              setCurrentStore(remoteStore);
              setView('MENU');
            } else {
              setErrorStatus(`A lanchonete "@${storeSlug}" ainda não foi publicada ou o link está incorreto.`);
            }
          } catch (e) {
            setErrorStatus("Conexão interrompida. Verifique sua internet.");
          } finally {
            setIsLoading(false);
          }
        }
      } else {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  // Persistência local rápida
  useEffect(() => {
    localStorage.setItem('saas_stores', JSON.stringify(stores));
  }, [stores]);

  // Handlers de Negócio
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

    if (success) {
      setStores(prev => [...prev, store]);
      setCurrentStore(store);
      setView('ADMIN');
    } else {
      alert("ATENÇÃO: Sua loja foi criada localmente, mas não conseguimos ativar seu link online devido a uma falha de sincronização. Tente sincronizar manualmente no painel.");
      setStores(prev => [...prev, store]);
      setCurrentStore(store);
      setView('ADMIN');
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

  // Renderização condicional de estados globais
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-6">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black text-[10px] uppercase tracking-[0.3em] text-primary animate-pulse">Sincronizando Dados...</p>
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-8 text-center animate-in fade-in duration-700">
        <div className="size-24 bg-red-500/10 text-red-500 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-red-500/5">
          <span className="material-symbols-outlined text-5xl">error_outline</span>
        </div>
        <h2 className="text-2xl font-black mb-2 tracking-tight">Ops! Link Não Ativado</h2>
        <p className="text-gray-500 font-medium mb-8 max-w-xs leading-relaxed">{errorStatus}</p>
        <div className="flex flex-col w-full max-w-xs gap-3">
          <button 
            onClick={() => { window.location.href = window.location.origin; }} 
            className="bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            Página Inicial
          </button>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Se você é o dono, verifique a sincronização no seu painel.</p>
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
        const masterPass = prompt("Senha Mestre da Plataforma:");
        if (masterPass === saasPassword) setView('SAAS_ADMIN');
        else if (masterPass !== null) { alert("Senha incorreta."); setView('HOME'); }
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
              <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
                 <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">Acesso Gerencial</h2>
              <div className="w-full space-y-4">
                <input 
                  type="password" 
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Sua senha de acesso" 
                  className="w-full p-5 rounded-2xl border-2 border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 focus:border-primary/50 outline-none text-center font-bold tracking-[0.5em]"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin(); }}
                  autoFocus
                />
                <button onClick={handleAdminLogin} className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-widest text-sm">Entrar no Painel</button>
              </div>
              <button onClick={() => setView('MENU')} className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors">Voltar ao Cardápio</button>
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
