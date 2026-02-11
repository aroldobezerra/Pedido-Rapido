
import React, { useState, useEffect, useMemo } from 'react';
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

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('HOME');
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [saasPassword, setSaasPassword] = useState('admin');
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [storeNotFound, setStoreNotFound] = useState(false);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  
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

  // 1. Inicialização e Roteamento via Slug
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
        
        if (storesError) throw storesError;
        const allStores = storesData || [];
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

        const { data: configData } = await supabase
          .from('saas_config')
          .select('value')
          .eq('key', 'master_password')
          .maybeSingle();
        if (configData) setSaasPassword(configData.value);

      } catch (e) {
        console.error("Erro na inicialização:", e);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    if (currentStore && (view === 'MENU' || view === 'ADMIN')) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('s') !== currentStore.slug) {
        url.searchParams.set('s', currentStore.slug);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [currentStore, view]);

  // 2. CONFIGURAÇÃO REAL-TIME
  useEffect(() => {
    if (!isSupabaseConfigured() || configError) return;

    const ordersChannel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const newOrder = payload.new as Order;
        const oldOrder = payload.old as Order;
        const eventType = payload.eventType;

        setStores(prevStores => prevStores.map(s => {
          if (s.id === (newOrder?.store_id || oldOrder?.store_id)) {
            let updatedOrders = [...s.orders];
            if (eventType === 'INSERT') updatedOrders = [newOrder, ...updatedOrders];
            else if (eventType === 'UPDATE') updatedOrders = updatedOrders.map(o => o.id === newOrder.id ? { ...o, ...newOrder } : o);
            else if (eventType === 'DELETE') updatedOrders = updatedOrders.filter(o => o.id !== (oldOrder as any).id);
            return { ...s, orders: updatedOrders };
          }
          return s;
        }));

        if (currentStore && currentStore.id === (newOrder?.store_id || oldOrder?.store_id)) {
          setCurrentStore(prev => {
            if (!prev) return null;
            let updatedOrders = [...prev.orders];
            if (eventType === 'INSERT') updatedOrders = [newOrder, ...updatedOrders];
            else if (eventType === 'UPDATE') updatedOrders = updatedOrders.map(o => o.id === newOrder.id ? { ...o, ...newOrder } : o);
            return { ...prev, orders: updatedOrders };
          });
        }

        if (currentOrder && currentOrder.id === (newOrder?.id || (oldOrder as any)?.id)) {
          if (eventType === 'UPDATE') {
            setCurrentOrder(prev => prev ? { ...prev, ...newOrder } : null);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ordersChannel); };
  }, [currentStore?.id, currentOrder?.id, configError]);

  const handleRegisterStore = async (newStore: Store) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('stores').insert([{
        name: newStore.name,
        slug: newStore.slug,
        whatsapp: newStore.whatsapp,
        admin_password: newStore.adminPassword,
        is_open: true
      }]).select().single();
      
      if (error) throw error;

      await supabase.from('products').insert(newStore.products.map(p => ({
        store_id: data.id,
        name: p.name,
        price: p.price,
        category: p.category,
        description: p.description,
        image: p.image,
        is_available: true
      })));

      const { data: fullStore } = await supabase.from('stores').select('*, products(*), orders(*)').eq('id', data.id).single();
      if (fullStore) {
        setStores(prev => [...prev, fullStore]);
        setCurrentStore(fullStore);
        setView('MENU');
      }
    } catch (err) { alert("Erro ao registrar loja."); } 
    finally { setIsLoading(false); }
  };

  const handleUpdateStoreStatus = async (isOpen: boolean) => {
    if (!currentStore) return;
    const { error } = await supabase.from('stores').update({ is_open: isOpen }).eq('id', currentStore.id);
    if (!error) setCurrentStore({ ...currentStore, isOpen });
  };

  const handleUpdateStoreSettings = async (updates: { whatsapp?: string, admin_password?: string }) => {
    if (!currentStore) return;
    const { error } = await supabase.from('stores').update(updates).eq('id', currentStore.id);
    if (!error) {
      setCurrentStore({ ...currentStore, ...updates });
      alert("Configurações salvas com sucesso!");
    } else {
      alert("Erro ao salvar configurações.");
    }
  };

  const handleUpdateSaaSPassword = async (newPass: string) => {
    const { error } = await supabase.from('saas_config').upsert({ key: 'master_password', value: newPass });
    if (!error) {
      setSaasPassword(newPass);
    } else {
      alert("Erro ao atualizar senha master.");
    }
  };

  const handleDeleteStore = async (id: string) => {
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (!error) {
      setStores(prev => prev.filter(s => s.id !== id));
      alert("Lanchonete removida.");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  };

  const handlePlaceOrder = async (message: string) => {
    if (!currentStore) return;
    const deliveryFee = orderMetadata.deliveryMethod === 'Delivery' ? 5.0 : 0;
    const total = subtotal + deliveryFee;

    try {
      const { data: newOrder, error } = await supabase.from('orders').insert([{
        store_id: currentStore.id,
        items: cart,
        status: 'Received',
        customer_name: orderMetadata.customerName,
        delivery_method: orderMetadata.deliveryMethod,
        address: orderMetadata.address,
        table_number: orderMetadata.tableNumber,
        pickup_time: orderMetadata.pickupTime,
        notes: orderMetadata.notes,
        total: total
      }]).select().single();

      if (error) throw error;
      window.open(`https://wa.me/${currentStore.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
      setCurrentOrder({ ...newOrder, estimatedArrival: '20-30 min', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      setCart([]);
      setView('TRACK');
    } catch (e) { alert("Erro ao enviar pedido."); }
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0), [cart]);

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#1e1e1e] p-10 rounded-[3rem] border-2 border-primary/20 text-center shadow-2xl space-y-6">
          <span className="material-symbols-outlined text-6xl text-primary">warning</span>
          <div className="space-y-2">
            <h2 className="text-2xl font-black">Ambiente não configurado</h2>
            <p className="text-xs text-gray-500 font-medium px-4">Não conseguimos encontrar as chaves necessárias no seu painel da Vercel.</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl text-left space-y-3">
             <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Variáveis Faltando:</p>
             <ul className="space-y-2">
                {missingKeys.map(key => (
                  <li key={key} className="flex items-center gap-2 text-xs font-bold text-red-500">
                    <span className="material-symbols-outlined text-sm">close</span>
                    {key}
                  </li>
                ))}
             </ul>
          </div>

          <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
            Certifique-se de adicionar as chaves acima em <b>Settings > Environment Variables</b> na Vercel e fazer um <b>Redeploy</b>.
          </p>

          <button onClick={() => window.location.reload()} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-lg font-black text-primary uppercase tracking-[0.2em]">SnackDash AI</h2>
        </div>
      </div>
    );
  }

  if (storeNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <span className="material-symbols-outlined text-8xl text-gray-300">error</span>
          <h2 className="text-3xl font-black">Lanchonete não encontrada</h2>
          <p className="text-gray-500">Verifique se o link está correto.</p>
          <button onClick={() => { setStoreNotFound(false); setView('HOME'); window.history.replaceState({}, '', '/'); }} className="w-full bg-primary text-white font-black py-4 rounded-2xl">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans text-[#1c140d] dark:text-[#fcfaf8]">
      {view === 'HOME' && <HomeView onRegister={() => setView('REGISTER')} onSaaSAdmin={() => setView('SAAS_LOGIN')} />}
      
      {view === 'SAAS_LOGIN' && (
        <div className="min-h-screen flex items-center justify-center p-6">
           <div className="max-w-xs w-full space-y-6">
              <h2 className="text-2xl font-black text-center text-primary">Admin Master</h2>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Senha Master" className="w-full p-4 rounded-2xl border bg-white dark:bg-white/5 border-primary/20 outline-none" />
              <button onClick={() => { if(loginPassword === saasPassword) { setView('SAAS_ADMIN'); setLoginPassword(''); } else alert('Incorreta!'); }} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20">Acessar Painel</button>
              <button onClick={() => setView('HOME')} className="w-full text-xs font-bold uppercase tracking-widest text-gray-400">Voltar</button>
           </div>
        </div>
      )}

      {view === 'SAAS_ADMIN' && <SaaSAdminDashboard stores={stores} saasPassword={saasPassword} onUpdateSaaSPassword={handleUpdateSaaSPassword} onDeleteStore={handleDeleteStore} onBack={() => setView('HOME')} onViewStore={(s) => { setCurrentStore(s); setView('MENU'); }} />}
      {view === 'REGISTER' && <RegisterStore onRegister={handleRegisterStore} onCancel={() => setView('HOME')} />}

      {view === 'MENU' && currentStore && (
        <CustomerMenu 
          storeName={currentStore.name} isOpen={currentStore.isOpen} products={currentStore.products} 
          onAddToCart={(p) => { if(!currentStore.isOpen) return; setCart(prev => { const ex = prev.find(i => i.product.id === p.id); if(ex) return prev.map(i => i.product.id === p.id ? {...i, quantity: i.quantity + 1} : i); return [...prev, {product: p, quantity: 1, selectedExtras: []}]; }); }} 
          cartCount={cart.reduce((a, b) => a + b.quantity, 0)} subtotal={subtotal} onViewCart={() => setView('CART')} onViewAdmin={() => setView('ADMIN_LOGIN')} onBack={() => { setCurrentStore(null); window.history.pushState({}, '', '/'); setView('HOME'); }}
        />
      )}

      {view === 'CART' && <CartView items={cart} updateQuantity={(id, d) => setCart(prev => prev.map(i => i.product.id === id ? {...i, quantity: Math.max(0, i.quantity + d)} : i).filter(i => i.quantity > 0))} clearCart={() => setCart([])} onBack={() => setView('MENU')} onProceed={(m) => { setOrderMetadata(m); setView('REVIEW'); }} subtotal={subtotal} />}
      {view === 'REVIEW' && <OrderReview items={cart} customerName={orderMetadata.customerName || ''} address={orderMetadata.address || ''} method={orderMetadata.deliveryMethod || 'Delivery'} tableNumber={orderMetadata.tableNumber} pickupTime={orderMetadata.pickupTime} orderNotes={orderMetadata.notes} onBack={() => setView('CART')} onConfirm={handlePlaceOrder} subtotal={subtotal} />}
      {view === 'TRACK' && currentOrder && <OrderTracking order={currentOrder} onBack={() => setView('MENU')} />}

      {view === 'ADMIN_LOGIN' && currentStore && (
        <div className="min-h-screen flex items-center justify-center p-6">
           <div className="max-w-xs w-full space-y-6">
              <h2 className="text-2xl font-black text-center">{currentStore.name}</h2>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Senha Admin" className="w-full p-4 rounded-2xl border bg-white dark:bg-white/5 border-primary/20 outline-none" />
              <button onClick={() => { if(loginPassword === currentStore.adminPassword) { setIsAdminLoggedIn(true); setView('ADMIN'); setLoginPassword(''); } else alert('Incorreta!'); }} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20">Entrar no Painel</button>
              <button onClick={() => setView('MENU')} className="w-full text-xs font-bold text-gray-400">Voltar</button>
           </div>
        </div>
      )}

      {view === 'ADMIN' && currentStore && (
        <AdminDashboard 
          whatsappNumber={currentStore.whatsapp} isOpen={currentStore.isOpen} orders={currentStore.orders || []} onToggleStoreStatus={() => handleUpdateStoreStatus(!currentStore.isOpen)} onUpdateWhatsApp={(w) => handleUpdateStoreSettings({ whatsapp: w })} onUpdateOrderStatus={handleUpdateOrderStatus}
          products={currentStore.products} onAddProduct={() => { setEditingProduct(null); setView('PRODUCT_FORM'); }} onEditProduct={(p) => { setEditingProduct(p); setView('PRODUCT_FORM'); }} onToggleAvailability={() => {}} onBack={() => { setView('MENU'); setIsAdminLoggedIn(false); }}
          onUpdatePassword={(p) => handleUpdateStoreSettings({ admin_password: p })}
        />
      )}

      {view === 'PRODUCT_FORM' && currentStore && <ProductForm product={editingProduct} onSave={async (p) => { 
        const { error } = (p.id.length > 15 || p.id === 'new') ? await supabase.from('products').insert([{...p, id: undefined, store_id: currentStore.id}]) : await supabase.from('products').update({...p, id: undefined}).eq('id', p.id);
        if(!error) { const {data} = await supabase.from('products').select('*').eq('store_id', currentStore.id); if(data) setCurrentStore({...currentStore, products: data as any}); setView('ADMIN'); }
      }} onCancel={() => setView('ADMIN')} />}
    </div>
  );
};

export default App;
