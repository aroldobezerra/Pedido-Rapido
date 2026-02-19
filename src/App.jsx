import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingCart, Plus, Minus, Trash2, Send, Lock, ArrowLeft, Store, Loader,
  Zap, Shield, Eye, EyeOff, Trash, Phone, Calendar, Key, ChevronRight,
  Package, BarChart2, Users, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Settings, UtensilsCrossed, ClipboardList, LayoutDashboard, LogOut,
  ChefHat, Bell, Edit2, ToggleLeft, ToggleRight, PlusCircle, X
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
  if (params.eq) url.searchParams.set(`${params.eq.column}`, `eq.${params.eq.value}`);
  if (params.limit) url.searchParams.set('limit', String(params.limit));
  if (params.order) url.searchParams.set('order', `${params.order.column}.${params.order.ascending ? 'asc' : 'desc'}`);
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
    headers: headers({ 'Prefer': 'return=representation' }),
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

const Toast = ({ msg, type = 'success', onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const styles = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500' };
  const Icon = type === 'success' ? CheckCircle : type === 'warning' ? AlertTriangle : XCircle;
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl text-white shadow-2xl text-sm font-bold max-w-sm w-full ${styles[type] || styles.error}`}>
      <Icon size={18} />
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
};

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────

export default function PedidoRapido() {
  const [view, setView]                   = useState('loading');
  const [currentTenant, setCurrentTenant] = useState(null);
  const [products, setProducts]           = useState([]);
  const [cart, setCart]                   = useState([]);
  const [loading, setLoading]             = useState(false);
  const [toast, setToast]                 = useState(null);
  const [tenantAdminAuth, setTenantAdminAuth] = useState(false);
  const [adminTab, setAdminTab]           = useState('resumo');

  // SAAS Master
  const [saasAuth, setSaasAuth]           = useState(false);
  const [saasPassword, setSaasPassword]   = useState('');
  const [saasShowPw, setSaasShowPw]       = useState(false);
  const [tenants, setTenants]             = useState([]);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── Helpers de produto ──────────────────────────────────────────────────
  const isAvailable = (p) => p.available !== false && p.is_available !== false;

  // ── Recarregar produtos do tenant atual ─────────────────────────────────
  const reloadProducts = useCallback(async (tenantId) => {
    try {
      const prods = await apiFetch('products', { eq: { column: 'store_id', value: tenantId } });
      setProducts(prods || []);
    } catch (e) {
      showToast('Erro ao recarregar produtos', 'error');
    }
  }, []);

  // ── Carregar tenant pela URL ────────────────────────────────────────────
  const loadTenantFromURL = useCallback(async (slug) => {
    if (!slug) { setView('home'); return; }
    if (slug === 'master') { setView('saas-login'); return; }

    setLoading(true);
    try {
      const rows = await apiFetch('tenants', { eq: { column: 'slug', value: slug } });
      const tenant = rows[0] || null;
      if (tenant) {
        setCurrentTenant(tenant);
        try {
          const prods = await apiFetch('products', { eq: { column: 'store_id', value: tenant.id } });
          setProducts(prods || []);
        } catch {
          showToast('Não foi possível carregar o cardápio', 'error');
        }
        setView('menu');
        if (window.location.pathname !== `/${slug}`) {
          window.history.replaceState({}, '', `/${slug}`);
        }
      } else {
        showToast('Lanchonete não encontrada', 'error');
        window.history.replaceState({}, '', '/');
        setView('home');
      }
    } catch (e) {
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

  // ── Carregar todos os tenants (master) ──────────────────────────────────
  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiFetch('tenants', {});
      setTenants(rows || []);
    } catch (e) {
      showToast('Erro ao carregar lojas', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Navegação ───────────────────────────────────────────────────────────
  const go = (newView, slug = null) => {
    if (slug) window.history.pushState({}, '', `/${slug}`);
    else if (newView === 'home') window.history.pushState({}, '', '/');
    setView(newView);
  };

  // ── CART helpers ────────────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    showToast(`${product.name} adicionado!`);
  };

  const updateQty = (id, delta) => {
    setCart(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0);
      return updated;
    });
  };

  const cartTotal = cart.reduce((sum, i) => sum + parseFloat(i.price || 0) * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  // ── Enviar pedido ───────────────────────────────────────────────────────
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sendingOrder, setSendingOrder] = useState(false);

  const submitOrder = async () => {
    if (!customerName.trim()) { showToast('Informe seu nome', 'error'); return; }
    if (cart.length === 0) { showToast('Carrinho vazio', 'error'); return; }
    setSendingOrder(true);
    try {
      const order = await apiInsert('orders', {
        store_id: currentTenant.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: cart,
        total: cartTotal,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      showToast('Pedido enviado com sucesso! 🎉');
      go('menu');
    } catch (e) {
      showToast(`Erro ao enviar pedido: ${e.message}`, 'error');
    } finally {
      setSendingOrder(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════
  // ── HOME PAGE ───────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════
  const HomePage = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-2xl">
        <Zap size={96} className="mx-auto text-orange-500 mb-6" />
        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-4">Pedido Rápido</h1>
        <p className="text-xl text-gray-700 mb-10">Cardápio digital simples e rápido para sua lanchonete</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-md mx-auto">
          <button
            onClick={() => go('register')}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-5 px-8 rounded-2xl font-bold text-lg shadow-lg hover:brightness-110 transition active:scale-95"
          >
            Começar Grátis (7 dias)
          </button>
          <button
            onClick={() => go('select')}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-5 px-8 rounded-2xl font-bold text-lg shadow-lg hover:brightness-110 transition active:scale-95"
          >
            Acessar minha loja
          </button>
        </div>

        <p className="mt-8 text-gray-500 text-sm">
          Já tem uma loja? Digite o identificador (ex: /comabem) na URL
        </p>

        {/* Acesso Master discreto */}
        <button
          onClick={() => go('saas-login')}
          className="mt-10 flex items-center gap-2 mx-auto text-gray-400 hover:text-gray-600 text-xs transition"
        >
          <Shield size={13} /> Acesso Master
        </button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════
  // ── SAAS LOGIN (Master) ─────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════
  const SaasLoginPage = () => {
    const [pw, setPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [err, setErr] = useState('');

    const handleLogin = () => {
      if (pw === SAAS_PASSWORD) {
        setSaasAuth(true);
        loadTenants();
        setView('saas-dashboard');
      } else {
        setErr('Senha incorreta');
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm">
          <div className="text-center mb-8">
            <Shield size={48} className="mx-auto text-orange-500 mb-3" />
            <h2 className="text-2xl font-extrabold text-gray-900">Master Admin</h2>
            <p className="text-gray-500 text-sm mt-1">Acesso restrito</p>
          </div>

          <div className="relative mb-4">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Senha master"
              value={pw}
              onChange={e => { setPw(e.target.value); setErr(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:border-orange-400 outline-none"
            />
            <button
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {err && <p className="text-red-500 text-sm mb-3 text-center">{err}</p>}

          <button
            onClick={handleLogin}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-bold hover:brightness-110 transition"
          >
            Entrar
          </button>

          <button onClick={() => go('home')} className="w-full mt-3 text-gray-400 text-sm hover:text-gray-600 transition flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> Voltar
          </button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // ── SAAS DASHBOARD (Master) ─────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════
  const SaasDashboard = () => {
    const [showNewTenant, setShowNewTenant] = useState(false);
    const [newName, setNewName] = useState('');
    const [newSlug, setNewSlug] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newPw, setNewPw] = useState('');
    const [newExpiry, setNewExpiry] = useState('');
    const [saving, setSaving] = useState(false);

    const createTenant = async () => {
      if (!newName.trim() || !newSlug.trim()) { showToast('Nome e slug obrigatórios', 'error'); return; }
      setSaving(true);
      try {
        await apiInsert('tenants', {
          name: newName,
          slug: newSlug.toLowerCase().replace(/\s+/g, '-'),
          phone: newPhone,
          password: newPw || 'admin123',
          trial_expires_at: newExpiry || null,
          active: true,
          created_at: new Date().toISOString(),
        });
        showToast('Loja criada com sucesso!');
        setShowNewTenant(false);
        setNewName(''); setNewSlug(''); setNewPhone(''); setNewPw(''); setNewExpiry('');
        loadTenants();
      } catch (e) {
        showToast(`Erro: ${e.message}`, 'error');
      } finally {
        setSaving(false);
      }
    };

    const toggleActive = async (t) => {
      try {
        await apiUpdate('tenants', 'id', t.id, { active: !t.active });
        setTenants(prev => prev.map(x => x.id === t.id ? { ...x, active: !x.active } : x));
        showToast(t.active ? 'Loja desativada' : 'Loja ativada');
      } catch (e) {
        showToast('Erro ao atualizar', 'error');
      }
    };

    const deleteTenant = async (t) => {
      if (!window.confirm(`Excluir loja "${t.name}"? Esta ação é irreversível.`)) return;
      try {
        await apiDelete('tenants', 'id', t.id);
        setTenants(prev => prev.filter(x => x.id !== t.id));
        showToast('Loja excluída');
      } catch (e) {
        showToast('Erro ao excluir', 'error');
      }
    };

    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3">
            <Shield size={28} className="text-orange-400" />
            <div>
              <h1 className="text-xl font-extrabold">Master Admin</h1>
              <p className="text-gray-400 text-xs">{tenants.length} lojas cadastradas</p>
            </div>
          </div>
          <button
            onClick={() => { setSaasAuth(false); go('home'); }}
            className="flex items-center gap-2 text-gray-300 hover:text-white text-sm transition"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-4 shadow text-center">
              <p className="text-3xl font-extrabold text-orange-500">{tenants.length}</p>
              <p className="text-gray-500 text-sm">Total de lojas</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow text-center">
              <p className="text-3xl font-extrabold text-green-500">{tenants.filter(t => t.active).length}</p>
              <p className="text-gray-500 text-sm">Lojas ativas</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow text-center col-span-2 sm:col-span-1">
              <p className="text-3xl font-extrabold text-red-500">{tenants.filter(t => !t.active).length}</p>
              <p className="text-gray-500 text-sm">Inativas</p>
            </div>
          </div>

          {/* Botão nova loja */}
          <button
            onClick={() => setShowNewTenant(true)}
            className="w-full mb-6 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:brightness-110 transition flex items-center justify-center gap-2"
          >
            <PlusCircle size={22} /> Nova Loja
          </button>

          {/* Lista de tenants */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-12"><Spinner size={40} /></div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Store size={48} className="mx-auto mb-3 opacity-30" />
                <p>Nenhuma loja cadastrada</p>
              </div>
            ) : tenants.map(t => (
              <div key={t.id} className="bg-white rounded-2xl p-4 shadow flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${t.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{t.name}</p>
                  <p className="text-sm text-gray-500">/{t.slug}</p>
                  {t.trial_expires_at && (
                    <p className="text-xs text-orange-500">Expira: {new Date(t.trial_expires_at).toLocaleDateString('pt-BR')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(`/${t.slug}`, '_blank')}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                    title="Abrir loja"
                  >
                    <Store size={16} />
                  </button>
                  <button
                    onClick={() => toggleActive(t)}
                    className={`p-2 rounded-lg transition ${t.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                    title={t.active ? 'Desativar' : 'Ativar'}
                  >
                    {t.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => deleteTenant(t)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"
                    title="Excluir"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal nova loja */}
        {showNewTenant && (
          <Overlay>
            <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-extrabold">Nova Loja</h3>
                <button onClick={() => setShowNewTenant(false)} className="text-gray-400 hover:text-gray-700">
                  <X size={22} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  placeholder="Nome da loja *"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"
                />
                <input
                  placeholder="Slug (ex: comabem) *"
                  value={newSlug}
                  onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"
                />
                <input
                  placeholder="WhatsApp (opcional)"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"
                />
                <input
                  placeholder="Senha de admin (padrão: admin123)"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"
                />
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Data de expiração do trial</label>
                  <input
                    type="date"
                    value={newExpiry}
                    onChange={e => setNewExpiry(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewTenant(false)}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={createTenant}
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Spinner size={18} color="text-white" /> : <PlusCircle size={18} />}
                  Criar Loja
                </button>
              </div>
            </div>
          </Overlay>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // ── MENU PAGE ───────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════
  const MenuPage = () => {
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [adminPw, setAdminPw] = useState('');
    const [adminErr, setAdminErr] = useState('');

    if (!currentTenant) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center p-8">
            <Spinner size={48} />
            <h2 className="text-2xl font-bold mt-4">Carregando loja...</h2>
          </div>
        </div>
      );
    }

    const available = products.filter(isAvailable);

    const handleAdminLogin = () => {
      const tenantPw = currentTenant.password || 'admin123';
      if (adminPw === tenantPw) {
        setTenantAdminAuth(true);
        setShowAdminLogin(false);
        setAdminTab('resumo');
        setView('tenant-admin');
      } else {
        setAdminErr('Senha incorreta');
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-extrabold text-orange-600">{currentTenant.name}</h1>
              <p className="text-gray-500 text-sm">Cardápio Digital</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => go('cart')}
                className="relative bg-orange-500 text-white p-3 rounded-2xl shadow-lg hover:bg-orange-600 transition"
              >
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {available.length === 0 ? (
            <div className="text-center py-24 text-gray-500">
              <Package size={80} className="mx-auto mb-4 opacity-30" />
              <h2 className="text-2xl font-bold mb-2">Cardápio vazio</h2>
              <p className="mb-6">Nenhum item disponível no momento.</p>
              <button onClick={() => window.location.reload()} className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition">
                <RefreshCw size={16} className="inline mr-2" />Atualizar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {available.map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition">
                  <div className="h-44 bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center text-7xl">
                    {p.image || '🍔'}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold mb-1">{p.name}</h3>
                    <p className="text-gray-500 text-sm mb-3 line-clamp-2">{p.description || 'Delícia imperdível'}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-extrabold text-orange-600">
                        R$ {parseFloat(p.price || 0).toFixed(2)}
                      </span>
                      <button
                        onClick={() => addToCart(p)}
                        className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-orange-600 transition active:scale-95 flex items-center gap-1"
                      >
                        <Plus size={16} /> Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botão admin discreto no rodapé */}
        <div className="fixed bottom-4 left-4 z-40">
          <button
            onClick={() => {
              if (tenantAdminAuth) { setView('tenant-admin'); }
              else setShowAdminLogin(true);
            }}
            className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:bg-gray-700 transition opacity-70 hover:opacity-100"
          >
            <Lock size={13} /> Admin
          </button>
        </div>

        {/* Modal login admin do tenant */}
        {showAdminLogin && (
          <Overlay>
            <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-extrabold flex items-center gap-2">
                  <Lock size={20} className="text-orange-500" /> Admin da Loja
                </h3>
                <button onClick={() => { setShowAdminLogin(false); setAdminErr(''); }} className="text-gray-400 hover:text-gray-700">
                  <X size={22} />
                </button>
              </div>
              <input
                type="password"
                placeholder="Senha de administrador"
                value={adminPw}
                onChange={e => { setAdminPw(e.target.value); setAdminErr(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none mb-3"
                autoFocus
              />
              {adminErr && <p className="text-red-500 text-sm mb-3">{adminErr}</p>}
              <button
                onClick={handleAdminLogin}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-bold hover:brightness-110 transition"
              >
                Entrar
              </button>
            </div>
          </Overlay>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // ── CART PAGE ───────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════
  const CartPage = () => (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => go('menu')} className="text-gray-500 hover:text-gray-800 transition">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-extrabold">Seu Pedido</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {cart.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <ShoppingCart size={64} className="mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-bold mb-2">Carrinho vazio</h2>
            <button onClick={() => go('menu')} className="mt-4 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition">
              Ver cardápio
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {cart.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-4 shadow flex items-center gap-4">
                  <div className="text-3xl">{item.image || '🍔'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{item.name}</p>
                    <p className="text-orange-600 font-bold">R$ {parseFloat(item.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-red-100 transition">
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-green-100 transition">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Dados do cliente */}
            <div className="bg-white rounded-2xl p-5 shadow mb-6">
              <h3 className="font-bold mb-4 text-gray-800">Seus dados</h3>
              <input
                placeholder="Seu nome *"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:border-orange-400 outline-none"
              />
              <input
                placeholder="WhatsApp (opcional)"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"
              />
            </div>

            {/* Total e enviar */}
            <div className="bg-white rounded-2xl p-5 shadow">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-gray-600">Total</span>
                <span className="text-2xl font-extrabold text-orange-600">R$ {cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={submitOrder}
                disabled={sendingOrder}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingOrder ? <Spinner size={20} color="text-white" /> : <Send size={20} />}
                {sendingOrder ? 'Enviando...' : 'Enviar Pedido'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════
  // ── TENANT ADMIN PANEL ──────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════
  const TenantAdminPage = () => {
    const [orders, setOrders]     = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [showNewProduct, setShowNewProduct] = useState(false);

    // Form produto
    const [pName, setPName]       = useState('');
    const [pPrice, setPPrice]     = useState('');
    const [pDesc, setPDesc]       = useState('');
    const [pImage, setPImage]     = useState('');
    const [pSaving, setPSaving]   = useState(false);

    useEffect(() => {
      if (adminTab === 'cozinha') loadOrders();
      if (adminTab === 'cardapio') reloadProducts(currentTenant.id);
      if (adminTab === 'resumo') { loadOrders(); reloadProducts(currentTenant.id); }
    }, [adminTab]);

    const loadOrders = async () => {
      setLoadingData(true);
      try {
        const rows = await apiFetch('orders', {
          eq: { column: 'store_id', value: currentTenant.id },
          order: { column: 'created_at', ascending: false },
        });
        setOrders(rows || []);
      } catch (e) {
        showToast('Erro ao carregar pedidos', 'error');
      } finally {
        setLoadingData(false);
      }
    };

    const updateOrderStatus = async (orderId, status) => {
      try {
        await apiUpdate('orders', 'id', orderId, { status });
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        showToast('Status atualizado!');
      } catch {
        showToast('Erro ao atualizar status', 'error');
      }
    };

    const startEditProduct = (p) => {
      setEditProduct(p);
      setPName(p.name);
      setPPrice(String(p.price));
      setPDesc(p.description || '');
      setPImage(p.image || '');
      setShowNewProduct(true);
    };

    const startNewProduct = () => {
      setEditProduct(null);
      setPName(''); setPPrice(''); setPDesc(''); setPImage('');
      setShowNewProduct(true);
    };

    const saveProduct = async () => {
      if (!pName.trim() || !pPrice) { showToast('Nome e preço obrigatórios', 'error'); return; }
      setPSaving(true);
      try {
        if (editProduct) {
          await apiUpdate('products', 'id', editProduct.id, {
            name: pName, price: parseFloat(pPrice), description: pDesc, image: pImage,
          });
          showToast('Produto atualizado!');
        } else {
          await apiInsert('products', {
            store_id: currentTenant.id,
            name: pName,
            price: parseFloat(pPrice),
            description: pDesc,
            image: pImage,
            available: true,
            created_at: new Date().toISOString(),
          });
          showToast('Produto criado!');
        }
        setShowNewProduct(false);
        reloadProducts(currentTenant.id);
      } catch (e) {
        showToast(`Erro: ${e.message}`, 'error');
      } finally {
        setPSaving(false);
      }
    };

    const toggleProductAvailability = async (p) => {
      const newVal = !(p.available !== false);
      try {
        await apiUpdate('products', 'id', p.id, { available: newVal });
        setProducts(prev => prev.map(x => x.id === p.id ? { ...x, available: newVal } : x));
        showToast(newVal ? 'Produto ativado' : 'Produto desativado');
      } catch {
        showToast('Erro ao atualizar', 'error');
      }
    };

    const deleteProduct = async (p) => {
      if (!window.confirm(`Excluir "${p.name}"?`)) return;
      try {
        await apiDelete('products', 'id', p.id);
        setProducts(prev => prev.filter(x => x.id !== p.id));
        showToast('Produto excluído');
      } catch {
        showToast('Erro ao excluir', 'error');
      }
    };

    const statusColors = {
      pending:    'bg-yellow-100 text-yellow-800',
      preparing:  'bg-blue-100 text-blue-800',
      ready:      'bg-green-100 text-green-800',
      delivered:  'bg-gray-100 text-gray-600',
      cancelled:  'bg-red-100 text-red-700',
    };

    const statusLabels = {
      pending:   'Pendente',
      preparing: 'Preparando',
      ready:     'Pronto',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };

    const tabs = [
      { id: 'resumo',   label: 'Resumo',   Icon: LayoutDashboard },
      { id: 'cozinha',  label: 'Cozinha',  Icon: ChefHat },
      { id: 'cardapio', label: 'Cardápio', Icon: UtensilsCrossed },
      { id: 'ajustes',  label: 'Ajustes',  Icon: Settings },
    ];

    return (
      <div className="min-h-screen bg-gray-100 pb-24">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 shadow-lg">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-xl font-extrabold">{currentTenant.name}</h1>
              <p className="text-orange-100 text-xs">Painel Administrativo</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setTenantAdminAuth(false); go('menu'); }}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm transition"
              >
                <Store size={15} /> Cardápio
              </button>
              <button
                onClick={() => { setTenantAdminAuth(false); setView('menu'); }}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm transition"
              >
                <LogOut size={15} /> Sair
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b shadow-sm sticky top-0 z-20">
          <div className="max-w-5xl mx-auto flex overflow-x-auto">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setAdminTab(id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition ${
                  adminTab === id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon size={17} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">

          {/* ── RESUMO ── */}
          {adminTab === 'resumo' && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl p-4 shadow text-center">
                  <p className="text-3xl font-extrabold text-orange-500">{orders.length}</p>
                  <p className="text-gray-500 text-xs">Total Pedidos</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow text-center">
                  <p className="text-3xl font-extrabold text-yellow-500">{orders.filter(o => o.status === 'pending').length}</p>
                  <p className="text-gray-500 text-xs">Pendentes</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow text-center">
                  <p className="text-3xl font-extrabold text-green-500">{orders.filter(o => o.status === 'delivered').length}</p>
                  <p className="text-gray-500 text-xs">Entregues</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow text-center">
                  <p className="text-3xl font-extrabold text-blue-500">{products.filter(isAvailable).length}</p>
                  <p className="text-gray-500 text-xs">Itens Ativos</p>
                </div>
              </div>

              <h3 className="font-bold text-gray-700 mb-3">Últimos pedidos</h3>
              {loadingData ? <div className="flex justify-center py-8"><Spinner /></div> : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map(o => (
                    <div key={o.id} className="bg-white rounded-2xl p-4 shadow flex justify-between items-center">
                      <div>
                        <p className="font-bold">{o.customer_name}</p>
                        <p className="text-sm text-gray-500">R$ {parseFloat(o.total || 0).toFixed(2)}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[o.status] || 'bg-gray-100'}`}>
                        {statusLabels[o.status] || o.status}
                      </span>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum pedido ainda</p>}
                </div>
              )}
            </div>
          )}

          {/* ── COZINHA ── */}
          {adminTab === 'cozinha' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-extrabold text-gray-800">Pedidos da Cozinha</h2>
                <button onClick={loadOrders} className="text-orange-500 hover:text-orange-600 transition">
                  <RefreshCw size={20} />
                </button>
              </div>

              {loadingData ? (
                <div className="flex justify-center py-12"><Spinner size={40} /></div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <ClipboardList size={56} className="mx-auto mb-3 opacity-30" />
                  <p>Nenhum pedido ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(o => (
                    <div key={o.id} className={`bg-white rounded-2xl p-5 shadow border-l-4 ${
                      o.status === 'pending'   ? 'border-yellow-400' :
                      o.status === 'preparing' ? 'border-blue-400' :
                      o.status === 'ready'     ? 'border-green-400' :
                      'border-gray-200'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-extrabold text-lg">{o.customer_name}</p>
                          {o.customer_phone && <p className="text-sm text-gray-500">{o.customer_phone}</p>}
                          <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleTimeString('pt-BR')}</p>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColors[o.status] || 'bg-gray-100'}`}>
                          {statusLabels[o.status] || o.status}
                        </span>
                      </div>

                      {/* Itens do pedido */}
                      <div className="mb-3 space-y-1">
                        {(Array.isArray(o.items) ? o.items : []).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.qty}x {item.name}</span>
                            <span className="text-gray-500">R$ {(item.price * item.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-bold text-orange-600">Total: R$ {parseFloat(o.total || 0).toFixed(2)}</span>
                        <div className="flex gap-2">
                          {o.status === 'pending' && (
                            <button onClick={() => updateOrderStatus(o.id, 'preparing')} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600 transition">
                              Preparar
                            </button>
                          )}
                          {o.status === 'preparing' && (
                            <button onClick={() => updateOrderStatus(o.id, 'ready')} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-600 transition">
                              Pronto!
                            </button>
                          )}
                          {o.status === 'ready' && (
                            <button onClick={() => updateOrderStatus(o.id, 'delivered')} className="bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-700 transition">
                              Entregue
                            </button>
                          )}
                          {(o.status !== 'cancelled' && o.status !== 'delivered') && (
                            <button onClick={() => updateOrderStatus(o.id, 'cancelled')} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200 transition">
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CARDÁPIO (produtos) ── */}
          {adminTab === 'cardapio' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-extrabold text-gray-800">Gerenciar Cardápio</h2>
                <button
                  onClick={startNewProduct}
                  className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-600 transition text-sm"
                >
                  <PlusCircle size={17} /> Novo Item
                </button>
              </div>

              <div className="space-y-3">
                {products.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Package size={56} className="mx-auto mb-3 opacity-30" />
                    <p>Nenhum produto cadastrado</p>
                  </div>
                ) : products.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl p-4 shadow flex items-center gap-4">
                    <div className="text-3xl w-12 text-center">{p.image || '🍔'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{p.name}</p>
                      <p className="text-orange-600 font-bold text-sm">R$ {parseFloat(p.price || 0).toFixed(2)}</p>
                      {p.description && <p className="text-gray-400 text-xs truncate">{p.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleProductAvailability(p)}
                        className={`p-2 rounded-lg transition ${isAvailable(p) ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                        title={isAvailable(p) ? 'Desativar' : 'Ativar'}
                      >
                        {isAvailable(p) ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                      <button
                        onClick={() => startEditProduct(p)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteProduct(p)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"
                        title="Excluir"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal produto */}
              {showNewProduct && (
                <Overlay>
                  <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="text-xl font-extrabold">{editProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                      <button onClick={() => setShowNewProduct(false)} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
                    </div>
                    <div className="space-y-3">
                      <input placeholder="Nome do produto *" value={pName} onChange={e => setPName(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                      <input placeholder="Preço (ex: 15.90) *" value={pPrice} onChange={e => setPPrice(e.target.value)} type="number" step="0.01" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                      <textarea placeholder="Descrição (opcional)" value={pDesc} onChange={e => setPDesc(e.target.value)} rows={2} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none resize-none" />
                      <input placeholder="Emoji (ex: 🍔)" value={pImage} onChange={e => setPImage(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => setShowNewProduct(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition">Cancelar</button>
                      <button onClick={saveProduct} disabled={pSaving} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2">
                        {pSaving ? <Spinner size={18} color="text-white" /> : <CheckCircle size={18} />}
                        {editProduct ? 'Salvar' : 'Criar'}
                      </button>
                    </div>
                  </div>
                </Overlay>
              )}
            </div>
          )}

          {/* ── AJUSTES ── */}
          {adminTab === 'ajustes' && (
            <AjustesTab tenant={currentTenant} onSave={(updated) => setCurrentTenant(updated)} showToast={showToast} />
          )}

        </div>
      </div>
    );
  };

  // ── AJUSTES TAB ─────────────────────────────────────────────────────
  const AjustesTab = ({ tenant, onSave, showToast }) => {
    const [name, setName]   = useState(tenant.name || '');
    const [phone, setPhone] = useState(tenant.phone || '');
    const [pw, setPw]       = useState('');
    const [saving, setSaving] = useState(false);

    const save = async () => {
      setSaving(true);
      try {
        const data = { name, phone };
        if (pw.trim()) data.password = pw;
        await apiUpdate('tenants', 'id', tenant.id, data);
        onSave({ ...tenant, ...data });
        showToast('Configurações salvas!');
      } catch (e) {
        showToast(`Erro: ${e.message}`, 'error');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="max-w-md">
        <h2 className="text-lg font-extrabold text-gray-800 mb-5">Ajustes da Loja</h2>
        <div className="bg-white rounded-2xl p-5 shadow space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-600 block mb-1">Nome da Loja</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-600 block mb-1">WhatsApp</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(85) 99999-9999" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-600 block mb-1">Nova senha de admin (deixe em branco para não alterar)</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Nova senha" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
          </div>

          <div className="pt-2">
            <label className="text-sm font-bold text-gray-600 block mb-1">Link do cardápio</label>
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-orange-600 font-mono break-all">
              {window.location.origin}/{tenant.slug}
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-bold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Spinner size={18} color="text-white" /> : <CheckCircle size={18} />}
            Salvar Alterações
          </button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // ── RENDER PRINCIPAL ────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {loading && view !== 'menu' && <LoadingOverlay text="Carregando..." />}

      {view === 'loading'       && <LoadingOverlay text="Iniciando..." />}
      {view === 'home'          && <HomePage />}
      {view === 'saas-login'    && <SaasLoginPage />}
      {view === 'saas-dashboard'&& <SaasDashboard />}
      {view === 'menu'          && <MenuPage />}
      {view === 'cart'          && <CartPage />}
      {view === 'tenant-admin'  && <TenantAdminPage />}

      {view === 'register' && (
        <div className="min-h-screen flex items-center justify-center bg-green-50">
          <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
            <h2 className="text-3xl font-bold mb-4">Registro de Loja</h2>
            <p className="text-gray-500 mb-6">Entre em contato para criar sua loja.</p>
            <button onClick={() => go('home')} className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition">
              Voltar
            </button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
