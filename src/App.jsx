import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingCart, Plus, Minus, Trash2, Send, Lock, ArrowLeft, Store, Loader,
  Zap, Shield, Eye, EyeOff, Trash, Package, RefreshCw,
  Settings, UtensilsCrossed, LayoutDashboard, LogOut,
  ChefHat, ClipboardList, Edit2, ToggleLeft, ToggleRight, PlusCircle, X,
  CheckCircle, XCircle, AlertTriangle, Camera
} from 'lucide-react';

// ─── ENV ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = (import.meta.env.VITE_SUPABASE_URL  || '').replace(/\/$/, '');
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_KEY   || '';
const SAAS_PASSWORD = import.meta.env.VITE_SAAS_PASSWORD  || 'master123';

// ─── SCHEMAS CONFIRMADOS ──────────────────────────────────────────────────────
// orders:   id(auto), store_id(opt,FK→stores), items(jsonb,NN), status(def:Received),
//           customer_name(NN), delivery_method(NN), address, table_number,
//           pickup_time, notes, total(NN), created_at
// products: id(auto), store_id(opt,FK→stores), name(NN), price(NN), category(NN),
//           description, image, extras, is_available, track_inventory, created_at,
//           tenant_id(opt,no FK), available

// ─── API ──────────────────────────────────────────────────────────────────────
const H = (extra = {}) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  ...extra,
});

const dbFetch = async (table, params = {}) => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (params.select) url.searchParams.set('select', params.select);
  if (params.eq)     url.searchParams.set(params.eq.col, `eq.${params.eq.val}`);
  if (params.limit)  url.searchParams.set('limit', String(params.limit));
  if (params.order)  url.searchParams.set('order', `${params.order.col}.${params.order.asc ? 'asc' : 'desc'}`);
  const res  = await fetch(url.toString(), { headers: H() });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
  return Array.isArray(json) ? json : [];
};

const dbInsert = async (table, row) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers: H({ Prefer: 'return=representation' }),
    body: JSON.stringify([row]),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || json?.error || JSON.stringify(json));
  return Array.isArray(json) ? json[0] : json;
};

const dbUpdate = async (table, id, data) => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('id', `eq.${id}`);
  const res = await fetch(url.toString(), { method: 'PATCH', headers: H(), body: JSON.stringify(data) });
  if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j?.message || `HTTP ${res.status}`); }
};

const dbDelete = async (table, id) => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('id', `eq.${id}`);
  await fetch(url.toString(), { method: 'DELETE', headers: H() });
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const parseItems = (o) => { try { return Array.isArray(o.items) ? o.items : JSON.parse(o.items||'[]'); } catch { return []; } };
const isAvail    = (p) => p.is_available !== false && p.available !== false;
const realImg    = (v) => v && (v.startsWith('http') || v.startsWith('data:'));

const STATUS = {
  Received:  { label:'🕐 Aguardando', color:'bg-yellow-100 text-yellow-800', border:'border-l-yellow-400' },
  Preparing: { label:'👨‍🍳 Preparando',  color:'bg-blue-100 text-blue-800',   border:'border-l-blue-400'   },
  Ready:     { label:'✅ Pronto',      color:'bg-green-100 text-green-700',  border:'border-l-green-400'  },
  Delivered: { label:'📦 Entregue',   color:'bg-gray-100 text-gray-500',    border:'border-l-gray-200'   },
  Cancelled: { label:'❌ Cancelado',  color:'bg-red-100 text-red-600',      border:'border-l-red-300'    },
};
const st = (s) => STATUS[s] || STATUS.Received;

// ─── BASE UI ──────────────────────────────────────────────────────────────────
const Overlay  = ({ children }) => <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">{children}</div>;
const Spin     = ({ sz=28, c='text-orange-500' }) => <Loader size={sz} className={`animate-spin ${c}`} />;
const Loading  = ({ text='Carregando...' }) => <Overlay><div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3"><Spin sz={40}/><p className="text-sm font-bold text-gray-500">{text}</p></div></Overlay>;

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const bg = { success:'bg-green-500', error:'bg-red-500', warning:'bg-yellow-500' }[type]||'bg-gray-700';
  const Ic = type==='success' ? CheckCircle : type==='warning' ? AlertTriangle : XCircle;
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl text-white shadow-2xl text-sm font-bold max-w-xs w-full ${bg}`}>
      <Ic size={18} className="flex-shrink-0"/><span className="flex-1">{msg}</span>
      <button onClick={onClose} className="text-white/70 hover:text-white text-lg">×</button>
    </div>
  );
};

const PImg = ({ p, cls='w-full h-44', eCls='text-6xl' }) => {
  const src = realImg(p?.image_url||p?.image) ? (p.image_url||p.image) : null;
  return src ? <img src={src} alt={p?.name} className={`${cls} object-cover`}/> : <span className={eCls}>{realImg(p?.image)?'🍔':(p?.image||'🍔')}</span>;
};

// ════════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView]         = useState('loading');
  const [tenant, setTenant]     = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart]         = useState([]);
  const [orders, setOrders]     = useState([]);
  const [tenants, setTenants]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [loadOrds, setLoadOrds] = useState(false);
  const [toast, setToast]       = useState(null);
  const [adminAuth, setAdminAuth] = useState(false);
  const [saasAuth, setSaasAuth]   = useState(false);
  const [tab, setTab]           = useState('resumo');
  const prevTab                 = useRef('');

  const toast$ = useCallback((msg, type='success') => setToast({ msg, type }), []);

  // ── Products ─────────────────────────────────────────────────────
  const loadProducts = useCallback(async (tid) => {
    try {
      let prods = [];
      for (const col of ['tenant_id', 'store_id']) {
        try {
          prods = await dbFetch('products', { eq: { col, val: tid } });
          if (prods.length > 0) break;
        } catch (_) {}
      }
      setProducts(prods);
    } catch { toast$('Erro ao carregar produtos','error'); }
  }, [toast$]);

  // ── Orders — filtra por store_id ou tenant_id (tenta os dois) ──
  const loadOrders = useCallback(async (tenantId) => {
    setLoadOrds(true);
    try {
      let rows = [];
      // Tenta store_id primeiro (após DROP CONSTRAINT funciona como tenant)
      for (const col of ['store_id', 'tenant_id']) {
        const tid = tenantId || tenant?.id;
        if (!tid) break;
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?${col}=eq.${tid}&order=created_at.desc&limit=100`,
          { headers: H() }
        );
        if (res.ok) {
          const json = await res.json();
          rows = Array.isArray(json) ? json : [];
          if (rows.length > 0) break; // achou dados, para
          // se veio array vazio, ainda é sucesso — mas tenta o outro col por precaução
          break;
        }
        // Se deu erro 400, tenta próxima coluna
      }
      // Fallback: busca todos se não filtrou
      if (rows.length === 0) {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?order=created_at.desc&limit=100`,
          { headers: H() }
        );
        if (res.ok) rows = await res.json().catch(() => []);
      }
      setOrders(Array.isArray(rows) ? rows : []);
    } catch { toast$('Erro ao carregar pedidos','error'); }
    finally { setLoadOrds(false); }
  }, [toast$, tenant]);

  // ── All tenants (master) ─────────────────────────────────────────
  const loadTenants = useCallback(async () => {
    setLoading(true);
    try { setTenants(await dbFetch('tenants', { order: { col:'created_at', asc:false } })); }
    catch { toast$('Erro','error'); }
    finally { setLoading(false); }
  }, [toast$]);

  // ── Init from URL ────────────────────────────────────────────────
  const initSlug = useCallback(async (slug) => {
    if (!slug)             { setView('home');      return; }
    if (slug === 'master') { setView('saas-login'); return; }
    setLoading(true);
    try {
      const rows = await dbFetch('tenants', { eq: { col:'slug', val:slug } });
      if (rows[0]) {
        setTenant(rows[0]); await loadProducts(rows[0].id); setView('menu');
        if (window.location.pathname !== `/${slug}`) window.history.replaceState({},''`/${slug}`);
      } else { toast$('Loja não encontrada','error'); setView('home'); window.history.replaceState({},'','/'); }
    } catch { toast$('Erro','error'); setView('home'); }
    finally { setLoading(false); }
  }, [loadProducts, toast$]);

  useEffect(() => {
    const slug = window.location.pathname.split('/').filter(Boolean)[0]||null;
    initSlug(slug);
  }, [initSlug]);

  // ── Admin tab auto-load ──────────────────────────────────────────
  useEffect(() => {
    if (!tenant||!adminAuth||view!=='admin'||prevTab.current===tab) return;
    prevTab.current = tab;
    if (['resumo','cozinha'].includes(tab))  loadOrders(tenant.id);
    if (['resumo','cardapio'].includes(tab)) loadProducts(tenant.id);
  }, [tab, view, adminAuth, tenant, loadOrders, loadProducts]);
  useEffect(() => { if (view==='admin'&&adminAuth&&tenant) prevTab.current=''; }, [view,adminAuth,tenant]);

  // ── Nav ──────────────────────────────────────────────────────────
  const go = useCallback((v, slug=null) => {
    if (slug)          window.history.pushState({},'',`/${slug}`);
    else if (v==='home') window.history.pushState({},'','/');
    setView(v);
  }, []);

  // ── Cart ─────────────────────────────────────────────────────────
  const addCart = useCallback((p) => {
    setCart(prev => { const ex=prev.find(i=>i.id===p.id); return ex?prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...prev,{...p,qty:1}]; });
    toast$(`${p.name} adicionado! 🛒`);
  }, [toast$]);
  const chgQty = useCallback((id, d) => setCart(p=>p.map(i=>i.id===id?{...i,qty:i.qty+d}:i).filter(i=>i.qty>0)), []);
  const cartN   = cart.reduce((s,i)=>s+i.qty,0);
  const cartT   = cart.reduce((s,i)=>s+parseFloat(i.price||0)*i.qty,0);

  const updStatus = useCallback(async (id,status) => {
    try { await dbUpdate('orders',id,{status}); setOrders(p=>p.map(o=>o.id===id?{...o,status}:o)); }
    catch { toast$('Erro','error'); }
  }, [toast$]);

  // ════════════════════════════════════════════════════════════════
  // HOME
  // ════════════════════════════════════════════════════════════════
  const HomePage = () => {
    const [recent, setRecent] = useState([]);
    useEffect(() => { dbFetch('tenants',{limit:6,order:{col:'created_at',asc:false}}).then(setRecent).catch(()=>{}); }, []);
    const quick = async (slug) => {
      setLoading(true);
      try { const r=await dbFetch('tenants',{eq:{col:'slug',val:slug}}); if(r[0]){setTenant(r[0]);await loadProducts(r[0].id);window.history.pushState({},'',`/${slug}`);setView('menu');} }
      catch { toast$('Erro','error'); } finally { setLoading(false); }
    };
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-50 to-yellow-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3"><Zap className="text-orange-500" size={44}/><span className="text-5xl">🍔</span></div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">Pedido Rápido</h1>
            <p className="text-gray-400 text-sm mt-1">Cardápio digital para lanchonetes</p>
          </div>
          <div className="space-y-3">
            <button onClick={()=>go('select')} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-bold text-lg shadow hover:brightness-110 transition active:scale-95">🏪 Acessar minha loja</button>
            <button onClick={()=>go('register')} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold text-lg shadow hover:brightness-110 transition active:scale-95">✨ Começar grátis (7 dias)</button>
          </div>
          {recent.length>0&&(
            <div className="mt-6">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Lojas recentes</p>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {recent.map(t=>(
                  <button key={t.id} onClick={()=>quick(t.slug)} className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 rounded-xl transition border border-orange-100">
                    <p className="font-bold text-sm text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-400">{window.location.origin}/{t.slug}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6 text-center">
            <button onClick={()=>go('saas-login')} className="text-gray-300 hover:text-gray-400 text-xs flex items-center gap-1 mx-auto"><Shield size={11}/> Acesso Master</button>
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // SELECT
  // ════════════════════════════════════════════════════════════════
  const SelectPage = () => {
    const [slug,setSlug]=useState('');
    const handle = async()=>{
      if(!slug.trim()){toast$('Digite o identificador','error');return;}
      setLoading(true);
      try{const r=await dbFetch('tenants',{eq:{col:'slug',val:slug.trim().toLowerCase()}});if(r[0]){setTenant(r[0]);await loadProducts(r[0].id);window.history.pushState({},'',`/${slug}`);setView('menu');}else toast$('Loja não encontrada!','error');}
      catch{toast$('Erro','error');}finally{setLoading(false);}
    };
    return(
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
          <button onClick={()=>go('home')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-orange-500 text-sm"><ArrowLeft size={16}/> Voltar</button>
          <div className="text-center mb-6"><Store className="text-orange-500 mx-auto mb-3" size={44}/><h2 className="text-2xl font-bold">Acessar Lanchonete</h2></div>
          <div className="flex items-center border-2 border-gray-200 focus-within:border-orange-400 rounded-xl overflow-hidden mb-4 transition">
            <span className="pl-4 text-gray-300 text-xs font-mono whitespace-nowrap">{window.location.origin}/</span>
            <input autoFocus value={slug} onChange={e=>setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} onKeyDown={e=>e.key==='Enter'&&handle()} placeholder="minha-loja" className="flex-1 px-2 py-3 outline-none text-sm"/>
          </div>
          <button onClick={handle} disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-bold hover:brightness-110 transition disabled:opacity-50">Entrar</button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // REGISTER
  // ════════════════════════════════════════════════════════════════
  const RegisterPage = () => {
    const [f,setF]=useState({name:'',slug:'',whatsapp:'',password:''});
    const [sav,setSav]=useState(false);
    const upd=(k,v)=>setF(p=>({...p,[k]:v}));
    const handle=async()=>{
      if(!f.name||!f.slug||!f.whatsapp||!f.password){toast$('Preencha todos os campos!','error');return;}
      setSav(true);
      try{
        const ex=await dbFetch('tenants',{eq:{col:'slug',val:f.slug}});
        if(ex.length){toast$('Identificador já existe!','error');return;}
        const t=await dbInsert('tenants',{name:f.name,slug:f.slug,whatsapp:f.whatsapp,phone:f.whatsapp,password:f.password,plan:'trial',active:true,created_at:new Date().toISOString()});
        setTenant(t);setProducts([]);window.history.pushState({},'',`/${f.slug}`);toast$('Conta criada! 🎉');setView('menu');
      }catch(e){toast$(`Erro: ${e.message}`,'error');}finally{setSav(false);}
    };
    return(
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
          <button onClick={()=>go('home')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-green-500 text-sm"><ArrowLeft size={16}/> Voltar</button>
          <div className="text-center mb-6"><div className="text-5xl mb-2">🎉</div><h2 className="text-2xl font-bold">Comece Grátis</h2><p className="text-gray-400 text-sm">7 dias • Sem cartão</p></div>
          <div className="space-y-3">
            <input placeholder="Nome da lanchonete *" value={f.name} onChange={e=>upd('name',e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-xl outline-none text-sm"/>
            <input placeholder="WhatsApp (5585999999999) *" value={f.whatsapp} onChange={e=>upd('whatsapp',e.target.value.replace(/\D/g,''))} className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-xl outline-none text-sm"/>
            <input type="password" placeholder="Senha de admin *" value={f.password} onChange={e=>upd('password',e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-xl outline-none text-sm"/>
            <div>
              <input placeholder="identificador-unico *" value={f.slug} onChange={e=>upd('slug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-400 rounded-xl outline-none text-sm"/>
              <p className="text-xs text-gray-400 mt-1">Link: {window.location.origin}/<b className="text-green-500">{f.slug||'seu-link'}</b></p>
            </div>
            <button onClick={handle} disabled={sav} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50">
              {sav?<Spin sz={20} c="text-white"/>:'🚀'} {sav?'Criando...':'Criar Minha Conta'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // SAAS LOGIN
  // ════════════════════════════════════════════════════════════════
  const SaasLogin = () => {
    const [pw,setPw]=useState('');const [show,setShow]=useState(false);const [err,setErr]=useState('');
    const handle=()=>{if(pw===SAAS_PASSWORD){setSaasAuth(true);loadTenants();setView('saas');}else setErr('Senha incorreta');};
    return(
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm">
          <div className="text-center mb-6"><Shield size={44} className="mx-auto text-orange-500 mb-2"/><h2 className="text-2xl font-extrabold">Master Admin</h2></div>
          <div className="relative mb-3">
            <input type={show?'text':'password'} value={pw} onChange={e=>{setPw(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&handle()} placeholder="Senha master" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:border-orange-400 outline-none" autoFocus/>
            <button onClick={()=>setShow(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button>
          </div>
          {err&&<p className="text-red-500 text-sm text-center mb-3">{err}</p>}
          <button onClick={handle} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-bold hover:brightness-110">Entrar</button>
          <button onClick={()=>go('home')} className="w-full mt-3 text-gray-400 text-sm hover:text-gray-600 flex items-center justify-center gap-1"><ArrowLeft size={14}/> Voltar</button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // SAAS DASHBOARD
  // ════════════════════════════════════════════════════════════════
  const SaasDash = () => {
    const [modal,setModal]=useState(false);
    const [nf,setNf]=useState({name:'',slug:'',phone:'',pw:'',exp:''});
    const [sav,setSav]=useState(false);
    const upd=(k,v)=>setNf(p=>({...p,[k]:v}));
    const create=async()=>{
      if(!nf.name.trim()||!nf.slug.trim()){toast$('Nome e slug obrigatórios','error');return;}
      setSav(true);
      try{await dbInsert('tenants',{name:nf.name,slug:nf.slug.toLowerCase().replace(/\s+/g,'-'),whatsapp:nf.phone,phone:nf.phone,password:nf.pw||'admin123',trial_expires_at:nf.exp||null,active:true,created_at:new Date().toISOString()});toast$('Loja criada!');setModal(false);setNf({name:'',slug:'',phone:'',pw:'',exp:''});loadTenants();}
      catch(e){toast$(`Erro: ${e.message}`,'error');}finally{setSav(false);}
    };
    return(
      <div className="min-h-screen bg-gray-100">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-4 flex justify-between items-center shadow">
          <div className="flex items-center gap-3"><Shield size={22} className="text-orange-400"/><div><p className="font-extrabold">Master Admin</p><p className="text-xs text-gray-400">{tenants.length} lojas</p></div></div>
          <button onClick={()=>{setSaasAuth(false);go('home');}} className="text-gray-300 hover:text-white text-sm flex items-center gap-1"><LogOut size={14}/> Sair</button>
        </div>
        <div className="max-w-3xl mx-auto p-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[['Total',tenants.length,'text-orange-500'],['Ativas',tenants.filter(t=>t.active).length,'text-green-500'],['Inativas',tenants.filter(t=>!t.active).length,'text-red-500']].map(([l,v,c])=>(
              <div key={l} className="bg-white rounded-xl p-3 shadow text-center"><p className={`text-3xl font-extrabold ${c}`}>{v}</p><p className="text-gray-400 text-xs">{l}</p></div>
            ))}
          </div>
          <button onClick={()=>setModal(true)} className="w-full mb-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110"><PlusCircle size={18}/> Nova Loja</button>
          <div className="space-y-2">
            {tenants.map(t=>(
              <div key={t.id} className="bg-white rounded-xl p-4 shadow flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${t.active?'bg-green-500':'bg-gray-300'}`}/>
                <div className="flex-1 min-w-0"><p className="font-bold truncate text-sm">{t.name}</p><p className="text-xs text-gray-400">/{t.slug}</p></div>
                <div className="flex gap-1">
                  <button onClick={()=>window.open(`/${t.slug}`,'_blank')} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Store size={14}/></button>
                  <button onClick={async()=>{try{await dbUpdate('tenants',t.id,{active:!t.active});setTenants(p=>p.map(x=>x.id===t.id?{...x,active:!x.active}:x));}catch{toast$('Erro','error');}}} className={`p-2 rounded-lg ${t.active?'text-green-600 hover:bg-green-50':'text-gray-400 hover:bg-gray-50'}`}>{t.active?<ToggleRight size={18}/>:<ToggleLeft size={18}/>}</button>
                  <button onClick={async()=>{if(!window.confirm(`Excluir "${t.name}"?`))return;try{await dbDelete('tenants',t.id);setTenants(p=>p.filter(x=>x.id!==t.id));}catch{toast$('Erro','error');}}} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {modal&&(
          <Overlay>
            <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md">
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-extrabold">Nova Loja</h3><button onClick={()=>setModal(false)}><X size={22} className="text-gray-400"/></button></div>
              <div className="space-y-3">
                <input placeholder="Nome *" value={nf.name} onChange={e=>upd('name',e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"/>
                <input placeholder="Slug *" value={nf.slug} onChange={e=>upd('slug',e.target.value.toLowerCase().replace(/\s+/g,'-'))} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"/>
                <input placeholder="WhatsApp" value={nf.phone} onChange={e=>upd('phone',e.target.value.replace(/\D/g,''))} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"/>
                <input placeholder="Senha (padrão: admin123)" value={nf.pw} onChange={e=>upd('pw',e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"/>
                <div><label className="text-xs text-gray-400 block mb-1">Expiração trial</label><input type="date" value={nf.exp} onChange={e=>upd('exp',e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"/></div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={()=>setModal(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50">Cancelar</button>
                <button onClick={create} disabled={sav} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2">{sav?<Spin sz={16} c="text-white"/>:<PlusCircle size={16}/>} Criar</button>
              </div>
            </div>
          </Overlay>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // MENU
  // ════════════════════════════════════════════════════════════════
  const MenuPage = () => {
    const [showLogin,setShowLogin]=useState(false);
    const [pw,setPw]=useState('');const [err,setErr]=useState('');
    if(!tenant) return <Loading text="Carregando loja..."/>;
    const avail=products.filter(isAvail);
    const doLogin=()=>{
      if(pw===(tenant.password||'admin123')){setAdminAuth(true);setShowLogin(false);setTab('resumo');prevTab.current='';setView('admin');}
      else setErr('Senha incorreta');
    };
    return(
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 sticky top-0 z-40 shadow-lg">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3"><Zap size={22}/><div><h1 className="font-extrabold text-lg leading-tight">{tenant.name}</h1><p className="text-xs opacity-70">Pedido Rápido</p></div></div>
            <div className="flex gap-2">
              <button onClick={()=>go('cart')} className="relative bg-orange-600 hover:bg-orange-700 p-3 rounded-xl transition">
                <ShoppingCart size={20}/>
                {cartN>0&&<span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-orange-900 text-xs font-extrabold rounded-full w-5 h-5 flex items-center justify-center">{cartN}</span>}
              </button>
              <button onClick={()=>adminAuth?setView('admin'):setShowLogin(true)} className="bg-orange-600 hover:bg-orange-700 p-3 rounded-xl transition"><Lock size={20}/></button>
            </div>
          </div>
        </header>
        <div className="max-w-5xl mx-auto p-4">
          {avail.length===0?(
            <div className="text-center py-24 text-gray-300"><Package size={72} className="mx-auto mb-4 opacity-40"/><h2 className="text-xl font-bold text-gray-400 mb-2">Cardápio vazio</h2><button onClick={()=>loadProducts(tenant.id)} className="mt-4 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 text-sm"><RefreshCw size={14} className="inline mr-2"/>Atualizar</button></div>
          ):(
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {avail.map(p=>(
                <div key={p.id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition">
                  <div className="h-44 bg-orange-50 flex items-center justify-center overflow-hidden"><PImg p={p} cls="w-full h-44" eCls="text-7xl"/></div>
                  <div className="p-4">
                    <h3 className="font-extrabold text-gray-800 mb-1">{p.name}</h3>
                    {p.description&&<p className="text-sm text-gray-400 mb-3 line-clamp-2">{p.description}</p>}
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-extrabold text-orange-500">R$ {parseFloat(p.price||0).toFixed(2)}</span>
                      <button onClick={()=>addCart(p)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1 transition active:scale-95"><Plus size={14}/> Add</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {showLogin&&(
          <Overlay>
            <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm">
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-extrabold flex items-center gap-2"><Lock size={18} className="text-orange-500"/>Admin</h3><button onClick={()=>{setShowLogin(false);setErr('');}}><X size={22} className="text-gray-400"/></button></div>
              <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&doLogin()} placeholder="Senha de administrador" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none mb-3" autoFocus/>
              {err&&<p className="text-red-500 text-sm mb-3">{err}</p>}
              <button onClick={doLogin} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-bold hover:brightness-110">Entrar</button>
            </div>
          </Overlay>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // CART
  // ════════════════════════════════════════════════════════════════
  const CartPage = () => {
    const [name,setName]=useState('');
    const [type,setType]=useState('local');
    const [mesa,setMesa]=useState('');
    const [addr,setAddr]=useState('');
    const [ref,setRef]=useState('');
    const [snd,setSnd]=useState(false);
    const [done,setDone]=useState(false);   // modal de sucesso
    const [wppMsg,setWppMsg]=useState('');  // mensagem WhatsApp pré-montada
    if(!tenant) return null;

    const openWpp=()=>{
      const wp=tenant.whatsapp||tenant.phone;
      if(wp&&wppMsg) window.open(`https://wa.me/${wp}?text=${wppMsg}`,'_blank');
    };

    const send=async()=>{
      if(!name.trim())               {toast$('Digite seu nome!','error');   return;}
      if(type==='local'&&!mesa.trim()){toast$('Digite o nº da mesa!','error');return;}
      if(type==='entrega'&&!addr.trim()){toast$('Digite o endereço!','error'); return;}
      if(!cart.length)               {toast$('Carrinho vazio!','error');    return;}
      setSnd(true);
      try{
        // ── INSERT com schema exato de orders ──
        // NOT NULL: customer_name, delivery_method, items(jsonb), total
        const row={
          customer_name:   name,
          delivery_method: type,
          items:           cart,
          total:           cartT,
          status:          'Received',
          store_id:        tenant.id,   // liga pedido à loja (após DROP CONSTRAINT)
          tenant_id:       tenant.id,   // coluna extra para filtro (se existir)
          created_at:      new Date().toISOString(),
        };
        if(type==='local')   row.table_number=mesa;
        if(type==='entrega') row.address=addr+(ref?` | Ref: ${ref}`:'');
        if(type==='viagem')  row.notes='Para viagem';

        await dbInsert('orders',row);

        // Monta mensagem WhatsApp para uso opcional
        const loc2=type==='local'?`🪑 Mesa ${mesa}`:type==='viagem'?'🛍️ Para viagem':`🛵 ${addr}`;
        let msg2=`🍔 *PEDIDO - ${tenant.name}*%0A%0A👤 ${name}%0A📍 ${loc2}%0A%0A`;
        [...cart].forEach(i=>{msg2+=`• ${i.qty}x ${i.name} — R$${(parseFloat(i.price)*i.qty).toFixed(2)}%0A`;});
        msg2+=`%0A💰 *TOTAL: R$${cartT.toFixed(2)}*`;
        setWppMsg(msg2);
        setCart([]);
        setDone(true); // mostra modal de sucesso
      }catch(e){toast$(`Erro: ${e.message}`,'error');}
      finally{setSnd(false);}
    };

    return(
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 shadow">
          <button onClick={()=>go('menu')} className="flex items-center gap-2 mb-2 opacity-90 hover:opacity-100 text-sm"><ArrowLeft size={16}/> Voltar ao Cardápio</button>
          <h1 className="text-2xl font-extrabold">Seu Carrinho</h1>
        </header>
        {/* Modal de sucesso com WhatsApp opcional */}
      {done&&(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm text-center">
            <div className="text-6xl mb-3">🎉</div>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-1">Pedido Enviado!</h2>
            <p className="text-gray-400 text-sm mb-6">Seu pedido foi registrado com sucesso e já está na cozinha.</p>
            {(tenant.whatsapp||tenant.phone)&&(
              <button onClick={openWpp} className="w-full mb-3 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm">
                <span className="text-lg">💬</span> Confirmar pelo WhatsApp (opcional)
              </button>
            )}
            <button onClick={()=>{setDone(false);setView('menu');}} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition text-sm">
              Voltar ao Cardápio
            </button>
          </div>
        </div>
      )}
      <div className="max-w-lg mx-auto p-4 space-y-4">
          {cart.length===0?(
            <div className="bg-white rounded-2xl shadow p-12 text-center"><ShoppingCart className="text-gray-200 mx-auto mb-4" size={64}/><p className="text-gray-400 mb-4">Carrinho vazio</p><button onClick={()=>go('menu')} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600">Ver Cardápio</button></div>
          ):(
            <>
              <div className="bg-white rounded-2xl shadow p-4 space-y-3">
                {cart.map(item=>(
                  <div key={item.id} className="flex items-center gap-3 pb-3 border-b last:border-0 last:pb-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-orange-50 flex items-center justify-center"><PImg p={item} cls="w-12 h-12" eCls="text-2xl"/></div>
                    <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{item.name}</p><p className="text-orange-500 text-sm">R$ {parseFloat(item.price).toFixed(2)}</p></div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={()=>chgQty(item.id,-1)} className="bg-gray-100 hover:bg-gray-200 p-1.5 rounded-lg"><Minus size={13}/></button>
                      <span className="font-bold w-5 text-center text-sm">{item.qty}</span>
                      <button onClick={()=>chgQty(item.id, 1)} className="bg-orange-500 hover:bg-orange-600 text-white p-1.5 rounded-lg"><Plus size={13}/></button>
                      <button onClick={()=>setCart(c=>c.filter(i=>i.id!==item.id))} className="bg-red-100 text-red-500 p-1.5 rounded-lg ml-1"><Trash2 size={13}/></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow p-4 space-y-3">
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome *" className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-xl outline-none text-sm"/>
                <div className="grid grid-cols-3 gap-2">
                  {[['local','🪑 Local'],['viagem','🛍️ Viagem'],['entrega','🛵 Entrega']].map(([v,l])=>(
                    <button key={v} onClick={()=>setType(v)} className={`py-2.5 rounded-xl text-sm font-bold transition ${type===v?'bg-orange-500 text-white shadow':'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>{l}</button>
                  ))}
                </div>
                {type==='local'&&<input value={mesa} onChange={e=>setMesa(e.target.value)} placeholder="Número da mesa *" className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-xl outline-none text-sm"/>}
                {type==='entrega'&&(
                  <div className="space-y-2">
                    <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="Rua, número, bairro *" className="w-full px-4 py-3 border-2 border-orange-200 focus:border-orange-400 rounded-xl outline-none text-sm"/>
                    <input value={ref} onChange={e=>setRef(e.target.value)} placeholder="Ponto de referência (opcional)" className="w-full px-4 py-3 border-2 border-gray-200 focus:border-orange-400 rounded-xl outline-none text-sm"/>
                    <p className="text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-xl">🛵 Taxa de entrega combinada via WhatsApp</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow p-4">
                <div className="flex justify-between items-center mb-4"><span className="font-bold text-lg">Total</span><span className="text-2xl font-extrabold text-orange-500">R$ {cartT.toFixed(2)}</span></div>
                <button onClick={send} disabled={snd} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-extrabold text-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50">
                  {snd?<Spin sz={22} c="text-white"/>:<Send size={22}/>}
                  {snd?'Enviando...':'Confirmar Pedido'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ADMIN
  // ════════════════════════════════════════════════════════════════
  const AdminPage = () => {
    const [modal,setModal]=useState(false);
    const [editP,setEditP]=useState(null);
    const [pf,setPf]=useState({name:'',price:'',cat:'Geral',desc:'',img:'',imgUrl:''});
    const [upl,setUpl]=useState(false);
    const [pSav,setPSav]=useState(false);
    const [sf,setSf]=useState({name:tenant?.name||'',wpp:tenant?.whatsapp||tenant?.phone||'',pw:''});
    const [sSav,setSSav]=useState(false);
    const upd=(k,v)=>setPf(p=>({...p,[k]:v}));
    const CATS=['Geral','Lanches','Bebidas','Sobremesas','Porções','Combos','Vegano','Outros'];

    const openNew=()=>{setEditP(null);setPf({name:'',price:'',cat:'Geral',desc:'',img:'',imgUrl:''});setModal(true);};
    const openEdit=(p)=>{
      setEditP(p);
      const src=p.image_url||p.image||'';
      setPf({name:p.name,price:String(p.price),cat:p.category||'Geral',desc:p.description||'',
             img:realImg(src)?'':src, imgUrl:realImg(src)?src:''});
      setModal(true);
    };

    const uploadImg=async(file)=>{
      if(!file)return;setUpl(true);
      try{
        const blob=await new Promise((res,rej)=>{
          const img=new Image(),url=URL.createObjectURL(file);
          img.onload=()=>{
            const max=800,w=img.width,h=img.height;
            const [nw,nh]=w>h?[max,Math.round(h*max/w)]:[Math.round(w*max/h),max];
            const c=document.createElement('canvas');c.width=Math.min(w,nw);c.height=Math.min(h,nh);
            c.getContext('2d').drawImage(img,0,0,c.width,c.height);
            c.toBlob(b=>b?res(b):rej(new Error('Falhou')),'image/webp',0.85);
            URL.revokeObjectURL(url);
          };img.onerror=rej;img.src=url;
        });
        const fn=`${tenant.id}/${Date.now()}.webp`;
        const up=await fetch(`${SUPABASE_URL}/storage/v1/object/products/${fn}`,{
          method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,'Content-Type':'image/webp','x-upsert':'true'},body:blob,
        });
        if(up.ok){upd('imgUrl',`${SUPABASE_URL}/storage/v1/object/public/products/${fn}`);upd('img','');toast$('Imagem enviada! ✅');}
        else{
          // Fallback: salva como base64 no estado (será gravado no campo image do produto)
          await new Promise(r=>{
            const rd=new FileReader();
            rd.onload=e=>{ upd('imgUrl',e.target.result); upd('img',''); r(); };
            rd.readAsDataURL(blob);
          });
          toast$('Foto adicionada! ✅ Clique em Criar/Salvar para gravar.');
        }
      }catch(e){toast$(`Erro: ${e.message}`,'error');}
      finally{setUpl(false);}
    };

    const saveProd=async()=>{
      if(!pf.name.trim()||!pf.price){toast$('Nome e preço obrigatórios','error');return;}
      setPSav(true);
      try{
        const imgVal=pf.imgUrl||pf.img||null;
        if(editP){
          // Update — só campos que têm no schema e não tem FK problemática
          await dbUpdate('products',editP.id,{name:pf.name,price:parseFloat(pf.price),category:pf.cat||'Geral',description:pf.desc||null,image:imgVal});
        }else{
          // Insert com schema exato confirmado de products
          // Usa tenant_id (sem FK) — NÃO usa store_id (FK→stores, inválida para tenants)
          await dbInsert('products',{
            tenant_id:    tenant.id,
            store_id:     tenant.id,   // após DROP CONSTRAINT funciona livremente
            name:         pf.name,
            price:        parseFloat(pf.price),
            category:     pf.cat||'Geral',
            description:  pf.desc||null,
            image:        imgVal,
            is_available: true,
            available:    true,
            extras:       [],
          });
        }
        toast$(editP?'Produto atualizado! ✅':'Produto criado! ✅');
        setModal(false);loadProducts(tenant.id);
      }catch(e){toast$(`Erro: ${e.message}`,'error');}
      finally{setPSav(false);}
    };

    const TABS=[{id:'resumo',label:'Resumo',Icon:LayoutDashboard},{id:'cozinha',label:'Cozinha',Icon:ChefHat},{id:'cardapio',label:'Cardápio',Icon:UtensilsCrossed},{id:'ajustes',label:'Ajustes',Icon:Settings}];

    return(
      <div className="min-h-screen bg-gray-100 pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 shadow">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div><p className="font-extrabold text-lg">{tenant.name}</p><p className="text-xs opacity-70">Painel Admin</p></div>
            <div className="flex gap-2">
              <button onClick={()=>go('menu')} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm flex items-center gap-1"><Store size={14}/> Cardápio</button>
              <button onClick={()=>{setAdminAuth(false);setView('menu');}} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm flex items-center gap-1"><LogOut size={14}/> Sair</button>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
          <div className="max-w-4xl mx-auto flex overflow-x-auto">
            {TABS.map(({id,label,Icon})=>(
              <button key={id} onClick={()=>setTab(id)} className={`flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition ${tab===id?'border-orange-500 text-orange-600':'border-transparent text-gray-400 hover:text-gray-700'}`}><Icon size={15}/>{label}</button>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4">

          {/* ─ RESUMO ─ */}
          {tab==='resumo'&&(
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[['Pedidos',orders.length,'text-orange-500'],['Aguardando',orders.filter(o=>['Received','pending'].includes(o.status)).length,'text-yellow-500'],['Entregues',orders.filter(o=>o.status==='Delivered').length,'text-green-500'],['Produtos',products.filter(isAvail).length,'text-blue-500']].map(([l,v,c])=>(
                  <div key={l} className="bg-white rounded-xl p-4 shadow text-center"><p className={`text-3xl font-extrabold ${c}`}>{v}</p><p className="text-gray-400 text-xs mt-0.5">{l}</p></div>
                ))}
              </div>
              <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wide mb-3">Últimos pedidos</h3>
              {loadOrds?<div className="flex justify-center py-8"><Spin/></div>:(
                <div className="space-y-2">
                  {orders.slice(0,8).map(o=>{const s=st(o.status);return(
                    <div key={o.id} className="bg-white rounded-xl p-4 shadow flex justify-between items-center">
                      <div><p className="font-bold text-sm">{o.customer_name}</p><p className="text-xs text-gray-400">R$ {parseFloat(o.total||0).toFixed(2)} · {new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p></div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${s.color}`}>{s.label}</span>
                    </div>
                  );})}
                  {orders.length===0&&<p className="text-center text-gray-400 py-8 text-sm">Nenhum pedido ainda</p>}
                </div>
              )}
            </div>
          )}

          {/* ─ COZINHA ─ */}
          {tab==='cozinha'&&(
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-extrabold text-lg">Pedidos ao Vivo</h2>
                <button onClick={()=>loadOrders(tenant.id)} className="p-2 text-orange-500 hover:bg-orange-50 rounded-xl"><RefreshCw size={20}/></button>
              </div>
              {loadOrds?<div className="flex justify-center py-16"><Spin sz={40}/></div>:
               orders.length===0?<div className="text-center py-16 text-gray-300"><ClipboardList size={64} className="mx-auto mb-3"/><p>Nenhum pedido</p></div>:(
                <div className="space-y-3">
                  {orders.map(o=>{const s=st(o.status);const items=parseItems(o);return(
                    <div key={o.id} className={`bg-white rounded-2xl p-4 shadow border-l-4 ${s.border}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-extrabold">{o.customer_name}</p>
                          <p className="text-sm text-gray-500">
                            {o.delivery_method==='local'&&`🪑 Mesa ${o.table_number||'-'}`}
                            {o.delivery_method==='viagem'&&'🛍️ Para viagem'}
                            {o.delivery_method==='entrega'&&`🛵 ${o.address||'Endereço não informado'}`}
                          </p>
                          <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${s.color}`}>{s.label}</span>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
                        {items.map((it,i)=>(
                          <div key={i} className="flex justify-between text-sm">
                            <span>{it.qty}x {it.name}</span>
                            <span className="font-semibold text-gray-500">R$ {(parseFloat(it.price||0)*it.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      {o.notes&&<p className="text-xs text-gray-400 italic mb-2">📝 {o.notes}</p>}
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-orange-500">R$ {parseFloat(o.total||0).toFixed(2)}</span>
                        <div className="flex gap-2">
                          {o.status==='Received'  &&<button onClick={()=>updStatus(o.id,'Preparing')} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600">👨‍🍳 Preparar</button>}
                          {o.status==='Preparing' &&<button onClick={()=>updStatus(o.id,'Ready')}     className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-600">✅ Pronto</button>}
                          {o.status==='Ready'     &&<button onClick={()=>updStatus(o.id,'Delivered')} className="bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-700">📦 Entregue</button>}
                          {!['Delivered','Cancelled'].includes(o.status)&&<button onClick={()=>updStatus(o.id,'Cancelled')} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200">✕ Cancelar</button>}
                        </div>
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>
          )}

          {/* ─ CARDÁPIO ─ */}
          {tab==='cardapio'&&(
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-extrabold text-lg">Gerenciar Cardápio</h2>
                <button onClick={openNew} className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1 hover:bg-orange-600"><PlusCircle size={15}/> Novo</button>
              </div>
              {products.length===0?<div className="text-center py-16 text-gray-300"><Package size={64} className="mx-auto mb-3"/><p>Nenhum produto</p></div>:(
                <div className="space-y-2">
                  {products.map(p=>(
                    <div key={p.id} className="bg-white rounded-xl p-3 shadow flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-orange-50 flex items-center justify-center"><PImg p={p} cls="w-12 h-12" eCls="text-2xl"/></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{p.name}</p>
                        <p className="text-orange-500 text-sm font-bold">R$ {parseFloat(p.price||0).toFixed(2)}</p>
                        <p className="text-gray-400 text-xs">{p.category}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={async()=>{const v=!isAvail(p);await dbUpdate('products',p.id,{is_available:v,available:v});setProducts(pr=>pr.map(x=>x.id===p.id?{...x,is_available:v,available:v}:x));toast$(v?'Ativado ✅':'Desativado');}} className={`px-2 py-1 rounded-lg text-xs font-bold ${isAvail(p)?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{isAvail(p)?'✅':'❌'}</button>
                        <button onClick={()=>openEdit(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={14}/></button>
                        <button onClick={async()=>{if(!window.confirm(`Excluir "${p.name}"?`))return;await dbDelete('products',p.id);setProducts(pr=>pr.filter(x=>x.id!==p.id));toast$('Excluído');}} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {modal&&(
                <Overlay>
                  <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-extrabold">{editP?'Editar':'Novo Produto'}</h3><button onClick={()=>setModal(false)}><X size={22} className="text-gray-400"/></button></div>
                    <div className="space-y-3">
                      <input placeholder="Nome do produto *" value={pf.name} onChange={e=>upd('name',e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"/>
                      <div className="flex gap-2">
                        <input placeholder="Preço *" value={pf.price} onChange={e=>upd('price',e.target.value)} type="number" step="0.01" min="0" className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"/>
                        <select value={pf.cat} onChange={e=>upd('cat',e.target.value)} className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-3 text-sm focus:border-orange-400 outline-none bg-white">
                          {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <textarea placeholder="Descrição (opcional)" value={pf.desc} onChange={e=>upd('desc',e.target.value)} rows={2} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none resize-none"/>
                      {/* Image */}
                      <div>
                        <label className="text-xs font-bold text-gray-400 block mb-2">Foto do Produto</label>
                        {pf.imgUrl?(
                          <div className="relative h-32 rounded-xl overflow-hidden border-2 border-orange-200">
                            <img src={pf.imgUrl} alt="preview" className="w-full h-full object-cover"/>
                            <button onClick={()=>{upd('imgUrl','');upd('img','');}} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow"><X size={13}/></button>
                          </div>
                        ):(
                          <label className={`flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-xl cursor-pointer transition ${upl?'border-orange-400 bg-orange-50':'border-gray-200 hover:border-orange-300 hover:bg-orange-50'}`}>
                            {upl?<><Spin sz={22}/><span className="text-xs text-orange-500 mt-1">Convertendo...</span></>:<><Camera size={24} className="text-gray-300 mb-1"/><span className="text-xs text-gray-400">Foto ou galeria → WebP automático</span></>}
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>e.target.files[0]&&uploadImg(e.target.files[0])}/>
                          </label>
                        )}
                        <div className="flex items-center gap-2 mt-2"><div className="flex-1 h-px bg-gray-100"/><span className="text-xs text-gray-300">ou emoji</span><div className="flex-1 h-px bg-gray-100"/></div>
                        <input placeholder="🍔 🍕 🌮" value={pf.img} onChange={e=>{upd('img',e.target.value);upd('imgUrl','');}} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-orange-400 outline-none mt-1"/>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button onClick={()=>setModal(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50">Cancelar</button>
                      <button onClick={saveProd} disabled={pSav||upl} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2">{pSav?<Spin sz={15} c="text-white"/>:<CheckCircle size={15}/>}{editP?'Salvar':'Criar'}</button>
                    </div>
                  </div>
                </Overlay>
              )}
            </div>
          )}

          {/* ─ AJUSTES ─ */}
          {tab==='ajustes'&&(
            <div className="max-w-md">
              <h2 className="font-extrabold text-lg mb-4">Ajustes da Loja</h2>
              <div className="bg-white rounded-2xl p-5 shadow space-y-4">
                <div><label className="text-xs font-bold text-gray-400 block mb-1">Nome</label><input value={sf.name} onChange={e=>setSf(p=>({...p,name:e.target.value}))} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"/></div>
                <div><label className="text-xs font-bold text-gray-400 block mb-1">WhatsApp</label><input value={sf.wpp} onChange={e=>setSf(p=>({...p,wpp:e.target.value.replace(/\D/g,'')}))} placeholder="5585999999999" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"/></div>
                <div><label className="text-xs font-bold text-gray-400 block mb-1">Nova senha (branco = não altera)</label><input type="password" value={sf.pw} onChange={e=>setSf(p=>({...p,pw:e.target.value}))} placeholder="Nova senha" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none"/></div>
                <div><label className="text-xs font-bold text-gray-400 block mb-1">Link do cardápio</label><div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-orange-500 font-mono break-all select-all">{window.location.origin}/{tenant?.slug}</div></div>
                <button onClick={async()=>{setSSav(true);try{const d={name:sf.name,whatsapp:sf.wpp,phone:sf.wpp};if(sf.pw.trim())d.password=sf.pw;await dbUpdate('tenants',tenant.id,d);setTenant(p=>({...p,...d}));toast$('Salvo! ✅');}catch(e){toast$(`Erro: ${e.message}`,'error');}finally{setSSav(false);}}} disabled={sSav} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-bold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2">{sSav?<Spin sz={15} c="text-white"/>:<CheckCircle size={15}/>} Salvar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return(
    <>
      {loading&&!['menu','admin','saas'].includes(view)&&<Loading/>}
      {view==='loading'   &&<Loading text="Iniciando..."/>}
      {view==='home'      &&<HomePage/>}
      {view==='select'    &&<SelectPage/>}
      {view==='register'  &&<RegisterPage/>}
      {view==='saas-login'&&<SaasLogin/>}
      {view==='saas'      &&<SaasDash/>}
      {view==='menu'      &&<MenuPage/>}
      {view==='cart'      &&<CartPage/>}
      {view==='admin'     &&<AdminPage/>}
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
