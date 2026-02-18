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
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json : [];
};

const apiInsert = async (table, row) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) throw new Error(`DELETE falhou: ${res.status}`);
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
        prods = await apiFetch('products', { 
          eq: { column: 'tenant_id', value: tenant.id },
          eq: { column: 'available', value: 'true' }  // aqui pode dar erro se coluna não existir
        });
      } catch (err) {
        console.warn('Erro ao carregar produtos:', err.message);
        // continua com array vazio
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
        prods = await apiFetch('products', { 
          eq: { column: 'tenant_id', value: newTenant.id },
          eq: { column: 'available', value: 'true' }
        });
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

  // ── Componente Admin Login (simples) ─────────────────────────────────────
  const AdminLoginPage = () => {
    const [pass, setPass] = useState('');
    const [showPass, setShowPass] = useState(false);

    const handleLogin = () => {
      // Senha fixa por enquanto - mude para variável de ambiente ou auth real
      if (pass === currentTenant?.password) {
        go('admin');
      } else {
        showToast('Senha incorreta', 'error');
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
          <button onClick={() => go('menu')} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="text-center mb-8">
            <Lock size={48} className="mx-auto text-orange-500 mb-4" />
            <h2 className="text-2xl font-bold">Painel Admin</h2>
            <p className="text-gray-500 text-sm mt-1">{currentTenant?.name}</p>
          </div>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="Senha do admin"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-orange-500 outline-none"
            />
            <button 
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button
            onClick={handleLogin}
            className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  };

  // ── Painel Admin (versão mínima) ─────────────────────────────────────────
  const AdminPage = () => {
    if (!currentTenant) return null;

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-orange-600 text-white p-4 sticky top-0 z-10 shadow-md">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <h1 className="font-bold text-xl">Admin • {currentTenant.name}</h1>
            <button onClick={() => go('menu')} className="bg-white/20 px-4 py-2 rounded-lg">
              Sair
            </button>
          </div>
        </header>
        <main className="max-w-5xl mx-auto p-6">
          <div className="bg-white rounded-xl p-6 shadow">
            <h2 className="text-xl font-bold mb-4">Painel de Administração</h2>
            <p className="text-gray-600">
              Aqui você poderá adicionar/editar produtos, ver pedidos e configurar a loja.<br/>
              <strong>Funcionalidade em desenvolvimento.</strong>
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6 text-center">
                <Package size={48} className="mx-auto mb-4 text-orange-500" />
                <h3 className="font-bold text-lg">Gerenciar Produtos</h3>
                <p className="text-gray-500 mt-2">Adicione, edite ou desative itens do cardápio</p>
              </div>
              <div className="border rounded-lg p-6 text-center">
                <ShoppingCart size={48} className="mx-auto mb-4 text-green-500" />
                <h3 className="font-bold text-lg">Pedidos</h3>
                <p className="text-gray-500 mt-2">Acompanhe pedidos em tempo real</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  };

  // ── Render principal ──────────────────────────────────────────────────────
  return (
    <>
      {loading && <LoadingOverlay />}

      {view === 'loading' && <LoadingOverlay text="Iniciando..." />}
      {view === 'home' && <HomePage />}
      {view === 'register' && <RegisterPage />}
      {view === 'menu' && <MenuPage />}
      {view === 'admin-login' && <AdminLoginPage />}
      {view === 'admin' && <AdminPage />}
      {view === 'saas-login' && <SaaSLoginPage />}
      {view === 'saas-dashboard' && <SaaSDashboard />}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

// ── Componentes das páginas restantes (adapte conforme necessário) ────────

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
        <Zap size={64} className="mx-auto text-orange-500 mb-6" />
        <h1 className="text-4xl font-bold mb-2">Pedido Rápido</h1>
        <p className="text-gray-600 mb-8">Cardápio digital para sua lanchonete</p>
        
        <div className="space-y-4">
          <button className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold">
            Acessar cardápio
          </button>
          <button className="w-full bg-green-500 text-white py-4 rounded-xl font-bold">
            Começar grátis
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterPage() {
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold text-center mb-6">Comece Grátis</h2>
        {/* formulário aqui */}
        <p className="text-center text-gray-600">Formulário de cadastro em implementação</p>
      </div>
    </div>
  );
}

function MenuPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold">Cardápio</h1>
      <p>Itens do cardápio aparecerão aqui</p>
    </div>
  );
}

function SaaSLoginPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Painel Master</h2>
        <p className="text-center">Login master em desenvolvimento</p>
      </div>
    </div>
  );
}

function SaaSDashboard() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold">Dashboard Master</h1>
      <p>Visão geral da plataforma</p>
    </div>
  );
}
