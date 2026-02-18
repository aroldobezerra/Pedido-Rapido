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

/**
 * Monta URL do Supabase REST com query params opcionais.
 * params: { select, eq:{column,value}, limit, order:{column,ascending} }
 */
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

/**
 * INSERT — retorna o registro criado ou lança erro com detalhes do Supabase.
 */
const apiInsert = async (table, row) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(row), // row = objeto único, não array
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.message || json?.error || JSON.stringify(json);
    throw new Error(msg);
  }
  // Supabase retorna array quando Prefer: return=representation
  return Array.isArray(json) ? json[0] : json;
};

/**
 * UPSERT — útil para criar ou atualizar (evita duplicatas em onConflict).
 */
const apiUpsert = async (table, row, onConflict = 'slug') => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: headers({ 'Prefer': 'return=representation,resolution=merge-duplicates' }),
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

// ─── COMPONENTES BASE ────────────────────────────────────────────────────────

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

// Toast simples
const Toast = ({ msg, type = 'success', onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const styles = {
    success: 'bg-green-500',
    error:   'bg-red-500',
    info:    'bg-blue-500',
  };
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : AlertTriangle;
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl text-white shadow-2xl text-sm font-bold max-w-sm w-full ${styles[type]}`}>
      <Icon size={18} />
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
};

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────

export default function PedidoRapido() {
  const [view, setView]                 = useState('loading');
  const [currentTenant, setCurrentTenant] = useState(null);
  const [products, setProducts]         = useState([]);
  const [cart, setCart]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [toast, setToast]               = useState(null); // {msg, type}

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── Carregar tenant pela URL ────────────────────────────────────────────
  const loadTenantFromURL = useCallback(async (slug) => {
    if (!slug)          { setView('home');      return; }
    if (slug === 'master') { setView('saas-login'); return; }

    setLoading(true);
    try {
      const rows = await apiFetch('tenants', { eq: { column: 'slug', value: slug } });
      const tenant = rows[0] || null;
      if (tenant) {
        setCurrentTenant(tenant);
        const prods = await apiFetch('products', { eq: { column: 'tenant_id', value: tenant.id } });
        setProducts(prods);
        setView('menu');
        if (window.location.pathname !== `/${slug}`)
          window.history.replaceState({}, '', `/${slug}`);
      } else {
        window.history.replaceState({}, '', '/');
        setView('home');
      }
    } catch (e) {
      console.error('loadTenantFromURL:', e);
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

  // ── Navegação ───────────────────────────────────────────────────────────
  const go = (newView, slug = null) => {
    if (slug)               window.history.pushState({}, '', `/${slug}`);
    else if (newView === 'home') window.history.pushState({}, '', '/');
    setView(newView);
  };

  // ── Acessar tenant por slug ─────────────────────────────────────────────
  const accessTenant = async (slug) => {
    setLoading(true);
    try {
      const rows = await apiFetch('tenants', { eq: { column: 'slug', value: slug } });
      const tenant = rows[0] || null;
      if (tenant) {
        setCurrentTenant(tenant);
        const prods = await apiFetch('products', { eq: { column: 'tenant_id', value: tenant.id } });
        setProducts(prods);
        window.history.pushState({}, '', `/${slug}`);
        setView('menu');
      } else {
        showToast('Lanchonete não encontrada!', 'error');
      }
    } catch (e) {
      showToast('Erro ao buscar: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Criar tenant ────────────────────────────────────────────────────────
  // CORRIGIDO: verificação de duplicata + insert com objeto único + tratamento de erro detalhado
  const createTenant = async (name, slug, whatsapp, password) => {
    setLoading(true);
    try {
      // 1. Verificar se slug já existe
      const existing = await apiFetch('tenants', { eq: { column: 'slug', value: slug } });
      if (existing.length > 0) {
        showToast('Identificador já existe! Escolha outro.', 'error');
        return null;
      }

      // 2. Inserir — objeto único (não array)
      const tenant = await apiInsert('tenants', {
        name,
        slug,
        whatsapp,
        password,
        plan: 'trial',
        created_at: new Date().toISOString(),
      });

      if (!tenant || !tenant.id) throw new Error('Resposta inesperada do servidor.');

      // 3. Sucesso
      setCurrentTenant(tenant);
      const prods = await apiFetch('products', { eq: { column: 'tenant_id', value: tenant.id } });
      setProducts(prods);
      window.history.pushState({}, '', `/${slug}`);
      setView('menu');
      showToast('✅ Lanchonete criada! 7 dias grátis começam agora.', 'success');
      return tenant;
    } catch (e) {
      console.error('createTenant error:', e);
      showToast('Erro ao criar: ' + e.message, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (tenantId, customerName, orderType, tableNumber, items, total) => {
    await apiInsert('orders', {
      tenant_id: tenantId,
      customer_name: customerName,
      order_type: orderType,
      table_number: tableNumber,
      items: JSON.stringify(items),
      total,
      status: 'aguardando',
    });
  };

  // ════════════════════════════════════════════════════════════════════════
  //  VIEWS
  // ════════════════════════════════════════════════════════════════════════

  // ── HOME ────────────────────────────────────────────────────────────────
  const HomePage = () => {
    const [tenants, setTenants] = useState([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
      apiFetch('tenants', {
        select: 'id,name,slug,created_at',
        limit: 8,
        order: { column: 'created_at', ascending: false },
      })
        .then(setTenants)
        .catch(() => setTenants([]))
        .finally(() => setFetching(false));
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
            <p className="text-gray-500 font-medium text-sm">Sistema Multi-Tenant para Lanchonetes</p>
            <p className="text-xs text-gray-300 mt-1">Powered by Supabase + Vercel</p>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => go('select')}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Store size={20} /> Acessar Minha Lanchonete
            </button>
            <button
              onClick={() => go('register')}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              ✨ Começar Grátis (7 dias)
            </button>
          </div>

          {/* Recentes */}
          {!fetching && tenants.length > 0 && (
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
                      <p className="text-xs text-gray-400">/{t.slug}</p>
                    </div>
                    <ChevronRight size={16} className="text-orange-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => go('saas-login')}
              className="text-xs text-gray-300 hover:text-gray-500 transition flex items-center gap-1 mx-auto"
            >
              <Shield size={11} /> Painel Master
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── SELECT ──────────────────────────────────────────────────────────────
  const SelectPage = () => {
    const [slug, setSlug] = useState('');
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center p-4">
        {loading && <LoadingOverlay />}
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8">
          <button onClick={() => go('home')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-orange-500 transition text-sm font-medium">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store size={32} className="text-orange-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Acessar Lanchonete</h2>
            <p className="text-gray-400 text-sm mt-1">Digite o identificador único</p>
          </div>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().trim())}
            onKeyDown={e => e.key === 'Enter' && slug && accessTenant(slug)}
            placeholder="minha-lanchonete"
            autoCapitalize="none"
            className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-xl mb-4 outline-none transition font-medium"
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

  // ── REGISTER ────────────────────────────────────────────────────────────
  const RegisterPage = () => {
    const [form, setForm] = useState({ name: '', slug: '', whatsapp: '', password: '' });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async () => {
      if (!form.name || !form.slug || !form.whatsapp || !form.password) {
        showToast('Preencha todos os campos!', 'error');
        return;
      }
      if (form.slug.length < 3) {
        showToast('Identificador muito curto (mín. 3 caracteres)', 'error');
        return;
      }
      await createTenant(form.name, form.slug, form.whatsapp, form.password);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center p-4">
        {loading && <LoadingOverlay text="Criando sua lanchonete..." />}
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8">
          <button onClick={() => go('home')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-green-500 transition text-sm font-medium">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Comece Grátis</h2>
            <p className="text-gray-400 text-sm">7 dias de teste, sem cartão</p>
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
                placeholder="identificador-unico (ex: comabem)"
                autoCapitalize="none"
                className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-xl outline-none transition font-medium"
              />
              {form.slug && (
                <p className="text-xs text-gray-400 mt-1 px-1">
                  Link: <span className="text-green-600 font-bold">{window.location.origin}/{form.slug}</span>
                </p>
              )}
            </div>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={e => set('whatsapp', e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="WhatsApp com DDD (ex: 5585999999999)"
              className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-xl outline-none transition font-medium"
            />
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="Senha do Painel Admin"
              className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-xl outline-none transition font-medium"
            />
            <button
              onClick={handleSubmit}
              className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white py-4 rounded-xl font-bold transition-all text-base"
            >
              🚀 Criar Minha Lanchonete
            </button>
          </div>
          <div className="mt-5 p-4 bg-green-50 rounded-2xl">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              ✓ Sem cartão &nbsp;·&nbsp; ✓ Cancele quando quiser &nbsp;·&nbsp; ✓ Suporte via WhatsApp
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ── MENU ────────────────────────────────────────────────────────────────
  const MenuPage = () => {
    if (!currentTenant) return null;
    const available  = products.filter(p => p.available);
    const cartCount  = cart.reduce((s, i) => s + i.qty, 0);
    const cartTotal  = cart.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-4 sticky top-0 z-40 shadow-lg">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap size={22} />
              <div>
                <h1 className="text-lg font-bold leading-tight">{currentTenant.name}</h1>
                <p className="text-xs opacity-70">Pedido Rápido</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => go('cart')} className="bg-white/20 hover:bg-white/30 active:scale-95 p-2.5 rounded-xl relative transition">
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-orange-900 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              <button onClick={() => go('admin-login')} className="bg-white/20 hover:bg-white/30 active:scale-95 p-2.5 rounded-xl transition">
                <Lock size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 pb-28">
          {available.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Package size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-bold">Nenhum produto disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {available.map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
                  <div className="text-5xl text-center mb-3">{p.image}</div>
                  <h3 className="text-base font-bold text-center mb-1">{p.name}</h3>
                  {p.description && <p className="text-xs text-gray-400 text-center mb-2">{p.description}</p>}
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
                      <Plus size={15} /> Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Barra flutuante do carrinho */}
        {cartCount > 0 && (
          <div className="fixed bottom-4 left-4 right-4 z-40">
            <button
              onClick={() => go('cart')}
              className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-between px-5 active:scale-95 transition-all"
            >
              <span className="bg-white/25 px-2.5 py-0.5 rounded-lg text-sm font-bold">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</span>
              <span>Ver Carrinho</span>
              <span className="font-black">R$ {cartTotal.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── CART ────────────────────────────────────────────────────────────────
  const CartPage = () => {
    const [name, setName]           = useState('');
    const [orderType, setOrderType] = useState('local');
    const [tableNum, setTableNum]   = useState('');
    const [sending, setSending]     = useState(false);
    if (!currentTenant) return null;
    const total = cart.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);

    const handleSend = async () => {
      if (!name.trim())                             return showToast('Digite seu nome!', 'error');
      if (orderType === 'local' && !tableNum.trim()) return showToast('Digite a mesa!', 'error');
      setSending(true);
      try {
        let msg = `🍔 *PEDIDO RÁPIDO*%0A${currentTenant.name}%0A%0A👤 ${name}%0A📍 ${orderType === 'local' ? `Mesa ${tableNum}` : 'Para Viagem'}%0A%0A`;
        cart.forEach(i => msg += `${i.image} ${i.name} x${i.qty} — R$${(parseFloat(i.price) * i.qty).toFixed(2)}%0A`);
        msg += `%0A━━━━━━━━━━━━%0A💰 *TOTAL: R$${total.toFixed(2)}*`;
        await createOrder(currentTenant.id, name, orderType, tableNum, cart, total);
        window.open(`https://wa.me/${currentTenant.whatsapp}?text=${msg}`, '_blank');
        setCart([]);
        showToast('✅ Pedido enviado com sucesso!');
        go('menu');
      } catch (e) {
        showToast('Erro ao enviar: ' + e.message, 'error');
      } finally {
        setSending(false);
      }
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-4 shadow-lg">
          <div className="max-w-2xl mx-auto">
            <button onClick={() => go('menu')} className="flex items-center gap-2 mb-1 opacity-80 hover:opacity-100 transition text-sm">
              <ArrowLeft size={16} /> Voltar ao Cardápio
            </button>
            <h1 className="text-2xl font-bold">Seu Carrinho</h1>
          </div>
        </header>

        <main className="max-w-2xl mx-auto p-4 pb-10 space-y-4">
          {cart.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm mt-4">
              <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">Carrinho vazio</p>
              <button onClick={() => go('menu')} className="mt-4 text-orange-500 font-bold text-sm">Ver cardápio</button>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <span className="text-3xl">{item.image}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.name}</p>
                      <p className="text-orange-500 text-xs">R$ {parseFloat(item.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setCart(cart.map(i => i.id === item.id ? { ...i, qty: Math.max(1, i.qty - 1) } : i))} className="bg-gray-100 hover:bg-gray-200 active:scale-90 p-1.5 rounded-lg transition">
                        <Minus size={13} />
                      </button>
                      <span className="font-bold w-6 text-center text-sm">{item.qty}</span>
                      <button onClick={() => setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i))} className="bg-orange-500 hover:bg-orange-600 active:scale-90 text-white p-1.5 rounded-lg transition">
                        <Plus size={13} />
                      </button>
                      <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="bg-red-50 hover:bg-red-500 text-red-400 hover:text-white active:scale-90 p-1.5 rounded-lg transition ml-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-xl outline-none transition font-medium" />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setOrderType('local')}  className={`py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${orderType === 'local'  ? 'bg-orange-500 text-white shadow' : 'bg-gray-100 text-gray-600'}`}>🪑 Local</button>
                  <button onClick={() => setOrderType('viagem')} className={`py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${orderType === 'viagem' ? 'bg-orange-500 text-white shadow' : 'bg-gray-100 text-gray-600'}`}>🥡 Viagem</button>
                </div>
                {orderType === 'local' && (
                  <input type="text" value={tableNum} onChange={e => setTableNum(e.target.value)} placeholder="Número da mesa" className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-xl outline-none transition font-medium" />
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-700">Total</span>
                  <span className="text-2xl font-black text-orange-500">R$ {total.toFixed(2)}</span>
                </div>
                <button onClick={handleSend} disabled={sending} className="w-full bg-green-500 hover:bg-green-600 active:scale-95 disabled:opacity-60 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg">
                  {sending ? <Spinner size={20} color="text-white" /> : <Send size={20} />}
                  {sending ? 'Enviando...' : 'Enviar via WhatsApp'}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    );
  };

  // ── ADMIN LOGIN ─────────────────────────────────────────────────────────
  const AdminLoginPage = () => {
    const [pass, setPass] = useState('');
    const [show, setShow] = useState(false);
    if (!currentTenant) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8">
          <button onClick={() => go('menu')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-purple-500 transition text-sm font-medium">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={30} className="text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold">Área Admin</h2>
            <p className="text-gray-400 text-sm mt-1">{currentTenant.name}</p>
          </div>
          <div className="relative mb-4">
            <input
              type={show ? 'text' : 'password'}
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && pass === currentTenant.password) go('admin'); }}
              placeholder="Senha do admin"
              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 focus:border-purple-400 rounded-xl outline-none transition font-medium"
            />
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            onClick={() => {
              if (pass === currentTenant.password) go('admin');
              else showToast('Senha incorreta!', 'error');
            }}
            className="w-full bg-purple-500 hover:bg-purple-600 active:scale-95 text-white py-3.5 rounded-xl font-bold transition-all"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  };

  // ── ADMIN PAGE ──────────────────────────────────────────────────────────
  const AdminPage = () => {
    const [wpp, setWpp]     = useState(currentTenant?.whatsapp || '');
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
            <button onClick={() => go('menu')} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95">Sair</button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Plano',    value: currentTenant.plan, color: 'text-purple-500' },
              { label: 'Produtos', value: products.length,    color: 'text-blue-500'   },
              { label: 'Status',   value: 'Ativo',            color: 'text-green-500'  },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
                <p className="text-xs text-gray-400 mb-1 font-medium">{s.label}</p>
                <p className={`text-xl font-black ${s.color} capitalize`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* WhatsApp */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              <Phone size={16} className="text-green-500" /> WhatsApp
            </h3>
            <div className="flex gap-2">
              <input type="tel" value={wpp} onChange={e => setWpp(e.target.value.replace(/[^0-9]/g, ''))} placeholder="5585999999999" className="flex-1 px-4 py-2.5 border-2 border-gray-200 focus:border-purple-400 rounded-xl outline-none text-sm font-medium transition" />
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    await apiUpdate('tenants', 'id', currentTenant.id, { whatsapp: wpp });
                    setCurrentTenant({ ...currentTenant, whatsapp: wpp });
                    showToast('WhatsApp atualizado!');
                  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
                  finally { setSaving(false); }
                }}
                className="bg-purple-500 hover:bg-purple-600 active:scale-95 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
              >
                {saving ? <Spinner size={16} color="text-white" /> : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Produtos */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              <Package size={16} className="text-blue-500" /> Gerenciar Produtos
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
                        <p className="font-bold text-sm">{p.name}</p>
                        <p className="text-xs text-gray-400">R$ {parseFloat(p.price).toFixed(2)}</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const newAvail = !p.available;
                        await apiUpdate('products', 'id', p.id, { available: newAvail });
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

  // ── SAAS LOGIN ──────────────────────────────────────────────────────────
  const SaaSLoginPage = () => {
    const [pass, setPass] = useState('');
    const [show, setShow] = useState(false);

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 sm:p-8">
          <button onClick={() => go('home')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-gray-700 transition text-sm font-medium">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-black">Painel Master</h2>
            <p className="text-gray-400 text-xs mt-1">Acesso restrito ao administrador</p>
          </div>
          <div className="relative mb-4">
            <input
              type={show ? 'text' : 'password'}
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && pass === SAAS_PASSWORD) go('saas-dashboard'); }}
              placeholder="Senha master"
              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 focus:border-gray-700 rounded-xl outline-none transition font-medium"
            />
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            onClick={() => {
              if (pass === SAAS_PASSWORD) go('saas-dashboard');
              else showToast('Senha master incorreta!', 'error');
            }}
            className="w-full bg-gray-900 hover:bg-gray-700 active:scale-95 text-white py-3.5 rounded-xl font-bold transition-all"
          >
            Acessar Painel
          </button>
        </div>
      </div>
    );
  };

  // ── SAAS DASHBOARD ───────────────────────────────────────────────────────
  const SaaSDashboard = () => {
    const [tenants, setTenants]     = useState([]);
    const [dashLoading, setDashLoading] = useState(true);

    // Senha Master
    const [showMasterPass, setShowMasterPass]   = useState(false);
    const [masterPassForm, setMasterPassForm]   = useState({ current: '', next: '', confirm: '' });
    const [masterPassLocal, setMasterPassLocal] = useState(SAAS_PASSWORD); // estado local para comparação

    // Senha de Loja
    const [editingId, setEditingId] = useState(null);
    const [storePass, setStorePass] = useState('');
    const [showStorePass, setShowStorePass] = useState(false);

    // Refresh
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
      setRefreshing(true);
      try {
        const rows = await apiFetch('tenants', { order: { column: 'created_at', ascending: false } });
        setTenants(rows);
      } catch (e) {
        showToast('Erro ao carregar dados: ' + e.message, 'error');
      } finally {
        setDashLoading(false);
        setRefreshing(false);
      }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id) => {
      if (!window.confirm('Excluir permanentemente esta lanchonete?')) return;
      await apiDelete('tenants', 'id', id);
      setTenants(t => t.filter(x => x.id !== id));
      showToast('Lanchonete excluída.');
    };

    // Altera senha da lanchonete
    const handleStorePasswordSave = async (id) => {
      if (!storePass || storePass.length < 3) {
        showToast('Senha muito curta (mín. 3 caracteres)', 'error');
        return;
      }
      try {
        await apiUpdate('tenants', 'id', id, { password: storePass });
        setTenants(t => t.map(x => x.id === id ? { ...x, password: storePass } : x));
        setEditingId(null);
        setStorePass('');
        showToast('✅ Senha da lanchonete atualizada!');
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    };

    // Altera senha master (apenas localmente — para persistir seria necessário variável de ambiente)
    const handleMasterPasswordSave = () => {
      if (!masterPassForm.current) {
        showToast('Digite a senha atual', 'error'); return;
      }
      if (masterPassForm.current !== masterPassLocal) {
        showToast('Senha atual incorreta!', 'error'); return;
      }
      if (!masterPassForm.next || masterPassForm.next.length < 4) {
        showToast('Nova senha muito curta (mín. 4 caracteres)', 'error'); return;
      }
      if (masterPassForm.next !== masterPassForm.confirm) {
        showToast('As novas senhas não coincidem!', 'error'); return;
      }
      setMasterPassLocal(masterPassForm.next);
      setMasterPassForm({ current: '', next: '', confirm: '' });
      setShowMasterPass(false);
      showToast('✅ Senha master alterada! (válida até recarregar a página — configure VITE_SAAS_PASSWORD no Vercel para persistir)');
    };

    const trialCount = tenants.filter(t => t.plan === 'trial').length;
    const proCount   = tenants.filter(t => t.plan === 'pro').length;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-gray-900 text-white px-4 py-4 sticky top-0 z-40 shadow-xl">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => go('home')} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition active:scale-90">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-lg font-black">Painel Master</h1>
                <p className="text-xs text-gray-400">Gestão da Plataforma</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                disabled={refreshing}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition active:scale-90 disabled:opacity-40"
                title="Atualizar lista"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setShowMasterPass(!showMasterPass)}
                className={`p-2 rounded-xl transition active:scale-90 ${showMasterPass ? 'bg-white text-gray-900' : 'bg-white/10 hover:bg-white/20'}`}
                title="Alterar senha master"
              >
                <Key size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto p-4 space-y-5">

          {/* ── Painel: Alterar Senha Master ────────────────────────────── */}
          {showMasterPass && (
            <div className="bg-white border-2 border-gray-900/10 rounded-2xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-gray-700" />
                  <h3 className="font-black text-gray-900">Alterar Senha Master</h3>
                </div>
                <button onClick={() => setShowMasterPass(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Senha Atual</label>
                  <input
                    type="password"
                    value={masterPassForm.current}
                    onChange={e => setMasterPassForm(f => ({ ...f, current: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 focus:border-gray-700 rounded-xl outline-none text-sm font-medium transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Nova Senha</label>
                  <input
                    type="password"
                    value={masterPassForm.next}
                    onChange={e => setMasterPassForm(f => ({ ...f, next: e.target.value }))}
                    placeholder="Mín. 4 caracteres"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 focus:border-gray-700 rounded-xl outline-none text-sm font-medium transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Confirmar</label>
                  <input
                    type="password"
                    value={masterPassForm.confirm}
                    onChange={e => setMasterPassForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Repita a nova senha"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 focus:border-gray-700 rounded-xl outline-none text-sm font-medium transition"
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <button
                  onClick={handleMasterPasswordSave}
                  className="bg-gray-900 hover:bg-gray-700 active:scale-95 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
                >
                  Atualizar Senha Master
                </button>
                <p className="text-xs text-gray-400">
                  ⚠️ Para persistir após recarregar, defina <code className="bg-gray-100 px-1 rounded font-mono">VITE_SAAS_PASSWORD</code> no Vercel.
                </p>
              </div>
            </div>
          )}

          {/* ── Stats ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center border border-gray-100">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Store size={18} className="text-orange-500" />
              </div>
              <p className="text-xs text-gray-400">Lanchonetes</p>
              <p className="text-2xl font-black text-orange-500">{tenants.length}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center border border-gray-100">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Users size={18} className="text-green-500" />
              </div>
              <p className="text-xs text-gray-400">Trial</p>
              <p className="text-2xl font-black text-green-500">{trialCount}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center border border-gray-100">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <BarChart2 size={18} className="text-blue-500" />
              </div>
              <p className="text-xs text-gray-400">Pro</p>
              <p className="text-2xl font-black text-blue-500">{proCount}</p>
            </div>
          </div>

          {/* ── Lista de lanchonetes ─────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-black text-gray-800">Base de Clientes</h3>
              <span className="text-xs font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-400 uppercase">Tempo Real</span>
            </div>

            {dashLoading ? (
              <div className="flex justify-center py-12"><Spinner size={32} color="text-gray-400" /></div>
            ) : tenants.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-300 shadow-sm">
                <Store size={40} className="mx-auto mb-2 opacity-40" />
                <p className="font-bold">Nenhuma lanchonete cadastrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tenants.map(store => (
                  <div key={store.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                    {/* Cabeçalho do card */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center font-black text-orange-500 text-xl shrink-0">
                            {store.name?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-gray-900 truncate">{store.name}</h4>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <span className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-lg font-bold border border-orange-100">@{store.slug}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${store.plan === 'pro' ? 'bg-blue-50 text-blue-500 border border-blue-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                {store.plan}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-1">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Phone size={10} /> {store.whatsapp}
                              </span>
                              {store.created_at && (
                                <span className="text-xs text-gray-300 flex items-center gap-1">
                                  <Calendar size={10} /> {new Date(store.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => { setCurrentTenant(store); go('menu', store.slug); }}
                            className="p-2 bg-orange-50 hover:bg-orange-500 text-orange-400 hover:text-white rounded-xl transition active:scale-90"
                            title="Ver cardápio"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(editingId === store.id ? null : store.id);
                              setStorePass('');
                            }}
                            className={`p-2 rounded-xl transition active:scale-90 ${editingId === store.id ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                            title="Resetar senha da loja"
                          >
                            <Key size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(store.id)}
                            className="p-2 bg-red-50 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition active:scale-90"
                            title="Excluir lanchonete"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Painel reset de senha da loja */}
                    {editingId === store.id && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                          <Key size={11} /> Resetar Senha do Admin — {store.name}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-xs text-gray-400 font-bold mb-1 block">Senha atual</label>
                            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 font-mono text-sm font-bold text-gray-600 flex items-center justify-between">
                              <span>{store.password}</span>
                              <Key size={12} className="text-gray-300" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 font-bold mb-1 block">Nova senha provisória</label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <input
                                  type={showStorePass ? 'text' : 'password'}
                                  value={storePass}
                                  onChange={e => setStorePass(e.target.value)}
                                  placeholder="Mín. 3 caracteres"
                                  className="w-full bg-white border-2 border-gray-200 focus:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition pr-10"
                                />
                                <button onClick={() => setShowStorePass(!showStorePass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                  {showStorePass ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                              <button
                                onClick={() => handleStorePasswordSave(store.id)}
                                className="bg-gray-900 hover:bg-gray-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                          💡 Após salvar, comunique a senha provisória ao dono da lanchonete. Oriente-o a alterá-la no próprio painel admin.
                        </p>
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

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <>
      {view === 'loading'        && <LoadingOverlay text="Iniciando..." />}
      {view === 'home'           && <HomePage />}
      {view === 'select'         && <SelectPage />}
      {view === 'register'       && <RegisterPage />}
      {view === 'menu'           && <MenuPage />}
      {view === 'cart'           && <CartPage />}
      {view === 'admin-login'    && <AdminLoginPage />}
      {view === 'admin'          && <AdminPage />}
      {view === 'saas-login'     && <SaaSLoginPage />}
      {view === 'saas-dashboard' && <SaaSDashboard />}

      {/* Toast global */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
