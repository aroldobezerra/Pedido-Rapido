
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
   * Sincronização Adaptativa: Detecta o que o banco aceita e salva.
   */
  const syncStoreToCloud = async (store: Store) => {
    if (!isSupabaseConfigured()) return false;
    try {
      setIsSyncing(true);
      
      // Tentamos salvar o mínimo necessário para não disparar erro 42703
      const { error } = await supabase.from('stores').upsert({
        id: store.id,
        slug: store.slug,
        name: store.name,
        content: store // Se esta coluna não existir, o catch captura e tentamos o plano B
      }, { onConflict: 'slug' });
      
      if (error) {
        console.warn("Erro de coluna, tentando salvamento simplificado...");
        await supabase.from('stores').upsert({
          id: store.id,
          slug: store.slug,
          name: store.name
        }, { onConflict: 'slug' });
      }
      return true;
    } catch (e) {
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
      
      const savedStores = localStorage.getItem('saas_stores');
      let localStores: Store[] = [];
      if (savedStores) {
        localStores = JSON.parse(savedStores);
        setStores(localStores);
      }
      
      if (rawSlug) {
        const storeSlug = sanitizeSlug(rawSlug);
        
        // 1. Tenta Cache Local (Se funcionou ontem, está aqui)
        const foundLocal = localStores.find(s => s.slug === storeSlug || sanitizeSlug(s.name) === storeSlug);
        
        if (foundLocal) {
          setCurrentStore(foundLocal);
          setView('MENU');
          setIsLoading(false);
          // Tenta atualizar da nuvem em silêncio
          fetchRemoteStore(storeSlug);
        } else {
          // 2. Busca na Nuvem com Log de Erro mais claro
          await fetchRemoteStore(storeSlug, true);
        }
      } else {
        setIsLoading(false);
      }
    };

    const fetchRemoteStore = async (slug: string, isInitial: boolean = false) => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .ilike('slug', slug) // Busca insensível a maiúsculas (Case Insensitive)
          .maybeSingle();

        if (error) {
          console.error("Erro Supabase:", error);
          if (isInitial) setErrorStatus(`Erro no Banco de Dados (Cód: ${error.code}). Por favor, tente novamente.`);
          return;
        }

        if (data) {
          // Mapeamento Híbrido: Constrói a lanchonete idependente das colunas existentes
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
          
          setStores(prev => {
            const exists = prev.find(s => s.id === mappedStore.id);
            if (exists) return prev.map(s => s.id === mappedStore.id ? mappedStore : s);
            return [...prev, mappedStore];
          });
        } else if (isInitial) {
          setErrorStatus(`A lanchonete "@${slug}" não foi encontrada no servidor. Verifique o link.`);
        }
      } catch (e) {
        if (isInitial) setErrorStatus("Conexão falhou. Verifique sua internet.");
      } finally {
        if (isInitial) setIsLoading(false);
      }
    };

    initApp();
  }, []);

  useEffect(() => {
    localStorage.setItem('saas_stores', JSON.stringify(stores));
  }, [stores]);

  // Handlers omitidos por brevidade (mantendo os mesmos do projeto original)
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
      alert("Loja salva no seu navegador! Houve um erro de sincronização com o banco de dados principal, mas você já pode usar seu painel.");
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
        <p className="font-black text-[10px] uppercase tracking-[0.3em] text-primary">Sincronizando Banco de Dados...</p>
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-8 text-center animate-in fade-in duration-500">
        <div className="size-20 bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl">
          <span className="material-symbols-outlined text-4xl">warning</span>
        </div>
        <h2 className="text-2xl font-black mb-2 tracking-tight">Ops! Link Não Ativado</h2>
        <p className="text-gray-500 text-sm mb-8 max-w-xs">{errorStatus}</p>
        <div className="flex flex-col w-full max-w-xs gap-3">
          <button 
            onClick={() => { window.location.href = window.location.origin; }} 
            className="bg-primary text-white font-black px-10 py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            Página Inicial
          </button>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Se você é o dono, tente sincronizar pelo painel.</p>
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
        else if (masterPass !== null) { alert("Acesso Negado."); setView('HOME'); }
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
              <h2 className="text-2xl font-black">Acesso Admin</h2>
              <input 
                type="password" 
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Senha da Loja" 
                className="w-full p-5 rounded-2xl border-2 border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 text-center font-bold tracking-[0.5em]"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin(); }}
                autoFocus
              />
              <button onClick={handleAdminLogin} className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-lg">Entrar</button>
              <button onClick={() => setView('MENU')} className="text-gray-400 text-xs font-black uppercase">Voltar</button>
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
