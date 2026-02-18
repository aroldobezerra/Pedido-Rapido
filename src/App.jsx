import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Send, Lock, ArrowLeft, Store, Loader, Zap, Shield, Eye, EyeOff, Trash, Settings, Phone, Calendar, Key, ChevronRight, Package, BarChart2, Users } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';
const SAAS_MASTER_PASSWORD = import.meta.env.VITE_SAAS_PASSWORD || 'master123';

// ─── API HELPERS ────────────────────────────────────────────────────────────

const fetchAPI = async (table, params = {}) => {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const queryParams = [];
  if (params.select) queryParams.push(`select=${params.select}`);
  if (params.eq)     queryParams.push(`${params.eq.column}=eq.${params.eq.value}`);
  if (params.limit)  queryParams.push(`limit=${params.limit}`);
  if (params.order)  queryParams.push(`order=${params.order.column}.${params.order.ascending ? 'asc' : 'desc'}`);
  if (queryParams.length > 0) url += '?' + queryParams.join('&');

  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
  return await res.json();
};

const insertAPI = async (table, data) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  });
  return await res.json();
};

const updateAPI = async (table, column, value, data) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return res.ok;
};

const deleteAPI = async (table, column, value) => {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
};

// ─── LOADING OVERLAY ────────────────────────────────────────────────────────

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-2xl">
      <Loader className="animate-spin text-orange-500" size={36} />
      <p className="text-sm font-bold text-gray-600">Carregando...</p>
    </div>
  </div>
);

// ─── MAIN APP ────────────────────────────────────────────────────────────────

const PedidoRapido = () => {
  const [view, setView] = useState('loading');
  const [currentTenant, setCurrentTenant] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── DETECTAR SLUG NA URL ─────────────────────────────────────────────────
  // CORRIGIDO: inicia em 'loading', evita redirect errado, slug 'master' é reservado
  const loadTenantFromURL = useCallback(async (slug) => {
    if (!slug) { setView('home'); return; }
    if (slug === 'master') { setView('saas-login'); return; }

    setLoading(true);
    try {
      const data = await fetchAPI('tenants', { eq: { column: 'slug', value: slug } });
      const tenant = data && data[0] ? data[0] : null;
      if (tenant) {
        setCurrentTenant(tenant);
        const prods = await fetchAPI('products', { eq: { column: 'tenant_id', value: tenant.id } });
        setProducts(prods || []);
        setView('menu');
        // Garante URL correta sem disparar novo ciclo
        if (window.location.pathname !== `/${slug}`) {
          window.history.replaceState({}, '', `/${slug}`);
        }
      } else {
        window.history.replaceState({}, '', '/');
        setView('home');
      }
    } catch (err) {
      console.error('Erro ao carregar tenant:', err);
      window.history.replaceState({}, '', '/');
      setView('home');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const slug = window.location.pathname.split('/').filter(Boolean)[0];
    loadTenantFromURL(slug || null);
  }, [loadTenantFromURL]);

  // ── NAVEGAÇÃO ─────────────────────────────────────────────────────────────
  const navigateTo = (newView, slug = null) => {
    if (slug) window.history.pushState({}, '', `/${slug}`);
    else if (newView === 'home') window.history.pushState({}, '', '/');
    setView(newView);
  };

  const accessTenant = async (slug) => {
    setLoading(true);
    try {
      const data = await fetchAPI('tenants', { eq: { column: 'slug', value: slug } });
      const tenant = data && data[0] ? data[0] : null;
      if (tenant) {
        setCurrentTenant(tenant);
        const prods = await fetchAPI('products', { eq: { column: 'tenant_id', value: tenant.id } });
        setProducts(prods || []);
        window.history.pushState({}, '', `/${slug}`);
        setView('menu');
      } else {
        alert('Lanchonete não encontrada!');
      }
    } catch (err) {
      alert('Erro ao buscar lanchonete.');
    } finally {
      setLoading(false);
    }
  };

  const createTenant = async (name, slug, whatsapp, password) => {
    setLoading(true);
    try {
      const existing = await fetchAPI('tenants', { eq: { column: 'slug', value: slug } });
      if (existing && existing.length > 0) {
        alert('Identificador já existe! Escolha outro.');
        return null;
      }
      const data = await insertAPI('tenants', [{
        name, slug, whatsapp, password, plan: 'trial',
        created_at: new Date().toISOString()
      }]);
      if (data && data[0]) {
        setCurrentTenant(data[0]);
        const prods = await fetchAPI('products', { eq: { column: 'tenant_id', value: data[0].id } });
        setProducts(prods || []);
        window.history.pushState({}, '', `/${slug}`);
        setView('menu');
        return data[0];
      }
      return null;
    } catch (err) {
      alert('Erro: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (tenantId, customerName, orderType, tableNumber, items, total) => {
    await insertAPI('orders', [{
      tenant_id: tenantId,
      customer_name: customerName,
      order_type: orderType,
      table_number: tableNumber,
      items: JSON.stringify(items),
      total,
      status: 'aguardando'
    }]);
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  VIEWS
  // ══════════════════════════════════════════════════════════════════════════

  // ── HOME PAGE ─────────────────────────────────────────────────────────────
  const HomePage = () => {
    const [tenants, setTenants] = useState([]);
    const [tenantsLoading, setTenantsLoading] = useState(true);

    useEffect(() => {
      fetchAPI('tenants', {
        select: 'id,name,slug,created_at',
        limit: 6,
        order: { column: 'created_at', ascending: false }
      })
        .then(d => setTenants(d || []))
        .catch(() => setTenants([]))
        .finally(() => setTenantsLoading(false));
    }, []);

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-50 to-yellow-100 flex flex-col items-center justify-center p-4">
        {loading && <LoadingOverlay />}
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Zap className="text-orange-500" size={44} />
              <span className="text-6xl">🍔</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
              Pedido Rápido
            </h1>
            <p className="text-gray-600 font-medium text-sm">Sistema Multi-Tenant para Lanchonetes</p>
            <p className="text-xs text-gray-400 mt-1">Powered by Supabase + Vercel</p>
          </div>

          {/* Botões principais */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => navigateTo('select')}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Store size={20} /> Acessar Minha Lanchonete
            </button>
            <button
              onClick={() => navigateTo('register')}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              ✨ Começar Grátis (7 dias)
            </button>
          </div>

          {/* Clientes recentes */}
          {!tenantsLoading && tenants.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Lanchonetes recentes</p>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {tenants.map(t => (
                  <button
                    key={t.id}
                    onClick={() => accessTenant(t.slug)}
                    className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all border border-orange-100 flex items-center justify-between group active:scale-98"
                  >
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500">/{t.slug}</p>
                    </div>
                    <ChevronRight size={16} className="text-orange-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Acesso Master discreto */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigateTo('saas-login')}
              className="text-xs text-gray-300 hover:text-gray-500 transition-colors flex items-center gap-1 mx-auto"
            >
              <Shield size={11} /> Painel Master
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── SELECT PAGE ───────────────────────────────────────────────────────────
  const SelectPage = () => {
    const [slug, setSlug] = useState('');

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center p-4">
        {loading && <LoadingOverlay />}
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8">
          <button onClick={() => navigateTo('home')} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-orange-500 transition text-sm font-medium">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store size={32} className="text-orange-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Acessar Lanchonete</h2>
            <p className="text-gray-500 text-sm mt-1">Digite seu identificador único</p>
          </div>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase())}
            onKeyDown={e => e.key === 'Enter' && slug && accessTenant(slug)}
            placeholder="minha-lanchonete"
            className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-xl mb-4 outline-none transition text-gray-800 font-medium"
            autoCapitalize="none"
          />
          <button
            onClick={() => slug && accessTenant(slug)}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white py-3.5 rounded-xl font-bold transition-all"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  };

  // ── REGISTER PAGE ─────────────────────────────────────────────────────────
  const RegisterPage = () => {
    const [form, setForm] = useState({ name: '', slug: '', whatsapp: '', password: '' });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center p-4">
        {loading && <LoadingOverlay />}
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8">
          <button onClick={() => navigateTo('home')} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-green-500 transition text-sm font-medium">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Comece Grátis</h2>
            <p className="text-gray-500 text-sm">7 dias de teste, sem cartão</p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Nome da Lanchonete"
              className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-xl outline-none transition font-medium"
            />
            <div>
              <input
                type="text"
                value={form.slug}
                onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="identificador-unico"
                className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-xl outline-none transition font-medium"
                autoCapitalize="none"
              />
              {form.slug && (
                <p className="text-xs text-gray-400 mt-1 px-1">
                  Seu link: <span className="text-green-600 font-bold">{window.location.origin}/{form.slug}</span>
                </p>
              )}
            </div>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={e => set('whatsapp', e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="WhatsApp (5585999999999)"
              className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-xl outline-none transition font-medium"
            />
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="Senha de Admin"
              className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-xl outline-none transition font-medium"
            />
            <button
              onClick={async () => {
                if (!form.name || !form.slug || !form.whatsapp || !form.password) {
                  alert('Preencha todos os campos!');
                  return;
                }
                await createTenant(form.name, form.slug, form.whatsapp, form.password);
              }}
              className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white py-3.5 rounded-xl font-bold transition-all"
            >
              🚀 Criar Minha Conta
            </button>
          </div>
          <div className="mt-5 p-4 bg-green-50 rounded-2xl">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              ✓ Sem cartão de crédito &nbsp;·&nbsp; ✓ Cancele a qualquer momento &nbsp;·&nbsp; ✓ Suporte via WhatsApp
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ── MENU PAGE ─────────────────────────────────────────────────────────────
  const MenuPage = () => {
    if (!currentTenant) return null;
    const availableProducts = products.filter(p => p.available);
    const cartCount = cart.reduce((s, i) => s + i.qty, 0);
    const cartTotal = cart.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-4 sticky top-0 z-40 shadow-lg">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap size={24} />
              <div>
                <h1 className="text-lg sm:text-xl font-bold leading-tight">{currentTenant.name}</h1>
                <p className="text-xs opacity-80">Pedido Rápido</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigateTo('cart')}
                className="bg-white/20 hover:bg-white/30 active:scale-95 p-2.5 rounded-xl relative transition"
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-orange-900 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigateTo('admin-login')}
                className="bg-white/20 hover:bg-white/30 active:scale-95 p-2.5 rounded-xl transition"
              >
                <Lock size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Produtos */}
        <main className="max-w-4xl mx-auto p-4 pb-28">
          {availableProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Package size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-bold">Nenhum produto disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {availableProducts.map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
                  <div className="text-5xl text-center mb-3">{p.image}</div>
                  <h3 className="text-base font-bold text-center mb-1">{p.name}</h3>
                  {p.description && <p className="text-xs text-gray-500 text-center mb-3">{p.description}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xl font-bold text-orange-500">R$ {parseFloat(p.price).toFixed(2)}</span>
                    <button
                      onClick={() => {
                        const ex = cart.find(i => i.id === p.id);
                        setCart(ex
                          ? cart.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)
                          : [...cart, { ...p, qty: 1 }]
                        );
                      }}
                      className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-3 py-2 rounded-xl flex items-center gap-1 text-sm font-bold transition-all"
                    >
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Botão flutuante do carrinho (mobile-first) */}
        {cartCount > 0 && (
          <div className="fixed bottom-4 left-4 right-4 z-40">
            <button
              onClick={() => navigateTo('cart')}
              className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-between px-5 active:scale-95 transition-all"
            >
              <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-sm font-bold">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</span>
              <span>Ver Carrinho</span>
              <span className="font-black">R$ {cartTotal.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── CART PAGE ─────────────────────────────────────────────────────────────
  const CartPage = () => {
    const [name, setName] = useState('');
    const [orderType, setOrderType] = useState('local');
    const [tableNumber, setTableNumber] = useState('');
    const [sending, setSending] = useState(false);
    if (!currentTenant) return null;

    const total = cart.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);

    const handleSend = async () => {
      if (!name.trim()) return alert('Digite seu nome!');
      if (orderType === 'local' && !tableNumber.trim()) return alert('Digite o número da mesa!');
      setSending(true);
      let msg = `🍔 *PEDIDO RÁPIDO*%0A${currentTenant.name}%0A%0A👤 ${name}%0A📍 ${orderType === 'local' ? `Mesa ${tableNumber}` : 'Para Viagem'}%0A%0A`;
      cart.forEach(i => msg += `${i.image} ${i.name} x${i.qty} — R$${(parseFloat(i.price) * i.qty).toFixed(2)}%0A`);
      msg += `%0A━━━━━━━━━━━━━%0A💰 *TOTAL: R$${total.toFixed(2)}*`;
      await createOrder(currentTenant.id, name, orderType, tableNumber, cart, total);
      window.open(`https://wa.me/${currentTenant.whatsapp}?text=${msg}`, '_blank');
      setCart([]);
      setSending(false);
      alert('✅ Pedido enviado!');
      navigateTo('menu');
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-4 shadow-lg">
          <div className="max-w-2xl mx-auto">
            <button onClick={() => navigateTo('menu')} className="flex items-center gap-2 mb-1 opacity-80 hover:opacity-100 transition text-sm">
              <ArrowLeft size={16} /> Voltar ao Cardápio
            </button>
            <h1 className="text-2xl font-bold">Seu Carrinho</h1>
          </div>
        </header>

        <main className="max-w-2xl mx-auto p-4 pb-8 space-y-4">
          {cart.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm mt-4">
              <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">Carrinho vazio</p>
              <button onClick={() => navigateTo('menu')} className="mt-4 text-orange-500 font-bold text-sm">
                Ver cardápio
              </button>
            </div>
          ) : (
            <>
              {/* Itens */}
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <span className="text-3xl">{item.image}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.name}</p>
                      <p className="text-orange-500 text-sm">R$ {parseFloat(item.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setCart(cart.map(i => i.id === item.id ? { ...i, qty: Math.max(1, i.qty - 1) } : i))} className="bg-gray-100 hover:bg-gray-200 active:scale-90 p-1.5 rounded-lg transition">
                        <Minus size={14} />
                      </button>
                      <span className="font-bold w-6 text-center text-sm">{item.qty}</span>
                      <button onClick={() => setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i))} className="bg-orange-500 hover:bg-orange-600 active:scale-90 text-white p-1.5 rounded-lg transition">
                        <Plus size={14} />
                      </button>
                      <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="bg-red-50 hover:bg-red-500 text-red-400 hover:text-white active:scale-90 p-1.5 rounded-lg transition ml-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dados do pedido */}
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-xl outline-none transition font-medium"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setOrderType('local')} className={`py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${orderType === 'local' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>
                    🪑 Local
                  </button>
                  <button onClick={() => setOrderType('viagem')} className={`py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${orderType === 'viagem' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>
                    🥡 Viagem
                  </button>
                </div>
                {orderType === 'local' && (
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    placeholder="Número da mesa"
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-xl outline-none transition font-medium"
                  />
                )}
              </div>

              {/* Total e envio */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-700">Total</span>
                  <span className="text-2xl font-black text-orange-500">R$ {total.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full bg-green-500 hover:bg-green-600 active:scale-95 disabled:opacity-60 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  {sending ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
                  {sending ? 'Enviando...' : 'Enviar via WhatsApp'}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    );
  };

  // ── ADMIN LOGIN ───────────────────────────────────────────────────────────
  const AdminLoginPage = () => {
    const [pass, setPass] = useState('');
    const [show, setShow] = useState(false);
    if (!currentTenant) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8">
          <button onClick={() => navigateTo('menu')} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-purple-500 transition text-sm font-medium">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-purple-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">Área Admin</h2>
            <p className="text-gray-500 text-sm mt-1">{currentTenant.name}</p>
          </div>
          <div className="relative mb-4">
            <input
              type={show ? 'text' : 'password'}
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && pass === currentTenant.password) navigateTo('admin'); }}
              placeholder="Senha de administrador"
              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 focus:border-purple-400 rounded-xl outline-none transition font-medium"
            />
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            onClick={() => {
              if (pass === currentTenant.password) navigateTo('admin');
              else alert('❌ Senha incorreta!');
            }}
            className="w-full bg-purple-500 hover:bg-purple-600 active:scale-95 text-white py-3.5 rounded-xl font-bold transition-all"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  };

  // ── ADMIN PAGE ────────────────────────────────────────────────────────────
  const AdminPage = () => {
    const [whatsappEdit, setWhatsappEdit] = useState(currentTenant?.whatsapp || '');
    const [saving, setSaving] = useState(false);
    if (!currentTenant) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <header className="bg-white shadow-sm px-4 py-4 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black text-gray-800">Painel Admin</h1>
              <p className="text-xs text-gray-400">{currentTenant.name}</p>
            </div>
            <button onClick={() => navigateTo('menu')} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95">
              Sair
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Plano', value: currentTenant.plan, color: 'text-purple-500' },
              { label: 'Produtos', value: products.length, color: 'text-blue-500' },
              { label: 'Status', value: 'Ativo', color: 'text-green-500' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
                <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
                <p className={`text-lg sm:text-2xl font-black ${s.color} capitalize`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* WhatsApp */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Phone size={18} className="text-green-500" /> WhatsApp
            </h3>
            <div className="flex gap-2">
              <input
                type="tel"
                value={whatsappEdit}
                onChange={e => setWhatsappEdit(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="5585999999999"
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 focus:border-purple-400 rounded-xl outline-none transition text-sm font-medium"
              />
              <button
                onClick={async () => {
                  setSaving(true);
                  await updateAPI('tenants', 'id', currentTenant.id, { whatsapp: whatsappEdit });
                  setCurrentTenant({ ...currentTenant, whatsapp: whatsappEdit });
                  setSaving(false);
                  alert('✅ WhatsApp atualizado!');
                }}
                className="bg-purple-500 hover:bg-purple-600 active:scale-95 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
              >
                {saving ? <Loader size={16} className="animate-spin" /> : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Produtos */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Package size={18} className="text-blue-500" /> Gerenciar Produtos
            </h3>
            {products.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">Nenhum produto cadastrado</p>
            ) : (
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 border-2 border-gray-100 rounded-xl hover:border-purple-200 transition">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.image}</span>
                      <div>
                        <p className="font-bold text-sm text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">R$ {parseFloat(p.price).toFixed(2)}</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const newAvail = !p.available;
                        await updateAPI('products', 'id', p.id, { available: newAvail });
                        setProducts(products.map(pr => pr.id === p.id ? { ...pr, available: newAvail } : pr));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${p.available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {p.available ? '✓ Disponível' : '✗ Indisponível'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  };

  // ── SAAS LOGIN ────────────────────────────────────────────────────────────
  const SaaSLoginPage = () => {
    const [pass, setPass] = useState('');
    const [show, setShow] = useState(false);

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 sm:p-8">
          <button onClick={() => navigateTo('home')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-gray-700 transition text-sm font-medium">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={30} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Painel Master</h2>
            <p className="text-gray-400 text-xs mt-1">Acesso restrito ao administrador da plataforma</p>
          </div>
          <div className="relative mb-4">
            <input
              type={show ? 'text' : 'password'}
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && pass === SAAS_MASTER_PASSWORD) navigateTo('saas-dashboard'); }}
              placeholder="Senha master"
              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 focus:border-gray-700 rounded-xl outline-none transition font-medium"
            />
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            onClick={() => {
              if (pass === SAAS_MASTER_PASSWORD) navigateTo('saas-dashboard');
              else alert('❌ Senha master incorreta!');
            }}
            className="w-full bg-gray-900 hover:bg-gray-700 active:scale-95 text-white py-3.5 rounded-xl font-bold transition-all"
          >
            Acessar Painel
          </button>
        </div>
      </div>
    );
  };

  // ── SAAS DASHBOARD ────────────────────────────────────────────────────────
  const SaaSDashboard = () => {
    const [tenants, setTenants] = useState([]);
    const [dashLoading, setDashLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [newPass, setNewPass] = useState('');

    useEffect(() => {
      fetchAPI('tenants', { order: { column: 'created_at', ascending: false } })
        .then(d => setTenants(d || []))
        .catch(() => setTenants([]))
        .finally(() => setDashLoading(false));
    }, []);

    const handleDelete = async (id) => {
      if (!window.confirm('Deseja EXCLUIR permanentemente esta lanchonete?')) return;
      await deleteAPI('tenants', 'id', id);
      setTenants(tenants.filter(t => t.id !== id));
    };

    const handleUpdatePass = async (id) => {
      if (!newPass) return;
      await updateAPI('tenants', 'id', id, { password: newPass });
      setTenants(tenants.map(t => t.id === id ? { ...t, password: newPass } : t));
      setNewPass('');
      setEditingId(null);
      alert('✅ Senha atualizada!');
    };

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-gray-900 text-white px-4 py-4 sticky top-0 z-40 shadow-xl">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigateTo('home')} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition active:scale-90">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-lg font-black">Painel Master</h1>
                <p className="text-xs text-gray-400">Gestão da Plataforma</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-bold bg-white/10 px-3 py-1.5 rounded-xl">
                {tenants.length} lanchonetes
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto p-4 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center border border-gray-100">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Store size={20} className="text-orange-500" />
              </div>
              <p className="text-xs text-gray-400 font-medium">Lanchonetes</p>
              <p className="text-2xl font-black text-orange-500">{tenants.length}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center border border-gray-100">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Users size={20} className="text-green-500" />
              </div>
              <p className="text-xs text-gray-400 font-medium">Trial</p>
              <p className="text-2xl font-black text-green-500">{tenants.filter(t => t.plan === 'trial').length}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center border border-gray-100">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <BarChart2 size={20} className="text-blue-500" />
              </div>
              <p className="text-xs text-gray-400 font-medium">Pro</p>
              <p className="text-2xl font-black text-blue-500">{tenants.filter(t => t.plan === 'pro').length}</p>
            </div>
          </div>

          {/* Lista */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-black text-gray-800">Base de Clientes</h3>
              <span className="text-xs font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-400 uppercase">Tempo Real</span>
            </div>

            {dashLoading ? (
              <div className="flex justify-center py-12">
                <Loader className="animate-spin text-gray-400" size={32} />
              </div>
            ) : tenants.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-300 shadow-sm">
                <Store size={40} className="mx-auto mb-2 opacity-40" />
                <p className="font-bold">Nenhuma lanchonete cadastrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tenants.map(store => (
                  <div key={store.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        {/* Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center font-black text-orange-500 text-lg shrink-0">
                            {store.name?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-gray-900 truncate">{store.name}</h4>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-lg font-bold border border-orange-100">@{store.slug}</span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Phone size={10} /> {store.whatsapp}
                              </span>
                            </div>
                            {store.created_at && (
                              <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
                                <Calendar size={10} /> {new Date(store.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* Ações */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => { setCurrentTenant(store); navigateTo('menu', store.slug); }}
                            className="p-2 bg-orange-50 hover:bg-orange-500 text-orange-400 hover:text-white rounded-xl transition active:scale-90"
                            title="Ver cardápio"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => { setEditingId(editingId === store.id ? null : store.id); setNewPass(''); }}
                            className={`p-2 rounded-xl transition active:scale-90 ${editingId === store.id ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                            title="Gerenciar acesso"
                          >
                            <Key size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(store.id)}
                            className="p-2 bg-red-50 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition active:scale-90"
                            title="Excluir"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Painel edição de senha */}
                    {editingId === store.id && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Senha atual</p>
                          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 font-mono text-sm font-bold flex items-center justify-between">
                            <span>{store.password}</span>
                            <Key size={14} className="text-gray-300" />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Nova senha</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newPass}
                              onChange={e => setNewPass(e.target.value)}
                              placeholder="Ex: nova123"
                              className="flex-1 bg-white border-2 border-gray-200 focus:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition"
                            />
                            <button
                              onClick={() => handleUpdatePass(store.id)}
                              className="bg-gray-900 hover:bg-gray-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (view === 'loading')        return <LoadingOverlay />;
  if (view === 'home')           return <HomePage />;
  if (view === 'select')         return <SelectPage />;
  if (view === 'register')       return <RegisterPage />;
  if (view === 'menu')           return <MenuPage />;
  if (view === 'cart')           return <CartPage />;
  if (view === 'admin-login')    return <AdminLoginPage />;
  if (view === 'admin')          return <AdminPage />;
  if (view === 'saas-login')     return <SaaSLoginPage />;
  if (view === 'saas-dashboard') return <SaaSDashboard />;

  return null;
};

export default PedidoRapido;