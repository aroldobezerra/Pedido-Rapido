
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
  const [loginError, setLoginError] = useState('');
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

  // 1. Inicialização
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
        
        if (storesError) {
          console.error("Erro ao buscar lojas:", storesError);
        }
        
        // Mapear campos do banco (snake_case) para o objeto interno (camelCase)
        const allStores = (storesData || []).map((s: any) => ({
          ...s,
          adminPassword: s.admin_password || s.adminPassword, // Garante compatibilidade
          isOpen: s.is_open ?? true
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

        try {
          const { data: configData } = await supabase
            .from('saas_config')
            .select('value')
            .eq('key', 'master_password')
            .maybeSingle();
          if (configData) setSaasPassword(configData.value);
        } catch (e) {
          // Tabela config pode não existir
        }

      } catch (e) {
        console.error("Erro crítico na inicialização:", e);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  // Sincronizar link da URL
  useEffect(() => {
    if (currentStore && (view === 'MENU' || view === 'ADMIN')) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('s') !== currentStore.slug) {
        url.searchParams.set('s', currentStore.slug);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [currentStore, view]);

  // Registro de Loja
  const handleRegisterStore = async (newStore: Store) => {
    setIsLoading(true);
    try {
      const { data: storeData, error: storeError } = await supabase.from('stores').insert([{
        name: newStore.name,
        slug: newStore.slug,
        whatsapp: newStore.whatsapp,
        admin_password: newStore.adminPassword, // Importante: salva no campo correto
        is_open: true
      }]).select().single();
      
      if (storeError) {
        if (storeError.code === '23505') throw new Error("Link @"+newStore.slug+" já existe.");
        throw storeError;
      }

      const { error: productsError } = await supabase.from('products').insert(newStore.products.map(p => ({
        store_id: storeData.id,
        name: p.name,
        price: p.price,
        category: p.category,
        description: p.description,
        image: p.image,
        is_available: true
      })));

      if (productsError) throw productsError;

      const { data: fullStore } = await supabase.from('stores').select('*, products(*), orders(*)').eq('id', storeData.id).single();
      if (fullStore) {
        const mapped = { ...fullStore, adminPassword: fullStore.admin_password, isOpen: fullStore.is_open };
        setStores(prev => [...prev, mapped]);
        setCurrentStore(mapped);
        setView('MENU');
      }
    } catch (err: any) { 
      alert(`⚠️ ${err.message || "Erro no cadastro"}`); 
    } finally { setIsLoading(false); }
  };

  const handleUpdateStorePassword = async (storeId: string, newPass: string) => {
    const { error } = await supabase.from('stores').update({ admin_password: newPass }).eq('id', storeId);
    if (!error) {
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, adminPassword: newPass } : s));
      alert("Senha da lanchonete atualizada!");
    } else {
      alert("Erro ao atualizar senha.");
    }
  };

  const handleUpdateStoreStatus = async (isOpen: boolean) => {
    if (!currentStore) return;
    const { error } = await supabase.from('stores').update({ is_open: isOpen }).eq('id', currentStore.id);
    if (!error) setCurrentStore({ ...currentStore, isOpen });
  };

  const handleUpdateStoreSettings = async (updates: any) => {
    if (!currentStore) return;
    const dbUpdates: any = { ...updates };
    if (updates.admin_password) dbUpdates.admin_password = updates.admin_password;
    
    const { error } = await supabase.from('stores').update(dbUpdates).eq('id', currentStore.id);
    if (!error) {
      setCurrentStore({ ...currentStore, ...updates, adminPassword: updates.admin_password || currentStore.adminPassword });
      alert("Ajustes salvos!");
    }
  };

  const handleUpdateSaaSPassword = async (newPass: string) => {
    const { error } = await supabase.from('saas_config').upsert({ key: 'master_password', value: newPass });
    if (!error) setSaasPassword(newPass);
  };

  const handleDeleteStore = async (id: string) => {
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (!error) setStores(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    await supabase.from('orders').update({ status }).eq('id', id);
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0), [cart]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark"><div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans text-[#1c140d] dark:text-[#fcfaf8]">
      {view === 'HOME' && <HomeView onRegister={() => setView('REGISTER')} onSaaSAdmin={() => { setLoginError(''); setView('SAAS_LOGIN'); }} />}
      
      {view === 'SAAS_LOGIN' && (
        <div className="min-h-screen flex items-center justify-center p-6">
           <div className="max-w-xs w-full space-y-6">
              <div className="text-center"><h2 className="text-2xl font-black text-primary">Admin Master</h2></div>
              <input type="password" value={loginPassword} onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }} placeholder="Senha Master" className="w-full p-4 rounded-2xl border bg-white dark:bg-white/5 border-primary/20" />
              {loginError && <p className="text-xs font-bold text-red-500 text-center">{loginError}</p>}
              <button onClick={() => { if(loginPassword.trim() === saasPassword) { setView('SAAS_ADMIN'); setLoginPassword(''); } else setLoginError('Senha Master Incorreta'); }} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20">Entrar</button>
              <button onClick={() => setView('HOME')} className="w-full text-xs font-bold text-gray-400">Voltar</button>
           </div>
        </div>
      )}

      {view === 'SAAS_ADMIN' && (
        <SaaSAdminDashboard 
          stores={stores} 
          saasPassword={saasPassword} 
          onUpdateSaaSPassword={handleUpdateSaaSPassword} 
          onDeleteStore={handleDeleteStore} 
          onUpdateStorePassword={handleUpdateStorePassword}
          onBack={() => setView('HOME')} 
          onViewStore={(s) => { setCurrentStore(s); setView('MENU'); }} 
        />
      )}

      {view === 'REGISTER' && <RegisterStore onRegister={handleRegisterStore} onCancel={() => setView('HOME')} />}

      {view === 'MENU' && currentStore && (
        <CustomerMenu 
          storeName={currentStore.name} isOpen={currentStore.isOpen} products={currentStore.products} 
          onAddToCart={(p) => { if(!currentStore.isOpen) return; setCart(prev => { const ex = prev.find(i => i.product.id === p.id); if(ex) return prev.map(i => i.product.id === p.id ? {...i, quantity: i.quantity + 1} : i); return [...prev, {product: p, quantity: 1, selectedExtras: []}]; }); }} 
          cartCount={cart.reduce((a, b) => a + b.quantity, 0)} subtotal={subtotal} onViewCart={() => setView('CART')} onViewAdmin={() => { setLoginError(''); setView('ADMIN_LOGIN'); }} onBack={() => { setCurrentStore(null); window.history.pushState({}, '', '/'); setView('HOME'); }}
        />
      )}

      {view === 'CART' && <CartView items={cart} updateQuantity={(id, d) => setCart(prev => prev.map(i => i.product.id === id ? {...i, quantity: Math.max(0, i.quantity + d)} : i).filter(i => i.quantity > 0))} clearCart={() => setCart([])} onBack={() => setView('MENU')} onProceed={(m) => { setOrderMetadata(m); setView('REVIEW'); }} subtotal={subtotal} />}
      {view === 'REVIEW' && <OrderReview items={cart} customerName={orderMetadata.customerName || ''} address={orderMetadata.address || ''} method={orderMetadata.deliveryMethod || 'Delivery'} tableNumber={orderMetadata.tableNumber} pickupTime={orderMetadata.pickupTime} orderNotes={orderMetadata.notes} onBack={() => setView('CART')} onConfirm={() => setView('TRACK')} subtotal={subtotal} />}
      
      {view === 'ADMIN_LOGIN' && currentStore && (
        <div className="min-h-screen flex items-center justify-center p-6">
           <div className="max-w-xs w-full space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-black">{currentStore.name}</h2>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Painel Administrativo</p>
              </div>
              <input type="password" value={loginPassword} onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }} placeholder="Senha da Lanchonete" className="w-full p-4 rounded-2xl border bg-white dark:bg-white/5 border-primary/20" />
              {loginError && <p className="text-xs font-bold text-red-500 text-center">{loginError}</p>}
              <button onClick={() => { 
                const trimmed = loginPassword.trim();
                // Verifica a senha no objeto da loja atual
                if(trimmed === currentStore.adminPassword) { 
                  setIsAdminLoggedIn(true); setView('ADMIN'); setLoginPassword(''); 
                } else {
                  setLoginError('Senha Incorreta!');
                }
              }} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20">Entrar</button>
              <button onClick={() => setView('MENU')} className="w-full text-xs font-bold text-gray-400">Voltar ao Cardápio</button>
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
