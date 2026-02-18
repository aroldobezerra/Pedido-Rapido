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
  const styles = {
    success: 'bg-green-500',
    error:   'bg-red-500',
  };
  const Icon = type === 'success' ? CheckCircle : XCircle;
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
  const [toast, setToast]               = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── Carregar tenant pela URL ────────────────────────────────────────────
  const loadTenantFromURL = useCallback(async (slug) => {
    console.log('[DEBUG] Tentando carregar slug:', slug);

    if (!slug) {
      console.log('[DEBUG] Sem slug → indo para home');
      setView('home');
      return;
    }
    if (slug === 'master') {
      setView('saas-login');
      return;
    }

    setLoading(true);
    try {
      const rows = await apiFetch('tenants', { eq: { column: 'slug', value: slug } });
      console.log('[DEBUG] Tenants encontrados:', rows);

      const tenant = rows[0] || null;
      if (tenant) {
        console.log('[DEBUG] Tenant encontrado:', tenant.name, tenant.id);
        setCurrentTenant(tenant);

        let prods = [];
        try {
          // Correção principal: usa store_id em vez de tenant_id
          prods = await apiFetch('products', { eq: { column: 'store_id', value: tenant.id } });
          console.log('[DEBUG] Produtos carregados:', prods.length);
        } catch (prodErr) {
          console.warn('[DEBUG] Erro ao carregar produtos:', prodErr.message);
          showToast('Não foi possível carregar o cardápio (verifique produtos)', 'error');
        }

        setProducts(prods || []);
        setView('menu');

        if (window.location.pathname !== `/${slug}`) {
          window.history.replaceState({}, '', `/${slug}`);
        }
      } else {
        console.log('[DEBUG] Tenant NÃO encontrado para slug:', slug);
        showToast('Lanchonete não encontrada', 'error');
        window.history.replaceState({}, '', '/');
        setView('home');
      }
    } catch (e) {
      console.error('[DEBUG] Erro geral ao carregar tenant:', e.message);
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

  // ── Navegação ───────────────────────────────────────────────────────────
  const go = (newView, slug = null) => {
    if (slug) window.history.pushState({}, '', `/${slug}`);
    else if (newView === 'home') window.history.pushState({}, '', '/');
    setView(newView);
  };

  // ... (outras funções como createTenant, createOrder, etc. permanecem iguais)

  // ── MENU (com fallback forte para evitar branco) ────────────────────────
  const MenuPage = () => {
    if (!currentTenant) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center p-8">
            <Loader className="animate-spin mx-auto mb-4" size={48} />
            <h2 className="text-2xl font-bold">Carregando loja...</h2>
          </div>
        </div>
      );
    }

    const available = products.filter(p => p.is_available !== false && p.isAvailable !== false);

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <header className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-orange-600">{currentTenant.name}</h1>
          <p className="text-xl text-gray-600 mt-2">Cardápio Digital</p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size={64} />
            <p className="mt-6 text-lg text-gray-600">Carregando produtos...</p>
          </div>
        ) : available.length === 0 ? (
          <div className="text-center py-32 text-gray-500">
            <Package size={96} className="mx-auto mb-6 opacity-40" />
            <h2 className="text-3xl font-bold mb-4">Cardápio vazio no momento</h2>
            <p className="text-lg mb-8">Estamos preparando novidades para você!<br/>Volte em breve ou entre em contato.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-orange-500 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-orange-600 transition"
            >
              Atualizar página
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {available.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
                <div className="h-56 bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center text-8xl">
                  {p.image || '🍔'}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{p.name}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{p.description || 'Delícia imperdível'}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-extrabold text-orange-600">
                      R$ {parseFloat(p.price || 0).toFixed(2)}
                    </span>
                    <button className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition">
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rodapé de debug - remova depois de testar */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-3 text-center z-50 opacity-80">
          DEBUG | Slug: {window.location.pathname.split('/')[1] || '(raiz)'} | 
          Loja: {currentTenant ? currentTenant.name : 'Nenhuma'} | 
          View: {view} | Produtos: {products.length}
        </div>
      </div>
    );
  };

  // Render principal
  return (
    <>
      {loading && <LoadingOverlay text="Carregando loja..." />}

      {view === 'loading' && <LoadingOverlay text="Iniciando..." />}
      {view === 'home' && <div className="min-h-screen flex items-center justify-center">Home Page (implementar)</div>}
      {view === 'menu' && <MenuPage />}
      {/* Adicione aqui as outras views conforme necessário: register, cart, admin, etc. */}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
