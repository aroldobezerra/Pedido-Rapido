import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Send, Lock, ArrowLeft, Store, Loader, Zap } from 'lucide-react';

// VARIÁVEIS DE AMBIENTE - Configurar na Vercel
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

const PedidoRapido = () => {
  const [view, setView] = useState('home');
  const [currentTenant, setCurrentTenant] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAPI = async (table, params = {}) => {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    const queryParams = [];
    
    if (params.select) queryParams.push(`select=${params.select}`);
    if (params.eq) queryParams.push(`${params.eq.column}=eq.${params.eq.value}`);
    if (params.limit) queryParams.push(`limit=${params.limit}`);
    if (params.order) queryParams.push(`order=${params.order.column}.${params.order.ascending ? 'asc' : 'desc'}`);
    
    if (queryParams.length > 0) url += '?' + queryParams.join('&');

    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
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
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  };

  const createTenant = async (name, slug, whatsapp, password) => {
    try {
      setLoading(true);
      const existing = await fetchAPI('tenants', { eq: { column: 'slug', value: slug } });
      if (existing.length > 0) {
        alert('Identificador já existe!');
        return null;
      }
      const data = await insertAPI('tenants', [{ name, slug, whatsapp, password, plan: 'trial' }]);
      return data[0];
    } catch (err) {
      alert('Erro: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getTenant = async (slug) => {
    try {
      setLoading(true);
      const data = await fetchAPI('tenants', { eq: { column: 'slug', value: slug } });
      return data[0] || null;
    } catch (err) {
      alert('Erro: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getProducts = async (tenantId) => {
    try {
      const data = await fetchAPI('products', { eq: { column: 'tenant_id', value: tenantId } });
      return data || [];
    } catch (err) {
      return [];
    }
  };

  const listTenants = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('tenants', { 
        select: 'id,name,slug', 
        limit: 10, 
        order: { column: 'created_at', ascending: false } 
      });
      return data || [];
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (productId, updates) => {
    await updateAPI('products', 'id', productId, updates);
  };

  const updateTenant = async (tenantId, updates) => {
    await updateAPI('tenants', 'id', tenantId, updates);
  };

  const createOrder = async (tenantId, customerName, orderType, tableNumber, items, total) => {
    await insertAPI('orders', [{
      tenant_id: tenantId,
      customer_name: customerName,
      order_type: orderType,
      table_number: tableNumber,
      items: JSON.stringify(items),
      total: total,
      status: 'aguardando'
    }]);
  };

  const HomePage = () => {
    const [tenants, setTenants] = useState([]);

    useEffect(() => {
      listTenants().then(setTenants);
    }, []);

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-50 to-yellow-100 flex items-center justify-center p-4">
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <Loader className="animate-spin text-white" size={48} />
          </div>
        )}
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
            <p className="text-xs text-gray-400 mt-2">Powered by Supabase + Vercel</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setView('select')}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg transform hover:scale-105 transition"
            >
              🏪 Acessar Minha Lanchonete
            </button>
            <button
              onClick={() => setView('register')}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg transform hover:scale-105 transition"
            >
              ✨ Começar Grátis (7 dias)
            </button>
          </div>

          {tenants.length > 0 && (
            <div className="mt-8">
              <p className="text-sm text-gray-600 mb-3 font-semibold">Clientes recentes:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tenants.slice(0, 5).map(t => (
                  <button
                    key={t.id}
                    onClick={async () => {
                      const tenant = await getTenant(t.slug);
                      if (tenant) {
                        setCurrentTenant(tenant);
                        setProducts(await getProducts(tenant.id));
                        setView('menu');
                      }
                    }}
                    className="w-full text-left px-4 py-3 bg-gradient-to-r from-gray-50 to-orange-50 hover:from-orange-50 hover:to-red-50 rounded-lg transition border border-gray-200"
                  >
                    <p className="font-bold text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-500">pedidorapido.com/{t.slug}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-2">💼 Quer vender este sistema?</p>
            <a href="mailto:contato@pedidorapido.com" className="text-sm text-orange-500 hover:text-orange-600 font-semibold">
              Seja um Revendedor →
            </a>
          </div>
        </div>
      </div>
    );
  };

  const SelectPage = () => {
    const [slug, setSlug] = useState('');

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
          <button onClick={() => setView('home')} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-500 transition">
            <ArrowLeft size={20} /> Voltar
          </button>
          <div className="text-center mb-8">
            <Store className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-800">Acessar Lanchonete</h2>
            <p className="text-gray-600 text-sm mt-2">Digite seu identificador único</p>
          </div>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="minha-lanchonete"
            className="w-full px-4 py-3 border-2 border-gray-300 focus:border-orange-500 rounded-xl mb-4 outline-none transition"
          />
          <button
            onClick={async () => {
              const tenant = await getTenant(slug);
              if (tenant) {
                setCurrentTenant(tenant);
                setProducts(await getProducts(tenant.id));
                setView('menu');
              } else {
                alert('Lanchonete não encontrada!');
              }
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  };

  const RegisterPage = () => {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [password, setPassword] = useState('');

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
          <button onClick={() => setView('home')} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-green-500 transition">
            <ArrowLeft size={20} /> Voltar
          </button>
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Comece Grátis</h2>
            <p className="text-gray-600 text-sm">7 dias de teste, sem cartão</p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da Lanchonete"
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-green-500 rounded-xl outline-none transition"
            />
            <div>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="identificador-unico"
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-green-500 rounded-xl outline-none transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                Seu link: pedidorapido.com/<span className="font-semibold text-green-600">{slug || 'seu-link'}</span>
              </p>
            </div>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="WhatsApp (5585999999999)"
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-green-500 rounded-xl outline-none transition"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha de Admin"
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-green-500 rounded-xl outline-none transition"
            />
            <button
              onClick={async () => {
                if (!name || !slug || !whatsapp || !password) {
                  alert('Preencha todos os campos!');
                  return;
                }
                const tenant = await createTenant(name, slug, whatsapp, password);
                if (tenant) {
                  setCurrentTenant(tenant);
                  setProducts(await getProducts(tenant.id));
                  alert('✅ Conta criada! 7 dias grátis começam agora!');
                  setView('menu');
                }
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold transition"
            >
              🚀 Criar Minha Conta
            </button>
          </div>
          <div className="mt-6 p-4 bg-green-50 rounded-xl">
            <p className="text-xs text-gray-600 text-center">
              ✓ Sem cartão de crédito<br/>
              ✓ Cancelamento a qualquer momento<br/>
              ✓ Suporte via WhatsApp
            </p>
          </div>
        </div>
      </div>
    );
  };

  const MenuPage = () => {
    if (!currentTenant) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 sticky top-0 z-50 shadow-lg">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Zap size={32} />
              <div>
                <h1 className="text-2xl font-bold">{currentTenant.name}</h1>
                <p className="text-xs opacity-90">Pedido Rápido</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView('cart')} className="bg-orange-600 hover:bg-orange-700 p-3 rounded-lg relative transition">
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-orange-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
              <button onClick={() => setView('admin-login')} className="bg-orange-600 hover:bg-orange-700 p-3 rounded-lg transition">
                <Lock size={20} />
              </button>
            </div>
          </div>
        </header>
        <div className="container mx-auto p-6">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Nenhum produto disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.filter(p => p.available).map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition transform hover:scale-105">
                  <div className="text-6xl text-center mb-4">{p.image}</div>
                  <h3 className="text-xl font-bold text-center mb-2">{p.name}</h3>
                  {p.description && <p className="text-sm text-gray-600 text-center mb-3">{p.description}</p>}
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-orange-500">R$ {parseFloat(p.price).toFixed(2)}</span>
                    <button
                      onClick={() => {
                        const ex = cart.find(i => i.id === p.id);
                        if (ex) {
                          setCart(cart.map(i => i.id === p.id ? {...i, qty: i.qty + 1} : i));
                        } else {
                          setCart([...cart, {...p, qty: 1}]);
                        }
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                    >
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const CartPage = () => {
    const [name, setName] = useState('');
    const [orderType, setOrderType] = useState('local');
    const [tableNumber, setTableNumber] = useState('');
    if (!currentTenant) return null;

    const total = cart.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 shadow-lg">
          <button onClick={() => setView('menu')} className="flex items-center gap-2 mb-2 hover:opacity-80 transition">
            <ArrowLeft size={20} /> Voltar ao Cardápio
          </button>
          <h1 className="text-3xl font-bold">Seu Carrinho</h1>
        </header>
        <div className="container mx-auto p-6 max-w-2xl">
          {cart.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl">Carrinho vazio</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4 border-b pb-4 last:border-0">
                    <div className="text-4xl">{item.image}</div>
                    <div className="flex-1">
                      <h4 className="font-bold">{item.name}</h4>
                      <p className="text-orange-500">R$ {parseFloat(item.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, qty: Math.max(1, i.qty - 1)} : i))} className="bg-gray-200 hover:bg-gray-300 p-2 rounded-lg transition">
                        <Minus size={16} />
                      </button>
                      <span className="font-bold w-8 text-center">{item.qty}</span>
                      <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i))} className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition">
                        <Plus size={16} />
                      </button>
                      <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg ml-2 transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="w-full px-4 py-3 border-2 border-gray-300 focus:border-orange-500 rounded-xl mb-4 outline-none transition" />
                <div className="flex gap-3 mb-4">
                  <button onClick={() => setOrderType('local')} className={`flex-1 py-3 rounded-xl font-semibold transition ${orderType === 'local' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}>Local</button>
                  <button onClick={() => setOrderType('viagem')} className={`flex-1 py-3 rounded-xl font-semibold transition ${orderType === 'viagem' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}>Viagem</button>
                </div>
                {orderType === 'local' && <input type="text" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Número da mesa" className="w-full px-4 py-3 border-2 border-gray-300 focus:border-orange-500 rounded-xl outline-none transition" />}
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-bold">Total</span>
                  <span className="text-3xl font-bold text-orange-500">R$ {total.toFixed(2)}</span>
                </div>
                <button
                  onClick={async () => {
                    if (!name) return alert('Digite seu nome!');
                    if (orderType === 'local' && !tableNumber) return alert('Digite a mesa!');
                    let msg = `🍔 *PEDIDO RÁPIDO*%0A${currentTenant.name}%0A%0A👤 ${name}%0A📍 ${orderType === 'local' ? `Mesa ${tableNumber}` : 'Viagem'}%0A%0A`;
                    cart.forEach(i => msg += `${i.image} ${i.name} - ${i.qty}x R$${parseFloat(i.price).toFixed(2)}%0A`);
                    msg += `%0A━━━━━━━━━━━━━━━━%0A💰 *TOTAL: R$${total.toFixed(2)}*`;
                    await createOrder(currentTenant.id, name, orderType, tableNumber, cart, total);
                    window.open(`https://wa.me/${currentTenant.whatsapp}?text=${msg}`, '_blank');
                    setCart([]);
                    alert('✅ Pedido enviado com sucesso!');
                    setView('menu');
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition transform hover:scale-105"
                >
                  <Send size={24} /> Enviar via WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const AdminLoginPage = () => {
    const [pass, setPass] = useState('');
    if (!currentTenant) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
          <button onClick={() => setView('menu')} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-purple-500 transition">
            <ArrowLeft size={20} /> Voltar
          </button>
          <div className="text-center mb-8">
            <Lock className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold">Área Admin</h2>
          </div>
          <input 
            type="password" 
            value={pass} 
            onChange={(e) => setPass(e.target.value)} 
            placeholder="Senha de administrador" 
            className="w-full px-4 py-3 border-2 border-gray-300 focus:border-purple-500 rounded-xl mb-4 outline-none transition" 
          />
          <button
            onClick={() => {
              if (pass === currentTenant.password) {
                setView('admin');
              } else {
                alert('❌ Senha incorreta!');
              }
            }}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-bold transition"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  };

  const AdminPage = () => {
    const [whatsappEdit, setWhatsappEdit] = useState(currentTenant?.whatsapp || '');
    if (!currentTenant) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800">Painel Admin</h1>
            <button onClick={() => setView('menu')} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg transition">Sair</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-gray-600 text-sm">Plano Atual</p>
              <p className="text-3xl font-bold text-purple-500 capitalize">{currentTenant.plan}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-gray-600 text-sm">Total de Produtos</p>
              <p className="text-3xl font-bold text-blue-500">{products.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="text-gray-600 text-sm">Status</p>
              <p className="text-3xl font-bold text-green-500">Ativo</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">WhatsApp</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={whatsappEdit} 
                onChange={(e) => setWhatsappEdit(e.target.value.replace(/[^0-9]/g, ''))} 
                placeholder="5585999999999" 
                className="flex-1 px-4 py-2 border-2 border-gray-300 focus:border-purple-500 rounded-lg outline-none transition" 
              />
              <button
                onClick={async () => {
                  await updateTenant(currentTenant.id, { whatsapp: whatsappEdit });
                  setCurrentTenant({...currentTenant, whatsapp: whatsappEdit});
                  alert('✅ WhatsApp atualizado!');
                }}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg transition"
              >
                Salvar
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Gerenciar Produtos</h3>
            <div className="space-y-3">
              {products.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{p.image}</span>
                    <div>
                      <p className="font-bold text-gray-800">{
                        p.name}</p>
<p className="text-sm text-gray-600">R$ {parseFloat(p.price).toFixed(2)}</p>
</div>
</div>
<button
onClick={async () => {
const newAvail = !p.available;
await updateProduct(p.id, { available: newAvail });
setProducts(products.map(pr => pr.id === p.id ? {...pr, available: newAvail} : pr));
}}
className={px-4 py-2 rounded-lg font-semibold transition ${p.available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}}
>
{p.available ? '✓ Disponível' : '✗ Indisponível'}
</button>
</div>
))}
</div>
</div>
</div>
</div>
);
};
if (view === 'home') return <HomePage />;
if (view === 'select') return <SelectPage />;
if (view === 'register') return <RegisterPage />;
if (view === 'menu') return <MenuPage />;
if (view === 'cart') return <CartPage />;
if (view === 'admin-login') return <AdminLoginPage />;
if (view === 'admin') return <AdminPage />;
return null;
};
export default PedidoRapido;