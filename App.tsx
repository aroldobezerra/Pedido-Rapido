
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

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('HOME');
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [saasPassword, setSaasPassword] = useState('admin');
  const [isLoading, setIsLoading] = useState(true);
  
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

  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      try {
        const savedStores = localStorage.getItem('snackdash_stores');
        let loadedStores: Store[] = [];
        if (savedStores) {
          loadedStores = JSON.parse(savedStores);
        }
        setStores(loadedStores);

        const savedPass = localStorage.getItem('snackdash_saas_pass');
        if (savedPass) {
          setSaasPassword(savedPass);
        }

        const params = new URLSearchParams(window.location.search);
        const slug = params.get('s');
        if (slug && loadedStores.length > 0) {
          const store = loadedStores.find(s => s.slug === slug);
          if (store) {
            setCurrentStore(store);
            setView('MENU');
          }
        }
      } catch (e) {
        console.error("Erro ao inicializar:", e);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const saveStores = (newStores: Store[]) => {
    setStores(newStores);
    localStorage.setItem('snackdash_stores', JSON.stringify(newStores));
  };

  const handleUpdateSaaSPassword = (newPass: string) => {
    setSaasPassword(newPass);
    localStorage.setItem('snackdash_saas_pass', newPass);
  };

  const handleRegisterStore = (newStore: Store) => {
    const updated = [...stores, newStore];
    saveStores(updated);
    setCurrentStore(newStore);
    try { window.history.pushState({}, '', `?s=${newStore.slug}`); } catch (e) {}
    setView('MENU');
  };

  const handleDeleteStore = (storeId: string) => {
    const updated = stores.filter(s => s.id !== storeId);
    saveStores(updated);
  };

  const handleUpdateStore = (updatedStore: Store) => {
    const updated = stores.map(s => s.id === updatedStore.id ? updatedStore : s);
    saveStores(updated);
    setCurrentStore(updatedStore);
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }, [cart]);

  const handlePlaceOrder = (message: string) => {
    if (!currentStore) return;
    
    const deliveryFee = orderMetadata.deliveryMethod === 'Delivery' ? 5.0 : 0;
    const newOrder: Order = {
      id: `SD-${Math.floor(1000 + Math.random() * 9000)}`,
      items: [...cart],
      status: 'Received',
      estimatedArrival: '20-30 min',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: orderMetadata.customerName || 'Cliente',
      deliveryMethod: orderMetadata.deliveryMethod || 'Delivery',
      address: orderMetadata.address,
      tableNumber: orderMetadata.tableNumber,
      pickupTime: orderMetadata.pickupTime,
      notes: orderMetadata.notes,
      total: subtotal + deliveryFee
    };
    
    const updatedOrders = [newOrder, ...(currentStore.orders || [])];
    handleUpdateStore({ ...currentStore, orders: updatedOrders });

    const whatsappUrl = `https://wa.me/${currentStore.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    setCurrentOrder(newOrder);
    setCart([]);
    setView('TRACK');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-primary uppercase tracking-widest text-xs">Conectando ao Cloud Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans">
      {view === 'HOME' && (
        <HomeView 
          onRegister={() => setView('REGISTER')}
          onSaaSAdmin={() => setView('SAAS_LOGIN')}
        />
      )}

      {view === 'SAAS_LOGIN' && (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background-light dark:bg-background-dark">
           <div className="max-w-xs w-full space-y-6">
              <h2 className="text-2xl font-black text-center text-primary">Login do SaaS Owner</h2>
              <input 
                type="password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                placeholder="Senha Master" 
                className="w-full p-4 rounded-2xl border bg-white dark:bg-white/5 border-primary/20 outline-none focus:ring-4 focus:ring-primary/10" 
              />
              <button 
                onClick={() => { if(loginPassword === saasPassword) { setView('SAAS_ADMIN'); setLoginPassword(''); } else alert('Senha Incorreta!'); }} 
                className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                Acessar Plataforma
              </button>
              <button onClick={() => setView('HOME')} className="w-full text-sm text-gray-400 font-bold uppercase tracking-widest mt-4">Voltar</button>
           </div>
        </div>
      )}

      {view === 'SAAS_ADMIN' && (
        <SaaSAdminDashboard 
          stores={stores}
          saasPassword={saasPassword}
          onUpdateSaaSPassword={handleUpdateSaaSPassword}
          onDeleteStore={handleDeleteStore}
          onBack={() => setView('HOME')}
          onViewStore={(s) => {
            setCurrentStore(s);
            try { window.history.pushState({}, '', `?s=${s.slug}`); } catch(e) {}
            setView('MENU');
          }}
        />
      )}

      {view === 'REGISTER' && <RegisterStore onRegister={handleRegisterStore} onCancel={() => setView('HOME')} />}

      {view === 'MENU' && currentStore && (
        <CustomerMenu 
          storeName={currentStore.name}
          isOpen={currentStore.isOpen}
          products={currentStore.products} 
          onAddToCart={(product) => {
            if (!currentStore.isOpen) return alert("Loja Fechada!");
            setCart(prev => {
              const existing = prev.find(item => item.product.id === product.id);
              if (existing) return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
              return [...prev, { product, quantity: 1, selectedExtras: [] }];
            });
          }} 
          cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)}
          subtotal={subtotal}
          onViewCart={() => setView('CART')}
          onViewAdmin={() => setView('ADMIN_LOGIN')}
          onBack={() => { setCurrentStore(null); try { window.history.pushState({}, '', window.location.pathname); } catch(e) {} setView('HOME'); }}
        />
      )}

      {view === 'CART' && (
        <CartView 
          items={cart} 
          updateQuantity={(id, delta) => setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0))}
          clearCart={() => setCart([])}
          onBack={() => setView('MENU')}
          onProceed={(meta) => { setOrderMetadata(meta); setView('REVIEW'); }}
          subtotal={subtotal}
        />
      )}

      {view === 'REVIEW' && (
        <OrderReview 
          items={cart}
          customerName={orderMetadata.customerName || ''}
          address={orderMetadata.address || ''}
          method={orderMetadata.deliveryMethod || 'Delivery'}
          tableNumber={orderMetadata.tableNumber}
          pickupTime={orderMetadata.pickupTime}
          orderNotes={orderMetadata.notes}
          onBack={() => setView('CART')}
          onConfirm={handlePlaceOrder}
          subtotal={subtotal}
        />
      )}

      {view === 'TRACK' && currentOrder && <OrderTracking order={currentOrder} onBack={() => setView('MENU')} />}

      {view === 'ADMIN_LOGIN' && currentStore && (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background-light dark:bg-background-dark">
           <div className="max-w-xs w-full space-y-6">
              <h2 className="text-2xl font-black text-center">Login da Lanchonete</h2>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Senha Admin" className="w-full p-4 rounded-2xl border" />
              <button onClick={() => { if(loginPassword === currentStore.adminPassword) { setIsAdminLoggedIn(true); setView('ADMIN'); setLoginPassword(''); } else alert('Senha Incorreta!'); }} className="w-full bg-primary text-white font-bold py-4 rounded-2xl">Entrar no Painel</button>
              <button onClick={() => setView('MENU')} className="w-full text-sm text-gray-400">Voltar para o Cardápio</button>
           </div>
        </div>
      )}

      {view === 'ADMIN' && currentStore && (
        <AdminDashboard 
          whatsappNumber={currentStore.whatsapp}
          isOpen={currentStore.isOpen}
          orders={currentStore.orders || []}
          onToggleStoreStatus={() => handleUpdateStore({...currentStore, isOpen: !currentStore.isOpen})}
          onUpdateWhatsApp={(w) => handleUpdateStore({...currentStore, whatsapp: w})}
          onUpdateOrderStatus={(orderId, status) => {
            const updatedOrders = currentStore.orders.map(o => o.id === orderId ? { ...o, status } : o);
            handleUpdateStore({...currentStore, orders: updatedOrders});
          }}
          products={currentStore.products}
          onAddProduct={() => { setEditingProduct(null); setView('PRODUCT_FORM'); }}
          onEditProduct={(p) => { setEditingProduct(p); setView('PRODUCT_FORM'); }}
          onToggleAvailability={(id) => {
            const updatedProducts = currentStore.products.map(p => p.id === id ? { ...p, isAvailable: !p.isAvailable } : p);
            handleUpdateStore({...currentStore, products: updatedProducts});
          }}
          onBack={() => { setView('MENU'); setIsAdminLoggedIn(false); }}
        />
      )}

      {view === 'PRODUCT_FORM' && currentStore && (
        <ProductForm 
          product={editingProduct} 
          onSave={(p) => {
            const exists = currentStore.products.find(prod => prod.id === p.id);
            const updatedProducts = exists ? currentStore.products.map(prod => prod.id === p.id ? p : prod) : [...currentStore.products, p];
            handleUpdateStore({...currentStore, products: updatedProducts});
            setView('ADMIN');
          }} 
          onCancel={() => setView('ADMIN')}
        />
      )}
    </div>
  );
};

export default App;
