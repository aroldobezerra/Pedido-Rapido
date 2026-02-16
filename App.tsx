
import React, { useState, useEffect, useMemo } from 'react';
import { Product, CartItem, Order, AppView, Store, OrderStatus } from './types';
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

  // Função central de sincronização com a Nuvem
  const syncStoreToCloud = async (store: Store) => {
    if (!isSupabaseConfigured()) return false;
    try {
      setIsSyncing(true);
      const { error } = await supabase.from('stores').upsert({ 
        id: store.id, 
        slug: store.slug, 
        content: store, 
        updated_at: new Date() 
      }, { onConflict: 'slug' });
      
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Erro na sincronização:", e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Inicialização do App com foco em Roteamento de SaaS
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      setErrorStatus(null);
      
      const urlParams = new URLSearchParams(window.location.search);
      const storeSlug = urlParams.get('s');

      const savedStores = localStorage.getItem('saas_stores');
      let localStores: Store[] = [];
      if (savedStores) {
        localStores = JSON.parse(savedStores);
        setStores(localStores);
      }
      
      if (storeSlug) {
        // Busca local primeiro
        const foundLocal = localStores.find(s => s.slug === storeSlug);
        
        if (foundLocal) {
          setCurrentStore(foundLocal);
          setView('MENU');
          setIsLoading(false);
        } else {
          // Busca OBRIGATÓRIA no Supabase
          try {
            const { data, error } = await supabase
              .from('stores')
              .select('content')
              .eq('slug', storeSlug)
              .maybeSingle();
            
            if (data && !error) {
              const remoteStore = data.content as Store;
              setCurrentStore(remoteStore);
              setView('MENU');
            } else {
              setErrorStatus(`A lanchonete "@${storeSlug}" não foi encontrada em nossa base. Verifique se o link está correto.`);
            }
          } catch (e) {
            setErrorStatus("Erro de conexão. Verifique sua internet.");
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

  // Persistência local (rápida)
  useEffect(() => {
    localStorage.setItem('saas_stores', JSON.stringify(stores));
  }, [stores]);

  useEffect(() => {
    localStorage.setItem('saas_master_pass', saasPassword);
  }, [saasPassword]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }, [cart]);

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
      total: subtotal + (orderMeta.deliveryMethod === 'Delivery' ? 5 : 0)
    };

    const updatedStore = { ...currentStore, orders: [...(currentStore.orders || []), newOrder] };
    setStores(prev => prev.map(s => s.id === currentStore.id ? updatedStore : s));
    setCurrentStore(updatedStore);
    syncStoreToCloud(updatedStore); // Sincroniza pedido novo
    setActiveOrder(newOrder);
    setCart([]);
    setView('TRACK');

    if (orderMeta.notes && orderMeta.notes.includes('🍔')) {
       const phone = currentStore.whatsapp;
       const url = `https://wa.me/${phone}?text=${encodeURIComponent(orderMeta.notes)}`;
       window.open(url, '_blank');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (!currentStore) return;
    const updatedOrders = (currentStore.orders || []).map(o => o.id === orderId ? { ...o, status } : o);
    const updatedStore = { ...currentStore, orders: updatedOrders };
    setStores(prev => prev.map(s => s.id === currentStore.id ? updatedStore : s));
    setCurrentStore(updatedStore);
    await syncStoreToCloud(updatedStore);
  };

  const handleSaveProduct = async (product: Product) => {
    if (!currentStore) return;
    let updatedProducts;
    if (product.id === 'new') {
      const newProduct = { ...product, id: Date.now().toString() };
      updatedProducts = [...(currentStore.products || []), newProduct];
    } else {
      updatedProducts = (currentStore.products || []).map(p => p.id === product.id ? product : p);
    }
    const updatedStore = { ...currentStore, products: updatedProducts };
    setStores(prev => prev.map(s => s.id === currentStore.id ? updatedStore : s));
    setCurrentStore(updatedStore);
    setView('ADMIN');
    await syncStoreToCloud(updatedStore);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!currentStore) return;
    const updatedProducts = (currentStore.products || []).filter(p => p.id !== productId);
    const updatedStore = { ...currentStore, products: updatedProducts };
    setStores(prev => prev.map(s => s.id === currentStore.id ? updatedStore : s));
    setCurrentStore(updatedStore);
    await syncStoreToCloud(updatedStore);
  };

  const handleRegisterStore = async (store: Store) => {
    const success = await syncStoreToCloud(store);
    if (success) {
      setStores(prev => [...prev, store]);
      setCurrentStore(store);
      setView('ADMIN');
    } else {
      alert("Erro ao salvar na nuvem. Verifique sua conexão e tente novamente.");
    }
  };

  const handleUpdateStoreSettings = async (settings: any) => {
    if (!currentStore) return;
    let updatedStore = { ...currentStore, ...settings };
    if (settings._categoryAdd) {
      const cats = currentStore.categories || ['Hambúrgueres', 'Acompanhamentos', 'Bebidas'];
      updatedStore.categories = [...cats, settings._categoryAdd];
      delete updatedStore._categoryAdd;
    }
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black text-xs uppercase tracking-[0.3em] text-primary">Conectando ao Cardápio...</p>
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-8 text-center animate-in fade-in duration-500">
        <div className="size-24 bg-red-500/10 text-red-500 rounded-[2.5rem] flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl">error_outline</span>
        </div>
        <h2 className="text-2xl font-black mb-2">Ops! Link Inválido</h2>
        <p className="text-gray-500 font-medium mb-8 max-w-xs">{errorStatus}</p>
        <button 
          onClick={() => { window.location.href = window.location.origin; }} 
          className="bg-primary text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          Voltar para Início
        </button>
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
          <div className="flex flex-col items-center justify-center h-screen p-8 bg-background-light dark:bg-background-dark animate-in fade-in duration-500">
            <div className="w-full max-w-sm flex flex-col items-center space-y-8">
              <div className="text-center">
                <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                  <span className="material-symbols-outlined text-3xl">lock</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight">Login Administrativo</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Acesso Restrito à Gerência</p>
              </div>
              <div className="w-full space-y-4">
                <input 
                  type="password" 
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Senha da Loja" 
                  className="w-full p-5 rounded-2xl border-2 border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 focus:border-primary/50 outline-none transition-all text-center font-bold tracking-[0.5em]"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin(); }}
                  autoFocus
                />
                <button 
                  onClick={handleAdminLogin}
                  className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-widest text-sm"
                >
                  Entrar no Painel
                </button>
              </div>
              <button onClick={() => setView('MENU')} className="text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-primary transition-colors">Voltar ao Cardápio</button>
            </div>
          </div>
        );
      case 'MENU':
        if (!currentStore) return <HomeView onRegister={() => setView('REGISTER')} onSaaSAdmin={() => setView('SAAS_LOGIN')} />;
        return (
          <CustomerMenu 
            storeName={currentStore.name}
            isOpen={currentStore.isOpen}
            products={currentStore.products || []}
            categories={currentStore.categories || ['Hambúrgueres', 'Acompanhamentos', 'Bebidas']}
            onAddToCart={handleAddToCart}
            cartCount={cart.length}
            subtotal={subtotal}
            onViewCart={() => setView('CART')}
            onViewAdmin={() => setView('ADMIN_LOGIN')}
            onBack={() => { window.location.href = window.location.origin; }}
          />
        );
      case 'CART':
        return <CartView items={cart} updateQuantity={handleUpdateQuantity} clearCart={() => setCart([])} onBack={() => setView('MENU')} onProceed={(meta) => { setActiveOrder({ ...meta, items: cart, total: subtotal } as Order); setView('REVIEW'); }} subtotal={subtotal} />;
      case 'REVIEW':
        if (!activeOrder) return null;
        return <OrderReview items={cart} customerName={activeOrder.customerName} address={activeOrder.address || ''} method={activeOrder.deliveryMethod} tableNumber={activeOrder.tableNumber} pickupTime={activeOrder.pickupTime} orderNotes={activeOrder.notes} onBack={() => setView('CART')} onConfirm={(msg) => handlePlaceOrder({ ...activeOrder, notes: msg })} subtotal={subtotal} />;
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
            onUpdateOrderStatus={handleUpdateOrderStatus}
            products={currentStore.products || []}
            categories={currentStore.categories || ['Hambúrgueres', 'Acompanhamentos', 'Bebidas']}
            onAddProduct={() => { setEditingProduct(null); setView('PRODUCT_FORM'); }}
            onEditProduct={(p) => { setEditingProduct(p); setView('PRODUCT_FORM'); }}
            onDeleteProduct={handleDeleteProduct}
            onToggleAvailability={(id) => {
              const p = currentStore.products.find(x => x.id === id);
              if (p) handleSaveProduct({ ...p, isAvailable: !p.isAvailable });
            }}
            onBack={() => setView('MENU')}
            onUpdatePassword={(p) => handleUpdateStoreSettings({ adminPassword: p })}
            onManualSync={() => syncStoreToCloud(currentStore)}
            isSyncing={isSyncing}
          />
        );
      case 'PRODUCT_FORM':
        return <ProductForm categories={currentStore?.categories || ['Hambúrgueres', 'Acompanhamentos', 'Bebidas']} product={editingProduct} onSave={handleSaveProduct} onCancel={() => setView('ADMIN')} />;
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
