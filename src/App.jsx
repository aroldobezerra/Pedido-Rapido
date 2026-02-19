import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingCart, Plus, Minus, Trash2, Send, Lock, ArrowLeft, Store, Loader,
  Zap, Shield, Eye, EyeOff, Trash, Package, RefreshCw,
  Settings, UtensilsCrossed, LayoutDashboard, LogOut,
  ChefHat, ClipboardList, Edit2, ToggleLeft, ToggleRight, PlusCircle, X,
  CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';

// ─── ENV ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = (import.meta.env.VITE_SUPABASE_URL  || '').replace(/\/$/, '');
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_KEY   || '';
const SAAS_PASSWORD = import.meta.env.VITE_SAAS_PASSWORD  || 'master123';

// ─── HELPERS DE API ──────────────────────────────────────────────────────────

const apiHeaders = (extra = {}) => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  ...extra,
});

// Monta URL de forma segura para o PostgREST do Supabase
const apiFetch = async (table, params = {}) => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (params.select) url.searchParams.set('select', params.select);
  if (params.eq)     url.searchParams.set(params.eq.column, `eq.${params.eq.value}`);
  if (params.limit)  url.searchParams.set('limit', String(params.limit));
  if (params.order)  url.searchParams.set('order', `${params.order.column}.${params.order.ascending ? 'asc' : 'desc'}`);

  const res  = await fetch(url.toString(), { headers: apiHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || json?.hint || json?.error || `HTTP ${res.status}`);
  return Array.isArray(json) ? json : [];
};

const apiInsert = async (table, data) => {
  const body = Array.isArray(data) ? data : [data];
  const res  = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: apiHeaders({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || json?.error || JSON.stringify(json));
  return Array.isArray(json) ? json[0] : json;
};

const apiUpdate = async (table, column, value, data) => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set(column, `eq.${value}`);
  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: apiHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || `HTTP ${res.status}`);
  }
  return true;
};

const apiDelete = async (table, column, value) => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set(column, `eq.${value}`);
  await fetch(url.toString(), { method: 'DELETE', headers: apiHeaders() });
};

// ─── CACHE DE SCHEMA ─────────────────────────────────────────────────────────
// Guarda qual coluna FK de orders funciona para não repetir tentativas
const _schemaCache = { ordersFk: null };

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
  const bg   = type === 'success' ? 'bg-green-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-red-500';
  const Icon = type === 'success' ? CheckCircle : type === 'warning' ? AlertTriangle : XCircle;
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl text-white shadow-2xl text-sm font-bold max-w-sm w-full ${bg}`}>
      <Icon size={18} />
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
};

// ─── STATUS helpers ───────────────────────────────────────────────────────────
const STATUS_COLORS = {
  aguardando: 'bg-yellow-100 text-yellow-800',
  pending:    'bg-yellow-100 text-yellow-800',
  preparing:  'bg-blue-100  text-blue-800',
  ready:      'bg-green-100 text-green-800',
  delivered:  'bg-gray-100  text-gray-600',
  cancelled:  'bg-red-100   text-red-700',
};
const STATUS_LABELS = {
  aguardando: 'Aguardando',
  pending:    'Pendente',
  preparing:  'Preparando',
  ready:      'Pronto ✅',
  delivered:  'Entregue',
  cancelled:  'Cancelado',
};

const orderItems = (o) => {
  try { return Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]'); }
  catch { return []; }
};

// ════════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// Toda a lógica de estado fica aqui — componentes filhos NÃO têm
// estado global, evitando loops de re-render.
// ════════════════════════════════════════════════════════════════════
export default function PedidoRapido() {
  // ── Estado global ───────────────────────────────────────────────
  const [view, setView]                   = useState('loading');
  const [currentTenant, setCurrentTenant] = useState(null);
  const [products, setProducts]           = useState([]);
  const [cart, setCart]                   = useState([]);
  const [loading, setLoading]             = useState(false);
  const [toast, setToast]                 = useState(null);

  // Admin tenant
  const [tenantAdminAuth, setTenantAdminAuth] = useState(false);
  const [adminTab, setAdminTab]               = useState('resumo');
  const [orders, setOrders]                   = useState([]);
  const [loadingOrders, setLoadingOrders]     = useState(false);

  // Admin master (SaaS)
  const [saasAuth, setSaasAuth] = useState(false);
  const [tenants, setTenants]   = useState([]);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  // Produtos disponíveis — suporta campo "available" ou "is_available"
  const isAvailable = (p) => p.available !== false && p.is_available !== false;

  // ── Carregar produtos ───────────────────────────────────────────
  // Tenta as duas colunas possíveis: tenant_id e store_id
  const reloadProducts = useCallback(async (tenantId) => {
    try {
      // Tenta tenant_id primeiro (estrutura original do projeto)
      let prods = [];
      try {
        prods = await apiFetch('products', { eq: { column: 'tenant_id', value: tenantId } });
      } catch (_) {
        prods = [];
      }
      // Se não veio nada, tenta store_id
      if (!prods.length) {
        try {
          prods = await apiFetch('products', { eq: { column: 'store_id', value: tenantId } });
        } catch (_) {
          prods = [];
        }
      }
      setProducts(prods);
    } catch (e) {
      showToast('Erro ao carregar produtos', 'error');
    }
  }, [showToast]);

  // ── Carregar pedidos ────────────────────────────────────────────
  // Tenta store_id primeiro; se vazio, tenta tenant_id (silenciosamente)
  const loadOrders = useCallback(async (tenantId) => {
    if (!tenantId) return;
    setLoadingOrders(true);
    try {
      let rows = [];
      try {
        rows = await apiFetch('orders', {
          eq:    { column: 'store_id', value: tenantId },
          order: { column: 'created_at', ascending: false },
        });
      } catch (_) { rows = []; }

      if (!rows.length) {
        try {
          rows = await apiFetch('orders', {
            eq:    { column: 'tenant_id', value: tenantId },
            order: { column: 'created_at', ascending: false },
          });
        } catch (_) { rows = []; }
      }
      setOrders(rows);
    } catch (e) {
      showToast('Erro ao carregar pedidos', 'error');
    } finally {
      setLoadingOrders(false);
    }
  }, [showToast]);

  // ── Carregar tenant pela URL ────────────────────────────────────
  const loadTenantFromURL = useCallback(async (slug) => {
    if (!slug)             { setView('home'); return; }
    if (slug === 'master') { setView('saas-login'); return; }

    setLoading(true);
    try {
      const rows   = await apiFetch('tenants', { eq: { column: 'slug', value: slug } });
      const tenant = rows[0] || null;
      if (tenant) {
        setCurrentTenant(tenant);
        await reloadProducts(tenant.id);
        setView('menu');
        if (window.location.pathname !== `/${slug}`)
          window.history.replaceState({}, '', `/${slug}`);
      } else {
        showToast('Lanchonete não encontrada', 'error');
        window.history.replaceState({}, '', '/');
        setView('home');
      }
    } catch {
      showToast('Erro ao carregar a lanchonete', 'error');
      setView('home');
    } finally {
      setLoading(false);
    }
  }, [reloadProducts, showToast]);

  useEffect(() => {
    const slug = window.location.pathname.split('/').filter(Boolean)[0] || null;
    loadTenantFromURL(slug);
  }, [loadTenantFromURL]);

  // ── Carregar pedidos quando entra na aba correta ────────────────
  // useEffect no nível raiz — não causa loop
  const prevTabRef = useRef('');
  useEffect(() => {
    if (!currentTenant || !tenantAdminAuth) return;
    if (view !== 'tenant-admin') return;
    if (['resumo', 'cozinha'].includes(adminTab) && prevTabRef.current !== adminTab) {
      prevTabRef.current = adminTab;
      loadOrders(currentTenant.id);
    }
    if (['resumo', 'cardapio'].includes(adminTab) && prevTabRef.current !== adminTab) {
      reloadProducts(currentTenant.id);
    }
  }, [adminTab, view, tenantAdminAuth, currentTenant, loadOrders, reloadProducts]);

  // Dispara ao entrar no painel admin pela primeira vez
  useEffect(() => {
    if (view === 'tenant-admin' && tenantAdminAuth && currentTenant) {
      prevTabRef.current = '';
    }
  }, [view, tenantAdminAuth, currentTenant]);

  // ── Carregar todos os tenants (master) ──────────────────────────
  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiFetch('tenants', {
        select: 'id,name,slug,active,trial_expires_at',
        order:  { column: 'created_at', ascending: false },
      });
      setTenants(rows);
    } catch { showToast('Erro ao carregar lojas', 'error'); }
    finally  { setLoading(false); }
  }, [showToast]);

  // ── Navegação ───────────────────────────────────────────────────
  const go = useCallback((newView, slug = null) => {
    if (slug)               window.history.pushState({}, '', `/${slug}`);
    else if (newView === 'home') window.history.pushState({}, '', '/');
    setView(newView);
  }, []);

  // ── Carrinho ────────────────────────────────────────────────────
  const addToCart = useCallback((product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      return ex
        ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, { ...product, qty: 1 }];
    });
    showToast(`${product.name} adicionado! 🛒`);
  }, [showToast]);

  const updateQty = useCallback((id, delta) =>
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)),
  []);

  const cartTotal = cart.reduce((s, i) => s + parseFloat(i.price || 0) * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // ── Atualizar status do pedido ──────────────────────────────────
  const updateOrderStatus = useCallback(async (id, status) => {
    try {
      await apiUpdate('orders', 'id', id, { status });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      showToast('Status atualizado!');
    } catch { showToast('Erro ao atualizar status', 'error'); }
  }, [showToast]);

  // ════════════════════════════════════════════════════════════════════
  // HOME PAGE
  // ════════════════════════════════════════════════════════════════════
  const HomePage = () => {
    const [recentTenants, setRecentTenants] = useState([]);

    useEffect(() => {
      apiFetch('tenants', {
        select: 'id,name,slug',
        limit:  5,
        order:  { column: 'created_at', ascending: false },
      }).then(setRecentTenants).catch(() => {});
    }, []);

    const accessTenant = async (slug) => {
      setLoading(true);
      try {
        const rows   = await apiFetch('tenants', { eq: { column: 'slug', value: slug } });
        const tenant = rows[0];
        if (tenant) {
          setCurrentTenant(tenant);
          await reloadProducts(tenant.id);
          window.history.pushState({}, '', `/${slug}`);
          setView('menu');
        }
      } catch { showToast('Erro ao acessar loja', 'error'); }
      finally  { setLoading(false); }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-50 to-yellow-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Zap className="text-orange-500" size={48} />
              <div className="text-6xl">🍔</div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
              Pedido Rápido
            </h1>
            <p className="text-gray-600 font-medium">Sistema Multi-Tenant para Lanchonetes</p>
          </div>

          <div className="space-y-4">
            <button onClick={() => go('select')} className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg transform hover:scale-105 transition">
              🏪 Acessar Minha Lanchonete
            </button>
            <button onClick={() => go('register')} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg transform hover:scale-105 transition">
              ✨ Começar Grátis (7 dias)
            </button>
          </div>

          {recentTenants.length > 0 && (
            <div className="mt-8">
              <p className="text-sm text-gray-600 mb-3 font-semibold">Clientes recentes:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentTenants.map(t => (
                  <button key={t.id} onClick={() => accessTenant(t.slug)}
                    className="w-full text-left px-4 py-3 bg-gradient-to-r from-gray-50 to-orange-50 hover:from-orange-50 hover:to-red-50 rounded-lg transition border border-gray-200">
                    <p className="font-bold text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-500">{window.location.origin}/{t.slug}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <button onClick={() => go('saas-login')} className="text-gray-300 hover:text-gray-500 text-xs flex items-center gap-1 mx-auto transition">
              <Shield size={12} /> Acesso Master
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // SELECT PAGE
  // ════════════════════════════════════════════════════════════════════
  const SelectPage = () => {
    const [slug, setSlug] = useState('');

    const handleAccess = async () => {
      if (!slug.trim()) { showToast('Digite o identificador', 'error'); return; }
      setLoading(true);
      try {
        const rows   = await apiFetch('tenants', { eq: { column: 'slug', value: slug.trim().toLowerCase() } });
        const tenant = rows[0];
        if (tenant) {
          setCurrentTenant(tenant);
          await reloadProducts(tenant.id);
          window.history.pushState({}, '', `/${slug}`);
          setView('menu');
        } else { showToast('Lanchonete não encontrada!', 'error'); }
      } catch { showToast('Erro ao buscar loja', 'error'); }
      finally  { setLoading(false); }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
          <button onClick={() => go('home')} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-500 transition">
            <ArrowLeft size={20} /> Voltar
          </button>
          <div className="text-center mb-8">
            <Store className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-800">Acessar Lanchonete</h2>
          </div>
          <div className="flex items-center border-2 border-gray-300 focus-within:border-orange-500 rounded-xl mb-4 overflow-hidden transition">
            <span className="pl-4 text-gray-400 text-xs font-mono whitespace-nowrap">{window.location.origin}/</span>
            <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleAccess()} placeholder="minha-lanchonete"
              className="flex-1 px-2 py-3 outline-none text-sm" autoFocus />
          </div>
          <button onClick={handleAccess} disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-bold transition disabled:opacity-50">Entrar</button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // REGISTER PAGE
  // ════════════════════════════════════════════════════════════════════
  const RegisterPage = () => {
    const [name, setName]         = useState('');
    const [slug, setSlug]         = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [password, setPassword] = useState('');
    const [saving, setSaving]     = useState(false);

    const handleCreate = async () => {
      if (!name || !slug || !whatsapp || !password) { showToast('Preencha todos os campos!', 'error'); return; }
      setSaving(true);
      try {
        const existing = await apiFetch('tenants', { eq: { column: 'slug', value: slug } });
        if (existing.length > 0) { showToast('Identificador já existe!', 'error'); return; }
        const tenant = await apiInsert('tenants', {
          name, slug, whatsapp, phone: whatsapp, password,
          plan: 'trial', active: true, created_at: new Date().toISOString(),
        });
        setCurrentTenant(tenant);
        setProducts([]);
        window.history.pushState({}, '', `/${slug}`);
        showToast('Conta criada com sucesso! 🎉');
        setView('menu');
      } catch (e) { showToast(`Erro: ${e.message}`, 'error'); }
      finally     { setSaving(false); }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
          <button onClick={() => go('home')} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-green-500 transition">
            <ArrowLeft size={20} /> Voltar
          </button>
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2">Comece Grátis</h2>
            <p className="text-gray-600 text-sm">7 dias de teste • Sem cartão de crédito</p>
          </div>
          <div className="space-y-4">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da Lanchonete *" className="w-full px-4 py-3 border-2 border-gray-300 focus:border-green-500 rounded-xl outline-none transition" />
            <div>
              <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="identificador-unico *" className="w-full px-4 py-3 border-2 border-gray-300 focus:border-green-500 rounded-xl outline-none transition" />
              <p className="text-xs text-gray-500 mt-1">Seu link: {window.location.origin}/<span className="font-semibold text-green-600">{slug || 'seu-link'}</span></p>
            </div>
            <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value.replace(/[^0-9]/g, ''))} placeholder="WhatsApp (5585999999999) *" className="w-full px-4 py-3 border-2 border-gray-300 focus:border-green-500 rounded-xl outline-none transition" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha de Admin *" className="w-full px-4 py-3 border-2 border-gray-300 focus:border-green-500 rounded-xl outline-none transition" />
            <button onClick={handleCreate} disabled={saving} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold text-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Spinner size={20} color="text-white" /> : '🚀'}
              {saving ? 'Criando...' : 'Criar Minha Conta'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // SAAS LOGIN
  // ════════════════════════════════════════════════════════════════════
  const SaasLoginPage = () => {
    const [pw, setPw]         = useState('');
    const [showPw, setShowPw] = useState(false);
    const [err, setErr]       = useState('');

    const handleLogin = () => {
      if (pw === SAAS_PASSWORD) {
        setSaasAuth(true); loadTenants(); setView('saas-dashboard');
      } else { setErr('Senha incorreta'); }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm">
          <div className="text-center mb-8">
            <Shield size={48} className="mx-auto text-orange-500 mb-3" />
            <h2 className="text-2xl font-extrabold">Master Admin</h2>
            <p className="text-gray-500 text-sm mt-1">Acesso restrito</p>
          </div>
          <div className="relative mb-3">
            <input type={showPw ? 'text' : 'password'} placeholder="Senha master" value={pw}
              onChange={e => { setPw(e.target.value); setErr(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:border-orange-400 outline-none" autoFocus />
            <button onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {err && <p className="text-red-500 text-sm mb-3 text-center">{err}</p>}
          <button onClick={handleLogin} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-bold hover:brightness-110 transition">Entrar</button>
          <button onClick={() => go('home')} className="w-full mt-3 text-gray-400 text-sm hover:text-gray-600 flex items-center justify-center gap-1 transition"><ArrowLeft size={14} /> Voltar</button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // SAAS DASHBOARD
  // ════════════════════════════════════════════════════════════════════
  const SaasDashboard = () => {
    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName]     = useState('');
    const [newSlug, setNewSlug]     = useState('');
    const [newPhone, setNewPhone]   = useState('');
    const [newPw, setNewPw]         = useState('');
    const [newExpiry, setNewExpiry] = useState('');
    const [saving, setSaving]       = useState(false);

    const createTenantMaster = async () => {
      if (!newName.trim() || !newSlug.trim()) { showToast('Nome e slug obrigatórios', 'error'); return; }
      setSaving(true);
      try {
        await apiInsert('tenants', {
          name: newName, slug: newSlug.toLowerCase().replace(/\s+/g, '-'),
          whatsapp: newPhone, phone: newPhone,
          password: newPw || 'admin123',
          trial_expires_at: newExpiry || null,
          active: true, created_at: new Date().toISOString(),
        });
        showToast('Loja criada!');
        setShowModal(false);
        setNewName(''); setNewSlug(''); setNewPhone(''); setNewPw(''); setNewExpiry('');
        loadTenants();
      } catch (e) { showToast(`Erro: ${e.message}`, 'error'); }
      finally     { setSaving(false); }
    };

    const toggleActive = async (t) => {
      try {
        await apiUpdate('tenants', 'id', t.id, { active: !t.active });
        setTenants(prev => prev.map(x => x.id === t.id ? { ...x, active: !x.active } : x));
        showToast(t.active ? 'Desativada' : 'Ativada');
      } catch { showToast('Erro', 'error'); }
    };

    const deleteTenant = async (t) => {
      if (!window.confirm(`Excluir "${t.name}"?`)) return;
      try {
        await apiDelete('tenants', 'id', t.id);
        setTenants(prev => prev.filter(x => x.id !== t.id));
        showToast('Excluída');
      } catch { showToast('Erro ao excluir', 'error'); }
    };

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3">
            <Shield size={28} className="text-orange-400" />
            <div>
              <h1 className="text-xl font-extrabold">Master Admin</h1>
              <p className="text-gray-400 text-xs">{tenants.length} lojas</p>
            </div>
          </div>
          <button onClick={() => { setSaasAuth(false); go('home'); }} className="flex items-center gap-2 text-gray-300 hover:text-white text-sm transition">
            <LogOut size={16} /> Sair
          </button>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label:'Total',    value: tenants.length,                        color:'text-orange-500' },
              { label:'Ativas',   value: tenants.filter(t => t.active).length,  color:'text-green-500'  },
              { label:'Inativas', value: tenants.filter(t => !t.active).length, color:'text-red-500'    },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-4 shadow text-center">
                <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-gray-500 text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          <button onClick={() => setShowModal(true)} className="w-full mb-6 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:brightness-110 transition flex items-center justify-center gap-2">
            <PlusCircle size={22} /> Nova Loja
          </button>

          <div className="space-y-3">
            {loading ? <div className="flex justify-center py-12"><Spinner size={40} /></div> :
             tenants.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Store size={48} className="mx-auto mb-3 opacity-30" /><p>Nenhuma loja</p>
              </div>
            ) : tenants.map(t => (
              <div key={t.id} className="bg-white rounded-2xl p-4 shadow flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${t.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{t.name}</p>
                  <p className="text-sm text-gray-500">/{t.slug}</p>
                  {t.trial_expires_at && <p className="text-xs text-orange-500">Expira: {new Date(t.trial_expires_at).toLocaleDateString('pt-BR')}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => window.open(`/${t.slug}`, '_blank')} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Store size={16} /></button>
                  <button onClick={() => toggleActive(t)} className={`p-2 rounded-lg transition ${t.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                    {t.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button onClick={() => deleteTenant(t)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showModal && (
          <Overlay>
            <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-extrabold">Nova Loja</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
              </div>
              <div className="space-y-3">
                <input placeholder="Nome da loja *" value={newName} onChange={e => setNewName(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                <input placeholder="Slug (ex: comabem) *" value={newSlug} onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                <input placeholder="WhatsApp (5585999999999)" value={newPhone} onChange={e => setNewPhone(e.target.value.replace(/[^0-9]/g, ''))} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                <input placeholder="Senha admin (padrão: admin123)" value={newPw} onChange={e => setNewPw(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Expiração do trial</label>
                  <input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition">Cancelar</button>
                <button onClick={createTenantMaster} disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Spinner size={18} color="text-white" /> : <PlusCircle size={18} />} Criar
                </button>
              </div>
            </div>
          </Overlay>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // MENU PAGE
  // ════════════════════════════════════════════════════════════════════
  const MenuPage = () => {
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [adminPw, setAdminPw]   = useState('');
    const [adminErr, setAdminErr] = useState('');

    if (!currentTenant) return <LoadingOverlay text="Carregando loja..." />;
    const available = products.filter(isAvailable);

    const handleAdminLogin = () => {
      const correct = currentTenant.password || 'admin123';
      if (adminPw === correct) {
        setTenantAdminAuth(true);
        setShowAdminLogin(false);
        setAdminTab('resumo');
        prevTabRef.current = '';
        setView('tenant-admin');
      } else { setAdminErr('Senha incorreta'); }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 sticky top-0 z-40 shadow-lg">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Zap size={28} />
              <div>
                <h1 className="text-xl font-bold leading-tight">{currentTenant.name}</h1>
                <p className="text-xs opacity-80">Pedido Rápido</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => go('cart')} className="bg-orange-600 hover:bg-orange-700 p-3 rounded-xl relative transition">
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-orange-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>
                )}
              </button>
              <button onClick={() => tenantAdminAuth ? setView('tenant-admin') : setShowAdminLogin(true)} className="bg-orange-600 hover:bg-orange-700 p-3 rounded-xl transition" title="Área Admin">
                <Lock size={20} />
              </button>
            </div>
          </div>
        </header>

        <div className="container mx-auto p-6">
          {loading ? (
            <div className="flex justify-center py-20"><Spinner size={48} /></div>
          ) : available.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Package size={80} className="mx-auto mb-4 opacity-30" />
              <h2 className="text-2xl font-bold mb-2">Cardápio vazio</h2>
              <p className="mb-6 text-sm">Nenhum item disponível no momento.</p>
              <button onClick={() => reloadProducts(currentTenant.id)} className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition">
                <RefreshCw size={16} className="inline mr-2" />Atualizar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {available.map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition transform hover:scale-105">
                  <div className="text-6xl text-center mb-4">{p.image || '🍔'}</div>
                  <h3 className="text-xl font-bold text-center mb-2">{p.name}</h3>
                  {p.description && <p className="text-sm text-gray-600 text-center mb-3 line-clamp-2">{p.description}</p>}
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-orange-500">R$ {parseFloat(p.price || 0).toFixed(2)}</span>
                    <button onClick={() => addToCart(p)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition active:scale-95">
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAdminLogin && (
          <Overlay>
            <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-extrabold flex items-center gap-2"><Lock size={20} className="text-orange-500" /> Admin da Loja</h3>
                <button onClick={() => { setShowAdminLogin(false); setAdminErr(''); }} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
              </div>
              <input type="password" placeholder="Senha de administrador" value={adminPw}
                onChange={e => { setAdminPw(e.target.value); setAdminErr(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none mb-3" autoFocus />
              {adminErr && <p className="text-red-500 text-sm mb-3">{adminErr}</p>}
              <button onClick={handleAdminLogin} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-bold hover:brightness-110 transition">Entrar</button>
            </div>
          </Overlay>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // CART PAGE
  // ════════════════════════════════════════════════════════════════════
  const CartPage = () => {
    const [name, setName]           = useState('');
    const [orderType, setOrderType] = useState('local');
    const [tableNum, setTableNum]   = useState('');
    const [address, setAddress]     = useState('');
    const [addressRef, setAddressRef] = useState('');
    const [sending, setSending]     = useState(false);

    if (!currentTenant) return null;
    const total = cart.reduce((s, i) => s + parseFloat(i.price || 0) * i.qty, 0);

    const handleSend = async () => {
      if (!name.trim()) { showToast('Digite seu nome!', 'error'); return; }
      if (orderType === 'local' && !tableNum.trim()) { showToast('Digite o número da mesa!', 'error'); return; }
      if (orderType === 'entrega' && !address.trim()) { showToast('Digite o endereço de entrega!', 'error'); return; }
      if (cart.length === 0) { showToast('Carrinho vazio!', 'error'); return; }
      setSending(true);
      try {
        // Monta label de localização para incluir em customer_name (evita colunas inexistentes)
        let locationLabel = '';
        if (orderType === 'local')   locationLabel = `Mesa ${tableNum}`;
        if (orderType === 'viagem')  locationLabel = 'Viagem';
        if (orderType === 'entrega') locationLabel = `Entrega: ${address}${addressRef ? ' | Ref: ' + addressRef : ''}`;

        // Envia apenas colunas que existem na tabela orders
        // customer_name inclui nome + tipo para exibição na cozinha
        const orderPayload = {
          customer_name: `${name} (${locationLabel})`,
          items:         cart,
          total,
          status:        'aguardando',
          created_at:    new Date().toISOString(),
        };

        // Usa FK cacheada ou descobre qual coluna existe
        if (_schemaCache.ordersFk) {
          // FK já conhecida — insere direto
          const fk = _schemaCache.ordersFk;
          await apiInsert('orders', fk === 'none' ? orderPayload : { ...orderPayload, [fk]: currentTenant.id });
        } else {
          // Descobre qual FK existe tentando cada opção
          let inserted = false;
          for (const fkField of ['store_id', 'tenant_id', 'lanchonete_id', 'restaurante_id']) {
            try {
              await apiInsert('orders', { ...orderPayload, [fkField]: currentTenant.id });
              _schemaCache.ordersFk = fkField; // cacheia para próximas vezes
              inserted = true;
              break;
            } catch (fkErr) {
              const msg = fkErr.message || '';
              if (!msg.includes('column') && !msg.includes('schema') && !msg.includes('cache')) {
                throw fkErr; // erro real (não é coluna inexistente)
              }
            }
          }
          if (!inserted) {
            // Sem FK — tabela só tem campos básicos
            await apiInsert('orders', orderPayload);
            _schemaCache.ordersFk = 'none';
          }
        }

        const wp = currentTenant.whatsapp || currentTenant.phone;
        if (wp) {
          let loc = '';
          if (orderType === 'local')   loc = `🪑 Mesa ${tableNum}`;
          if (orderType === 'viagem')  loc = `🛍️ Para viagem`;
          if (orderType === 'entrega') loc = `🛵 Entrega: ${address}${addressRef ? ' | Ref: ' + addressRef : ''}`;

          let msg = `🍔 PEDIDO RÁPIDO - ${currentTenant.name}%0A%0A`;
          msg += `👤 ${name}%0A`;
          msg += `📍 ${loc}%0A%0A`;
          cart.forEach(i => { msg += `${i.image || '🍔'} ${i.name} - ${i.qty}x R$${parseFloat(i.price).toFixed(2)}%0A`; });
          msg += `%0A💰 TOTAL: R$${total.toFixed(2)}`;
          window.open(`https://wa.me/${wp}?text=${msg}`, '_blank');
        }

        setCart([]);
        showToast('Pedido enviado! 🎉');
        setView('menu');
      } catch (e) { showToast(`Erro: ${e.message}`, 'error'); }
      finally     { setSending(false); }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 shadow-lg">
          <button onClick={() => go('menu')} className="flex items-center gap-2 mb-2 hover:opacity-80 transition"><ArrowLeft size={20} /> Voltar ao Cardápio</button>
          <h1 className="text-3xl font-bold">Seu Carrinho</h1>
        </header>

        <div className="container mx-auto p-6 max-w-2xl">
          {cart.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl mb-6">Carrinho vazio</p>
              <button onClick={() => go('menu')} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition">Ver Cardápio</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                    <div className="text-4xl">{item.image || '🍔'}</div>
                    <div className="flex-1">
                      <p className="font-bold">{item.name}</p>
                      <p className="text-orange-500 font-semibold">R$ {parseFloat(item.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, -1)} className="bg-gray-200 hover:bg-gray-300 p-2 rounded-lg transition"><Minus size={14} /></button>
                      <span className="font-bold w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition"><Plus size={14} /></button>
                      <button onClick={() => setCart(c => c.filter(i => i.id !== item.id))} className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg ml-1 transition"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome *" className="w-full px-4 py-3 border-2 border-gray-300 focus:border-orange-500 rounded-xl mb-4 outline-none transition" />

                {/* Tipo de pedido */}
                <div className="flex gap-2 mb-4">
                  {[['local','🪑 Local'],['viagem','🛍️ Viagem'],['entrega','🛵 Entrega']].map(([val, label]) => (
                    <button key={val} onClick={() => setOrderType(val)}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm transition ${orderType === val ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-200 hover:bg-gray-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Campo mesa */}
                {orderType === 'local' && (
                  <input type="text" value={tableNum} onChange={e => setTableNum(e.target.value)}
                    placeholder="Número da mesa *"
                    className="w-full px-4 py-3 border-2 border-gray-300 focus:border-orange-500 rounded-xl outline-none transition" />
                )}

                {/* Campos entrega */}
                {orderType === 'entrega' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                        placeholder="Rua, número, bairro *"
                        className="w-full px-4 py-3 border-2 border-orange-300 focus:border-orange-500 rounded-xl outline-none transition" />
                    </div>
                    <input type="text" value={addressRef} onChange={e => setAddressRef(e.target.value)}
                      placeholder="Ponto de referência (opcional)"
                      className="w-full px-4 py-3 border-2 border-gray-300 focus:border-orange-500 rounded-xl outline-none transition" />
                    <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                      <span className="text-lg">🛵</span>
                      <p className="text-xs text-orange-700">O valor da taxa de entrega será combinado diretamente com a loja via WhatsApp.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xl font-bold">Total</span>
                  <span className="text-3xl font-bold text-orange-500">R$ {total.toFixed(2)}</span>
                </div>
                <button onClick={handleSend} disabled={sending} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition disabled:opacity-50">
                  {sending ? <Spinner size={22} color="text-white" /> : <Send size={22} />}
                  {sending ? 'Enviando...' : (currentTenant.whatsapp || currentTenant.phone) ? 'Enviar via WhatsApp' : 'Confirmar Pedido'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // TENANT ADMIN — sem estado local de pedidos/produtos (usa estado raiz)
  // ════════════════════════════════════════════════════════════════════
  const TenantAdminPage = () => {
    // Produto form
    const [showProductModal, setShowProductModal] = useState(false);
    const [editProduct, setEditProduct]           = useState(null);
    const [pName, setPName]     = useState('');
    const [pPrice, setPPrice]   = useState('');
    const [pDesc, setPDesc]     = useState('');
    const [pImage, setPImage]   = useState('');
    const [pSaving, setPSaving] = useState(false);

    // Ajustes form
    const [ajNome, setAjNome]         = useState(currentTenant?.name     || '');
    const [ajWpp, setAjWpp]           = useState(currentTenant?.whatsapp || currentTenant?.phone || '');
    const [ajPw, setAjPw]             = useState('');
    const [ajSaving, setAjSaving]     = useState(false);

    const openNewProduct = () => {
      setEditProduct(null); setPName(''); setPPrice(''); setPDesc(''); setPImage('');
      setShowProductModal(true);
    };
    const openEditProduct = (p) => {
      setEditProduct(p); setPName(p.name); setPPrice(String(p.price)); setPDesc(p.description || ''); setPImage(p.image || '');
      setShowProductModal(true);
    };

    const saveProduct = async () => {
      if (!pName.trim() || !pPrice) { showToast('Nome e preço obrigatórios', 'error'); return; }
      setPSaving(true);
      try {
        if (editProduct) {
          await apiUpdate('products', 'id', editProduct.id, { name: pName, price: parseFloat(pPrice), description: pDesc, image: pImage });
          showToast('Produto atualizado!');
        } else {
          await apiInsert('products', {
            tenant_id: currentTenant.id,
            store_id:  currentTenant.id,
            name: pName, price: parseFloat(pPrice), description: pDesc, image: pImage,
            available: true, created_at: new Date().toISOString(),
          });
          showToast('Produto criado!');
        }
        setShowProductModal(false);
        reloadProducts(currentTenant.id);
      } catch (e) { showToast(`Erro: ${e.message}`, 'error'); }
      finally     { setPSaving(false); }
    };

    const toggleAvailability = async (p) => {
      const newVal = !isAvailable(p);
      try {
        await apiUpdate('products', 'id', p.id, { available: newVal });
        setProducts(prev => prev.map(x => x.id === p.id ? { ...x, available: newVal } : x));
        showToast(newVal ? 'Produto ativado ✅' : 'Produto desativado');
      } catch { showToast('Erro', 'error'); }
    };

    const deleteProduct = async (p) => {
      if (!window.confirm(`Excluir "${p.name}"?`)) return;
      try {
        await apiDelete('products', 'id', p.id);
        setProducts(prev => prev.filter(x => x.id !== p.id));
        showToast('Produto excluído');
      } catch { showToast('Erro', 'error'); }
    };

    const saveAjustes = async () => {
      setAjSaving(true);
      try {
        const data = { name: ajNome, whatsapp: ajWpp, phone: ajWpp };
        if (ajPw.trim()) data.password = ajPw;
        await apiUpdate('tenants', 'id', currentTenant.id, data);
        setCurrentTenant(prev => ({ ...prev, ...data }));
        showToast('Configurações salvas!');
      } catch (e) { showToast(`Erro: ${e.message}`, 'error'); }
      finally     { setAjSaving(false); }
    };

    const TABS = [
      { id:'resumo',   label:'Resumo',   Icon: LayoutDashboard },
      { id:'cozinha',  label:'Cozinha',  Icon: ChefHat         },
      { id:'cardapio', label:'Cardápio', Icon: UtensilsCrossed },
      { id:'ajustes',  label:'Ajustes',  Icon: Settings        },
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
              <button onClick={() => go('menu')} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm transition"><Store size={15} /> Cardápio</button>
              <button onClick={() => { setTenantAdminAuth(false); setView('menu'); }} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm transition"><LogOut size={15} /> Sair</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
          <div className="max-w-5xl mx-auto flex overflow-x-auto">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setAdminTab(id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition ${adminTab === id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
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
                {[
                  { label:'Total Pedidos', value: orders.length,                                                          color:'text-orange-500' },
                  { label:'Aguardando',    value: orders.filter(o => ['pending','aguardando'].includes(o.status)).length, color:'text-yellow-500' },
                  { label:'Entregues',     value: orders.filter(o => o.status === 'delivered').length,                   color:'text-green-500'  },
                  { label:'Itens Ativos',  value: products.filter(isAvailable).length,                                   color:'text-blue-500'   },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl p-4 shadow text-center">
                    <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                    <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <h3 className="font-bold text-gray-700 mb-3">Últimos pedidos</h3>
              {loadingOrders ? <div className="flex justify-center py-8"><Spinner /></div> : (
                <div className="space-y-3">
                  {orders.slice(0, 6).map(o => (
                    <div key={o.id} className="bg-white rounded-2xl p-4 shadow flex justify-between items-center">
                      <div>
                        <p className="font-bold">{o.customer_name}</p>
                        <p className="text-sm text-gray-500">R$ {parseFloat(o.total || 0).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[o.status] || 'bg-gray-100'}`}>{STATUS_LABELS[o.status] || o.status}</span>
                    </div>
                  ))}
                  {orders.length === 0 && !loadingOrders && <p className="text-center text-gray-400 py-8">Nenhum pedido ainda</p>}
                </div>
              )}
            </div>
          )}

          {/* ── COZINHA ── */}
          {adminTab === 'cozinha' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-extrabold">Pedidos em Tempo Real</h2>
                <button onClick={() => loadOrders(currentTenant.id)} className="text-orange-500 hover:text-orange-600 p-2 hover:bg-orange-50 rounded-lg transition"><RefreshCw size={20} /></button>
              </div>
              {loadingOrders ? <div className="flex justify-center py-12"><Spinner size={40} /></div> :
               orders.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <ClipboardList size={56} className="mx-auto mb-3 opacity-30" /><p>Nenhum pedido ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(o => (
                    <div key={o.id} className={`bg-white rounded-2xl p-5 shadow border-l-4 ${['pending','aguardando'].includes(o.status) ? 'border-yellow-400' : o.status === 'preparing' ? 'border-blue-400' : o.status === 'ready' ? 'border-green-400' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-extrabold text-lg">{o.customer_name}</p>
                          <p className="text-sm text-gray-500 max-w-xs truncate">{o.customer_name}</p>
                          <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleTimeString('pt-BR')}</p>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[o.status] || 'bg-gray-100'}`}>{STATUS_LABELS[o.status] || o.status}</span>
                      </div>
                      <div className="mb-3 bg-gray-50 rounded-xl p-3 space-y-1">
                        {orderItems(o).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.image || ''} {item.qty}x {item.name}</span>
                            <span className="text-gray-500 font-semibold">R$ {(parseFloat(item.price) * item.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="font-bold text-orange-600">R$ {parseFloat(o.total || 0).toFixed(2)}</span>
                        <div className="flex gap-2 flex-wrap">
                          {['pending','aguardando'].includes(o.status) && <button onClick={() => updateOrderStatus(o.id,'preparing')} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600 transition">Preparar</button>}
                          {o.status === 'preparing'  && <button onClick={() => updateOrderStatus(o.id,'ready')}     className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-600 transition">Pronto! ✅</button>}
                          {o.status === 'ready'      && <button onClick={() => updateOrderStatus(o.id,'delivered')} className="bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-700 transition">Entregue</button>}
                          {!['cancelled','delivered'].includes(o.status) && <button onClick={() => updateOrderStatus(o.id,'cancelled')} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200 transition">Cancelar</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CARDÁPIO ── */}
          {adminTab === 'cardapio' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-extrabold">Gerenciar Cardápio</h2>
                <button onClick={openNewProduct} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-600 transition text-sm">
                  <PlusCircle size={17} /> Novo Item
                </button>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Package size={56} className="mx-auto mb-3 opacity-30" /><p>Nenhum produto cadastrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl p-4 shadow flex items-center gap-4">
                      <div className="text-3xl w-10 text-center flex-shrink-0">{p.image || '🍔'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{p.name}</p>
                        <p className="text-orange-600 font-bold text-sm">R$ {parseFloat(p.price || 0).toFixed(2)}</p>
                        {p.description && <p className="text-gray-400 text-xs truncate">{p.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => toggleAvailability(p)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isAvailable(p) ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {isAvailable(p) ? '✅ Disponível' : '❌ Inativo'}
                        </button>
                        <button onClick={() => openEditProduct(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Edit2 size={15} /></button>
                        <button onClick={() => deleteProduct(p)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showProductModal && (
                <Overlay>
                  <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="text-xl font-extrabold">{editProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                      <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
                    </div>
                    <div className="space-y-3">
                      <input placeholder="Nome do produto *" value={pName} onChange={e => setPName(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                      <input placeholder="Preço (ex: 15.90) *" value={pPrice} onChange={e => setPPrice(e.target.value)} type="number" step="0.01" min="0" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                      <textarea placeholder="Descrição (opcional)" value={pDesc} onChange={e => setPDesc(e.target.value)} rows={2} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none resize-none" />
                      <input placeholder="Emoji (ex: 🍔 🍕 🌮)" value={pImage} onChange={e => setPImage(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => setShowProductModal(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition">Cancelar</button>
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
            <div className="max-w-md">
              <h2 className="text-lg font-extrabold text-gray-800 mb-5">Ajustes da Loja</h2>
              <div className="bg-white rounded-2xl p-5 shadow space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-600 block mb-1">Nome da Loja</label>
                  <input value={ajNome} onChange={e => setAjNome(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-600 block mb-1">WhatsApp (com DDI: 5585999999999)</label>
                  <input value={ajWpp} onChange={e => setAjWpp(e.target.value.replace(/[^0-9]/g, ''))} placeholder="5585999999999" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-600 block mb-1">Nova senha admin (em branco = não altera)</label>
                  <input type="password" value={ajPw} onChange={e => setAjPw(e.target.value)} placeholder="Nova senha" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-600 block mb-1">Link do cardápio</label>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-orange-600 font-mono break-all select-all">
                    {window.location.origin}/{currentTenant?.slug}
                  </div>
                </div>
                <button onClick={saveAjustes} disabled={ajSaving} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-bold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {ajSaving ? <Spinner size={18} color="text-white" /> : <CheckCircle size={18} />}
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {loading && !['menu','tenant-admin','saas-dashboard'].includes(view) && <LoadingOverlay text="Carregando..." />}

      {view === 'loading'        && <LoadingOverlay text="Iniciando..." />}
      {view === 'home'           && <HomePage />}
      {view === 'select'         && <SelectPage />}
      {view === 'register'       && <RegisterPage />}
      {view === 'saas-login'     && <SaasLoginPage />}
      {view === 'saas-dashboard' && <SaasDashboard />}
      {view === 'menu'           && <MenuPage />}
      {view === 'cart'           && <CartPage />}
      {view === 'tenant-admin'   && <TenantAdminPage />}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
