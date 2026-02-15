
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, CartItem, Order, AppView, Category, Store, OrderStatus } from './types';
import CustomerMenu from './views/CustomerMenu';
import CartView from './views/CartView';
import OrderReview from './views/OrderReview';
import OrderTracking from './views/OrderTracking';
import AdminDashboard from './views/AdminDashboard';
import ProductForm from './views/ProductForm';
import HomeView from './views/HomeView';
import RegisterStore from './views/RegisterStore';
import SaaSAdminDashboard from './views/SaaSAdminDashboard';
import { supabase, isSupabaseConfigured, getMissingConfigKeys } from './services/supabaseClient';

const DEFAULT_CATEGORIES = Object.values(Category) as string[];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('HOME');
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [saasPassword, setSaasPassword] = useState('admin');
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [storeNotFound, setStoreNotFound] = useState(false);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  
  const [sessionCategories, setSessionCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderMetadata, setOrderMetadata] = useState<Partial<Order>>({
    address: '',
    deliveryMethod: 'Delivery',
    customerName: '',
    notes: '',
    tableNumber: '',
    pickupTime: ''
  });

  const formatTimestamp = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const mapProduct = (p: any): Product => ({
    ...p,
    id: String(p.id),
    isAvailable: p.is_available ?? p.isAvailable ?? true,
    trackInventory: p.track_inventory ?? p.trackInventory ?? false,
    extras: p.extras || [],
    category: p.category
  });

  const mapOrder = (o: any): Order => ({
    ...o,
    id: String(o.id),
    timestamp: o.created_at ? formatTimestamp(o.created_at) : '00:00',
    customerName: o.customer_name,
    deliveryMethod: o.delivery_method,
    tableNumber: o.table_number,
    pickupTime: o.pickup_time
  });

  // Carregamento inicial do App
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setMissingKeys(getMissingConfigKeys());
      setConfigError(true);
      setIsLoading(false);
      return;
    }

    const initApp = async () => {
      setIsLoading(true);
      try {
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('*, products(*), orders(*)');
        
        if (storesError) console.error("Erro Supabase:", storesError);
        
        const allStores = (storesData || []).map((s: any) => ({
          ...s,
          adminPassword: s.admin_password || s.adminPassword || "", 
          customDomain: s.custom_domain || "",
          isOpen: s.is_open ?? true,
          products: (s.products || []).map(mapProduct),
          orders: (s.orders || []).map(mapOrder).sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        }));
        
        setStores(allStores);

        const params = new URLSearchParams(window.location.search);
        const slug = params.get('s')?.toLowerCase().trim();

        if (slug) {
          const store = allStores.find(s => s.slug === slug);
          if (store) {
            setCurrentStore(store);
            setView('MENU');
          } else {
            setStoreNotFound(true);
            setView('HOME');
          }
        }

        const { data: configData } = await supabase.from('saas_config').select('value').eq('key', 'master_password').maybeSingle();
        if (configData) setSaasPassword(configData.value);

      } catch (e) {
        console.error("Erro crítico na inicialização:", e);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  // Escuta de pedidos em tempo real (Realtime)
  useEffect(() => {
    if (!currentStore) return;

    const channel = supabase
      .channel(`orders-store-${currentStore.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${currentStore.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = mapOrder(payload.new);
            setCurrentStore(prev => {
              if (!prev) return null;
              if (prev.orders.some(o => o.id === newOrder.id)) return prev;
              return { ...prev, orders: [newOrder, ...prev.orders] };
            });
            // Som de notificação mais estável
            if (view === 'ADMIN' && isAdminLoggedIn) {
               try { new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_7302f37c42.mp3').play().catch(() => {}); } catch(e){}
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = mapOrder(payload.new);
            setCurrentStore(prev => {
              if (!prev) return null;
              return {
                ...prev,
                orders: prev.orders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
              };
            });
            if (currentOrder && currentOrder.id === updatedOrder.id) {
              setCurrentOrder(updatedOrder);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStore?.id, view, isAdminLoggedIn, currentOrder?.id]);

  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    if (!currentStore) return;
    
    // 1. Atualiza no Banco
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    
    if (error) {
      alert("Erro ao atualizar status: " + error.message);
      return;
    }

    // 2. Atualiza no Estado Local Imediatamente (Fallback se Realtime falhar)
    setCurrentStore(prev => {
      if (!prev) return null;
      return {
        ...prev,
        orders: prev.orders.map(o => o.id === id ? { ...o, status } : o)
      };
    });
  };

  const handleDeleteProduct = async (id: string) => {
    if (!currentStore) return;
    if (!confirm("Deseja excluir este produto permanentemente?")) return;

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }

    // Atualiza localmente
    setCurrentStore(prev => {
      if (!prev) return null;
      return {
        ...prev,
        products: prev.products.filter(p => p.id !== id)
      };
    });
  };

  const handleConfirmOrder = async (message: string) => {
    if (!currentStore) return;

    const total = subtotal + (orderMetadata.deliveryMethod === 'Delivery' ? 5 : 0);
    
    const dbOrderPayload = {
      store_id: currentStore.id,
      customer_name: orderMetadata.customerName,
      delivery_method: orderMetadata.deliveryMethod,
      address: orderMetadata.address || null,
      table_number: orderMetadata.table_number || orderMetadata.tableNumber || null,
      pickup_time: orderMetadata.pickupTime || null,
      notes: orderMetadata.notes || null,
      items: cart,
      total: total,
      status: 'Received'
    };

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([dbOrderPayload])
        .select()
        .single();

      if (error) throw error;

      const phone = currentStore.whatsapp.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(message);
      window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');

      const finalOrder = mapOrder(data);
      setCurrentOrder(finalOrder);
      setCart([]);
      setView('TRACK');
    } catch (err: any) {
      console.error("Erro ao salvar pedido:", err);
      alert("Não conseguimos enviar seu pedido para a cozinha: " + (err.message || "Erro desconhecido"));
    }
  };

  const handleUpdateStoreStatus = async (isOpen: boolean) => {
    if (!currentStore) return;
    const { error } = await supabase.from('stores').update({ is_open: isOpen }).eq('id', currentStore.id);
    if (!error) {
      const updatedStore = { ...currentStore, isOpen };
      setCurrentStore(updatedStore);
      setStores(prev => prev.map(s => s.id === currentStore.id ? updatedStore : s));
    } else {
      alert("Erro ao atualizar status: " + error.message);
    }
  };

  const handleUpdateStoreSettings = async (updates: any) => {
    if (!currentStore) return;
    
    if (updates._categoryMapping) {
      const { oldName, newName } = updates._categoryMapping;
      const { error: batchError } = await supabase
        .from('products')
        .update({ category: newName })
        .eq('store_id', currentStore.id)
        .eq('category', oldName);
      
      if (batchError) { alert("Erro ao renomear produtos: " + batchError.message); return; }
      setSessionCategories(prev => prev.map(c => c === oldName ? newName : c));
      const { data: refreshed } = await supabase.from('products').select('*').eq('store_id', currentStore.id);
      if (refreshed) {
        const mapped = refreshed.map(mapProduct);
        const updatedStore = { ...currentStore, products: mapped };
        setCurrentStore(updatedStore);
        setStores(prev => prev.map(s => s.id === currentStore.id ? updatedStore : s));
      }
      return;
    }

    if (updates._categoryDelete) {
      const { catName } = updates._categoryDelete;
      await supabase.from('products').update({ category: 'Sem Categoria' }).eq('store_id', currentStore.id).eq('category', catName);
      setSessionCategories(prev => prev.filter(c => c !== catName));
      const { data: refreshed } = await supabase.from('products').select('*').eq('store_id', currentStore.id);
      if (refreshed) {
        const mapped = refreshed.map(mapProduct);
        setCurrentStore({ ...currentStore, products: mapped });
      }
      return;
    }

    if (updates._categoryAdd) {
      setSessionCategories(prev => Array.from(new Set([...prev, updates._categoryAdd])));
      return;
    }

    const dbUpdates: any = {};
    if (updates.whatsapp) dbUpdates.whatsapp = updates.whatsapp;
    if (updates.adminPassword) dbUpdates.admin_password = updates.adminPassword;
    
    const { error } = await supabase.from('stores').update(dbUpdates).eq('id', currentStore.id);
    if (!error) {
      const updatedStore = { ...currentStore, ...updates };
      setCurrentStore(updatedStore);
      setStores(prev => prev.map(s => s.id === currentStore.id ? updatedStore : s));
    }
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0), [cart]);

  const derivedCategories = useMemo(() => {
    if (!currentStore) return DEFAULT_CATEGORIES;
    const fromProducts = Array.from(new Set(currentStore.products.map(p => p.category).filter(Boolean)));
    const combined = Array.from(new Set([...fromProducts, ...sessionCategories]));
    return combined.length > 0 ? combined : DEFAULT_CATEGORIES;
  }, [currentStore?.products, sessionCategories]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark"><div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans text-[#1c140d] dark:text-[#fcfaf8]">
      {view === 'HOME' && <HomeView onRegister={() => setView('REGISTER')} onSaaSAdmin={() => { setLoginError(''); setView('SAAS_LOGIN'); }} />}
      {view === 'SAAS_LOGIN' && (
        <div className="min-h-screen flex items-center justify-center p-6">
           <div className="max-w-xs w-full space-y-6">
              <h2 className="text-2xl font-black text-primary text-center">Admin Master</h2>
              <input type="password" value={loginPassword} onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }} placeholder="Senha Master" className="w-full p-4 rounded-2xl border bg-white dark:bg-white/5 border-primary/20" />
              <button onClick={() => { if(loginPassword.trim() === saasPassword) { setView('SAAS_ADMIN'); setLoginPassword(''); } else setLoginError('Senha Incorreta'); }} className="w-full bg-primary text-white font-black py-4 rounded-2xl">Entrar</button>
              <button onClick={() => setView('HOME')} className="w-full text-xs font-bold text-gray-400">Voltar</button>
           </div>
        </div>
      )}

      {view === 'SAAS_ADMIN' && <SaaSAdminDashboard stores={stores} saasPassword={saasPassword} onUpdateSaaSPassword={(p) => supabase.from('saas_config').upsert({key: 'master_password', value: p})} onDeleteStore={(id) => supabase.from('stores').delete().eq('id', id)} onUpdateStorePassword={(id, p) => {
        supabase.from('stores').update({ admin_password: p }).eq('id', id).then(() => {
           setStores(prev => prev.map(s => s.id === id ? {...s, adminPassword: p} : s));
        });
      }} onBack={() => setView('HOME')} onViewStore={(s) => { setCurrentStore(s); setView('MENU'); }} />}
      
      {view === 'REGISTER' && <RegisterStore onRegister={() => setView('MENU')} onCancel={() => setView('HOME')} />}

      {view === 'MENU' && currentStore && (
        <CustomerMenu 
          storeName={currentStore.name} isOpen={currentStore.isOpen} products={currentStore.products} 
          categories={derivedCategories}
          onAddToCart={(p) => { if(!currentStore.isOpen) return; setCart(prev => { const ex = prev.find(i => i.product.id === p.id); if(ex) return prev.map(i => i.product.id === p.id ? {...i, quantity: i.quantity + 1} : i); return [...prev, {product: p, quantity: 1, selectedExtras: []}]; }); }} 
          cartCount={cart.reduce((a, b) => a + b.quantity, 0)} subtotal={subtotal} onViewCart={() => setView('CART')} onViewAdmin={() => { setLoginError(''); setView('ADMIN_LOGIN'); }} onBack={() => { setCurrentStore(null); window.history.pushState({}, '', window.location.pathname); setView('HOME'); }}
        />
      )}

      {view === 'CART' && <CartView items={cart} updateQuantity={(id, d) => setCart(prev => prev.map(i => i.product.id === id ? {...i, quantity: Math.max(0, i.quantity + d)} : i).filter(i => i.quantity > 0))} clearCart={() => setCart([])} onBack={() => setView('MENU')} onProceed={(m) => { setOrderMetadata(m); setView('REVIEW'); }} subtotal={subtotal} />}
      
      {view === 'REVIEW' && currentStore && (
        <OrderReview 
          items={cart} 
          customerName={orderMetadata.customerName || ''} 
          address={orderMetadata.address || ''} 
          method={orderMetadata.deliveryMethod || 'Delivery'} 
          tableNumber={orderMetadata.tableNumber}
          pickupTime={orderMetadata.pickupTime}
          orderNotes={orderMetadata.notes}
          onBack={() => setView('CART')} 
          onConfirm={handleConfirmOrder} 
          subtotal={subtotal} 
        />
      )}

      {view === 'TRACK' && currentOrder && (
        <OrderTracking order={currentOrder} onBack={() => { setCurrentOrder(null); setView('MENU'); }} />
      )}
      
      {view === 'ADMIN_LOGIN' && currentStore && (
        <div className="min-h-screen flex items-center justify-center p-6">
           <div className="max-w-xs w-full space-y-6">
              <h2 className="text-2xl font-black text-center">{currentStore.name}</h2>
              <input type="password" value={loginPassword} onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }} placeholder="Senha da Lanchonete" className="w-full p-4 rounded-2xl border bg-white dark:bg-white/5 border-primary/20" />
              {loginError && <p className="text-xs font-bold text-red-500 text-center">{loginError}</p>}
              <button onClick={() => { if(loginPassword.trim() === currentStore.adminPassword) { setIsAdminLoggedIn(true); setView('ADMIN'); setLoginPassword(''); } else setLoginError('Senha Incorreta!'); }} className="w-full bg-primary text-white font-black py-4 rounded-2xl">Acessar Cozinha</button>
              <button onClick={() => setView('MENU')} className="w-full text-xs font-bold text-gray-400 text-center block">Voltar ao Cardápio</button>
           </div>
        </div>
      )}

      {view === 'ADMIN' && currentStore && (
        <AdminDashboard 
          slug={currentStore.slug} whatsappNumber={currentStore.whatsapp} isOpen={currentStore.isOpen} orders={currentStore.orders || []} onToggleStoreStatus={() => handleUpdateStoreStatus(!currentStore.isOpen)} 
          onUpdateWhatsApp={(w) => handleUpdateStoreSettings({ whatsapp: w })} 
          onUpdateStoreSettings={(settings) => handleUpdateStoreSettings(settings)}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          products={currentStore.products} 
          categories={derivedCategories}
          onAddProduct={() => { setEditingProduct(null); setView('PRODUCT_FORM'); }} 
          onEditProduct={(p) => { setEditingProduct(p); setView('PRODUCT_FORM'); }} 
          onDeleteProduct={handleDeleteProduct}
          onToggleAvailability={() => {}} onBack={() => { setView('MENU'); setIsAdminLoggedIn(false); }}
          onUpdatePassword={(p) => handleUpdateStoreSettings({ adminPassword: p })}
        />
      )}

      {view === 'PRODUCT_FORM' && currentStore && <ProductForm categories={derivedCategories} product={editingProduct} onSave={async (p) => { 
        const dbData = { name: p.name, price: p.price, category: p.category, description: p.description, image: p.image, is_available: p.isAvailable, track_inventory: p.trackInventory, extras: p.extras, store_id: currentStore.id };
        const isNew = !p.id || p.id === 'new' || !p.id.includes('-');
        const { error } = isNew ? await supabase.from('products').insert([dbData]) : await supabase.from('products').update(dbData).eq('id', p.id);
        if(!error) { 
          const { data: refreshed } = await supabase.from('products').select('*').eq('store_id', currentStore.id);
          if (refreshed) {
            const mapped = refreshed.map(mapProduct);
            setCurrentStore({ ...currentStore, products: mapped });
          }
          setView('ADMIN'); 
        } else { alert("Erro ao salvar: " + error.message); }
      }} onCancel={() => setView('ADMIN')} />}
    </div>
  );
};

export default App;
