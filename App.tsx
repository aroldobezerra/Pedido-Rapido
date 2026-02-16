
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
  
  const [saasPassword, setSaasPassword] = useState(() => {
    return localStorage.getItem('saas_master_pass') || 'admin123';
  });

  // Carregar dados iniciais e lidar com links diretos (?s=slug)
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      
      // 1. Carrega lojas locais (do dono do dispositivo)
      const savedStores = localStorage.getItem('saas_stores');
      let localStores: Store[] = [];
      if (savedStores) {
        localStores = JSON.parse(savedStores);
        setStores(localStores);
      }
      
      // 2. Verifica se há um slug na URL para link direto
      const urlParams = new URLSearchParams(window.location.search);
      const storeSlug = urlParams.get('s');
      
      if (storeSlug) {
        // Busca primeiro localmente (mais rápido)
        const foundLocal = localStores.find(s => s.slug === storeSlug);
        if (foundLocal) {
          setCurrentStore(foundLocal);
          setView('MENU');
        } else if (isSupabaseConfigured()) {
          // Busca no banco de dados global se não encontrar localmente
          try {
            const { data, error } = await supabase
              .from('stores')
              .select('content')
              .eq('slug', storeSlug)
              .single();
            
            if (data && !error) {
              const remoteStore = data.content as Store;
              setCurrentStore(remoteStore);
              setView('MENU');
            }
          } catch (e) {
            console.error("Erro ao buscar loja remota:", e);
          }
        }
      }
      
      setIsLoading(false);
    };

    initApp();
  }, []);

  // Persistir alterações de lojas localmente e no Supabase
  useEffect(() => {
    localStorage.setItem('saas_stores', JSON.stringify(stores));
    
    // Sincronização em background com Supabase (se configurado)
    if (isSupabaseConfigured() && stores.length > 0) {
      const syncStores = async () => {
        for (const store of stores) {
          await supabase
            .from('stores')
            .upsert({ 
              id: store.id, 
              slug: store.slug, 
              content: store, 
              updated_at: new Date() 
            }, { onConflict: 'slug' });
        }
      };
      syncStores();
    }
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
        return prev.map(item => item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
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
  };

  const handleSaveProduct = (product: Product) => {
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
  };

  const handleDeleteProduct = (productId: string) => {
    if (!currentStore) return;
    const updatedProducts = (currentStore.products || []).filter(p => p.id !== productId);
    const updatedStore = { ...currentStore, products: updatedProducts };
    setStores(prev => prev.map(s => s.id === currentStore.id ? updatedStore : s));
    setCurrentStore(updatedStore);
  };

  const handleRegisterStore = (store: Store) => {
    setStores(prev => [...prev, store]);
    setCurrentStore(store);
    setView('ADMIN');
  };

  const handleUpdateStoreSettings = (settings: any) => {
    if (!currentStore) return;
    let updatedStore = { ...currentStore, ...settings };
    
    if (settings._categoryAdd) {
      const cats = currentStore.categories || ['Hambúrgueres', 'Acompanhamentos', 'Bebidas'];
      updatedStore.categories = [...cats, settings._categoryAdd];
      delete updatedStore._categoryAdd;
    }
    
    setStores(prev => prev.map(s => s.id === currentStore.id ? updatedStore : s));
    setCurrentStore(updatedStore);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black text-sm uppercase tracking-widest text-primary">Carregando Cardápio...</p>
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
        else if (masterPass !== null) { alert("Senha incorreta. Tente 'admin123'"); setView('HOME'); }
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
            <h2 className="text-2xl font-black mb-6">Login Administrativo</h2>
            <input 
              type="password" 
              placeholder="Senha da Loja" 
              className="w-full max-w-xs p-4 rounded-2xl border mb-4 bg-white dark:bg-white/10"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.currentTarget.value === currentStore?.adminPassword) setView('ADMIN');
                  else alert("Senha incorreta");
                }
              }}
            />
            <button onClick={() => setView('MENU')} className="text-gray-400 font-bold uppercase text-xs">Voltar</button>
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
            onBack={() => setView('HOME')}
          />
        );
      case 'CART':
        return (
          <CartView 
            items={cart}
            updateQuantity={handleUpdateQuantity}
            clearCart={() => setCart([])}
            onBack={() => setView('MENU')}
            onProceed={(meta) => { 
              setActiveOrder({ ...meta, items: cart, total: subtotal } as Order); 
              setView('REVIEW'); 
            }}
            subtotal={subtotal}
          />
        );
      case 'REVIEW':
        if (!activeOrder) return null;
        return (
          <OrderReview 
            items={cart}
            customerName={activeOrder.customerName}
            address={activeOrder.address || ''}
            method={activeOrder.deliveryMethod}
            tableNumber={activeOrder.tableNumber}
            pickupTime={activeOrder.pickupTime}
            orderNotes={activeOrder.notes}
            onBack={() => setView('CART')}
            onConfirm={(msg) => handlePlaceOrder({ ...activeOrder, notes: msg })}
            subtotal={subtotal}
          />
        );
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
          />
        );
      case 'PRODUCT_FORM':
        return (
          <ProductForm 
            categories={currentStore?.categories || ['Hambúrgueres', 'Acompanhamentos', 'Bebidas']}
            product={editingProduct}
            onSave={handleSaveProduct}
            onCancel={() => setView('ADMIN')}
          />
        );
      default:
        return <HomeView onRegister={() => setView('REGISTER')} onSaaSAdmin={() => setView('SAAS_LOGIN')} />;
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      {renderView()}
    </div>
  );
};

export default App;
