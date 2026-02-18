import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Plus, Minus, Trash2, Send, Lock, ArrowLeft, Store, Loader,
  Zap, Shield, Eye, EyeOff, Trash, Phone, Calendar, Key, ChevronRight,
  Package, BarChart2, Users, CheckCircle, XCircle, AlertTriangle, RefreshCw
} from 'lucide-react';

const SUPABASE_URL  = (import.meta.env.VITE_SUPABASE_URL  || '').replace(/\/$/, '');
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_KEY  || '';
const SAAS_PASSWORD = import.meta.env.VITE_SAAS_PASSWORD || 'master123';

// ─── HELPERS DE API ──────────────────────────────────────────────────────────

const headers = (extra = {}) => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  ...extra,
});

const buildURL = (table, params = {}) => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (params.select) url.searchParams.set('select', params.select);
  if (params.eq)     url.searchParams.set(`${params.eq.column}`, `eq.${params.eq.value}`);
  if (params.limit)  url.searchParams.set('limit', params.limit);
  if (params.order)  url.searchParams.set('order', `${params.order.column}.${params.order.ascending ? 'asc' : 'desc'}`);
  return url.toString();
};

const apiFetch = async (table, params = {}) => {
  const res = await fetch(buildURL(table, params), { headers: headers() });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
  return Array.isArray(json) ? json : [];
};

const apiInsert = async (table, row) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(row),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.message || json?.error || JSON.stringify(json);
    throw new Error(msg);
  }
  return Array.isArray(json) ? json[0] : json;
};

const apiUpdate = async (table, column, value, data) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || `HTTP ${res.status}`);
  }
  return true;
};

const apiDelete = async (table, column, value) => {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
    method: 'DELETE',
    headers: headers(),
  });
};

// ─── COMPONENTES AUXILIARES ──────────────────────────────────────────────────

const Overlay = ({ children }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    {children}
  </div>
);

const Spinner = ({ size = 32, color = 'text-orange-500' }) => (
  <Loader className={`animate-spin ${color}`} size={size} />
);

const LoadingOverlay = ({ text = 'Carregando...' }) => (
  <Overlay>
    <div className="bg-white rounded-2xl p-7 flex flex-col items-center gap-3 shadow-2xl">
      <Spinner size={36} />
      <p className="text-sm font-bold text-gray-600">{text}</p>
    </div>
  </Overlay>
);

const Toast = ({ msg, type = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = { success: 'bg-green-500', error: 'bg-red-500' };
  const Icon = type === 'success' ? CheckCircle : XCircle;

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl text-white shadow-2xl text-sm font-bold max-w-sm w-[90%] ${styles[type]}`}>
      <Icon size={18} />
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="text-lg leading-none">×</button>
    </div>
  );
};

// ─── APP PRINCIPAL ───────────────────────────────────────────────────────────

export default function PedidoRapido() {
  const [view, setView] = useState('loading');
  const [currentTenant, setCurrentTenant] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── Carregar tenant pela URL ──────────────────────────────────────────────
  const loadTenantFromURL = useCallback(async (slug) => {
    if (!slug) { setView('home'); return; }
    if (slug === 'master') { setView('saas-login'); return; }

    setLoading(true);
    try {
      const tenants = await apiFetch('tenants', { eq: { column: 'slug', value: slug } });
      const tenant = tenants[0];
      if (!tenant) {
        window.history.replaceState({}, '', '/');
        setView('home');
        return;
      }

      setCurrentTenant(tenant);

      let prods = [];
      try {
        prods = await apiFetch('products', { eq: { column: 'store_id', value: tenant.id } });
      } catch (err) {
        console.warn('Erro ao carregar produtos:', err.message);
      }

      setProducts(prods);
      setView('menu');

      if (window.location.pathname !== `/${slug}`) {
        window.history.replaceState({}, '', `/${slug}`);
      }
    } catch (err) {
      console.error('Erro ao carregar tenant:', err);
      showToast('Erro ao carregar a lanchonete', 'error');
      setView('home');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const slug = window.location.pathname.split('/').filter(Boolean)[0] || null;
    loadTenantFromURL(slug);
  }, [loadTenantFromURL]);

  const go = (newView, slug = null) => {
    if (slug) window.history.pushState({}, '', `/${slug}`);
    else if (newView === 'home') window.history.pushState({}, '', '/');
    setView(newView);
  };

  // ── Criar tenant ──────────────────────────────────────────────────────────
  const createTenant = async (name, slug, whatsapp, password) => {
    setLoading(true);
    try {
      const existing = await apiFetch('tenants', { eq: { column: 'slug', value: slug } });
      if (existing.length > 0) {
        showToast('Identificador já em uso. Escolha outro.', 'error');
        return null;
      }

      const newTenant = await apiInsert('tenants', {
        name,
        slug,
        whatsapp,
        password,
        plan: 'trial',
        created_at: new Date().toISOString(),
      });

      if (!newTenant?.id) throw new Error('Falha na criação');

      setCurrentTenant(newTenant);

      let prods = [];
      try {
        prods = await apiFetch('products', { eq: { column: 'store_id', value: newTenant.id } });
      } catch (err) {
        console.warn('Produtos não carregados:', err.message);
      }

      setProducts(prods);
      window.history.pushState({}, '', `/${slug}`);
      setView('menu');
      showToast('Lanchonete criada com sucesso! 7 dias grátis.', 'success');
      return newTenant;
    } catch (err) {
      console.error('Erro createTenant:', err);
      showToast(`Erro ao criar: ${err.message}`, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ── Criar pedido com schema real da tabela orders ────────────────────────
  const createOrder = async (storeId, customerName, deliveryMethod, tableNumber, items, total, address = '', notes = '') => {
    try {
      await apiInsert('orders', {
        store_id: storeId,
        customer_name: customerName,
        delivery_method: deliveryMethod,
        table_number: tableNumber || null,
        items: JSON.stringify(items),
        total: parseFloat(total),
        status: 'Preparing',
        address: address || '',
        pickup_time: null,
        notes: notes || '',
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Erro ao criar pedido:", err);
      throw err;
    }
  };

  // ── PÁGINAS (exemplo mínimo - você pode expandir) ─────────────────────────

  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
        <Zap size={64} className="mx-auto text-orange-500 mb-6" />
        <h1 className="text-4xl font-bold mb-2">Pedido Rápido</h1>
        <p className="text-gray-600 mb-8">Faça seu pedido de forma rápida e prática</p>
        <button onClick={() => go('register')} className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold">
          Começar Agora
        </button>
      </div>
    </div>
  );

  const RegisterPage = () => {
    const [form, setForm] = useState({ name: '', slug: '', whatsapp: '', password: '' });

    const handleSubmit = () => {
      if (!form.name || !form.slug || !form.whatsapp || !form.password) {
        showToast('Preencha todos os campos', 'error');
        return;
      }
      createTenant(form.name, form.slug, form.whatsapp, form.password);
    };

    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold text-center mb-6">Crie sua Loja</h2>
          {/* inputs do form */}
          <button onClick={handleSubmit} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold">
            Criar Loja
          </button>
        </div>
      </div>
    );
  };

  const MenuPage = () => {
    if (!currentTenant) return null;
    const available = products.filter(p => p.is_available || p.isAvailable);

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <h1 className="text-2xl font-bold mb-4">{currentTenant.name}</h1>
        <div className="grid grid-cols-2 gap-4">
          {available.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-xl shadow">
              <div className="text-6xl mb-2">{p.image}</div>
              <h3 className="font-bold">{p.name}</h3>
              <p className="text-sm text-gray-600">R$ {p.price}</p>
              <button 
                onClick={() => setCart([...cart, { ...p, qty: 1 }])}
                className="mt-2 w-full bg-orange-500 text-white py-2 rounded-lg"
              >
                Adicionar
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const CartPage = () => {
    const [name, setName] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState('Delivery');
    const [tableNum, setTableNum] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [sending, setSending] = useState(false);

    if (!currentTenant) return null;

    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.qty || 1)), 0);

    const handleSend = async () => {
      if (!name.trim()) return showToast('Digite seu nome!', 'error');
      if (deliveryMethod === 'Delivery' && !address.trim()) return showToast('Digite o endereço!', 'error');
      if (deliveryMethod === 'Local' && !tableNum.trim()) return showToast('Digite o número da mesa!', 'error');

      setSending(true);
      try {
        await createOrder(
          currentTenant.id,
          name,
          deliveryMethod,
          deliveryMethod === 'Local' ? tableNum : null,
          cart,
          total,
          deliveryMethod === 'Delivery' ? address : null,
          notes
        );

        // Aqui você pode abrir o WhatsApp ou mostrar sucesso
        showToast('Pedido enviado com sucesso!', 'success');
        setCart([]);
        go('menu');
      } catch (err) {
        showToast('Erro ao enviar: ' + err.message, 'error');
      } finally {
        setSending(false);
      }
    };

    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <h1 className="text-2xl font-bold mb-4">Carrinho</h1>
        
        {/* Itens do carrinho */}
        {cart.map(item => (
          <div key={item.id} className="bg-white p-4 mb-3 rounded-xl shadow">
            {item.name} × {item.qty} - R$ {(item.price * item.qty).toFixed(2)}
          </div>
        ))}

        <div className="bg-white p-6 rounded-xl shadow mt-6">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full p-3 border rounded mb-3"
          />

          <div className="flex gap-3 mb-3">
            <button 
              onClick={() => setDeliveryMethod('Delivery')}
              className={`flex-1 p-3 rounded ${deliveryMethod === 'Delivery' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
            >
              Entrega
            </button>
            <button 
              onClick={() => setDeliveryMethod('Local')}
              className={`flex-1 p-3 rounded ${deliveryMethod === 'Local' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
            >
              Local
            </button>
          </div>

          {deliveryMethod === 'Delivery' && (
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Endereço completo"
              className="w-full p-3 border rounded mb-3"
            />
          )}

          {deliveryMethod === 'Local' && (
            <input
              value={tableNum}
              onChange={e => setTableNum(e.target.value)}
              placeholder="Número da mesa"
              className="w-full p-3 border rounded mb-3"
            />
          )}

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Observações (opcional)"
            className="w-full p-3 border rounded mb-4 min-h-[80px]"
          />

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold disabled:opacity-50"
          >
            {sending ? 'Enviando...' : `Enviar Pedido - R$ ${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    );
  };

  // Render condicional
  return (
    <>
      {loading && <LoadingOverlay />}
      {view === 'home' && <HomePage />}
      {view === 'register' && <RegisterPage />}
      {view === 'menu' && <MenuPage />}
      {view === 'cart' && <CartPage />}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
