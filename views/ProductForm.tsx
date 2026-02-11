
import React, { useState } from 'react';
import { Product, Category, Extra } from '../types';
import { generateProductImage, getSmartProductDescription } from '../services/geminiService';

interface ProductFormProps {
  product: Product | null;
  onSave: (p: Product) => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Product>(product || {
    id: Date.now().toString(),
    name: '',
    price: 0,
    category: Category.BURGERS,
    description: '',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    extras: [],
    isAvailable: true,
    trackInventory: true
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [imageSettings, setImageSettings] = useState({ aspectRatio: '1:1' as const });

  const handleGenerateImage = async () => {
    if (!aiPrompt && !formData.name) {
      alert("Digite um nome ou prompt para a imagem.");
      return;
    }
    setIsGenerating(true);
    try {
      const prompt = aiPrompt || formData.name;
      const newImage = await generateProductImage(prompt, imageSettings.aspectRatio);
      setFormData(prev => ({ ...prev, image: newImage }));
    } catch (error) {
      alert("Falha ao gerar imagem. Verifique a API_KEY.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.name) {
      alert("Dê um nome ao produto primeiro.");
      return;
    }
    setIsGeneratingText(true);
    try {
      const desc = await getSmartProductDescription(formData.name);
      setFormData(prev => ({ ...prev, description: desc }));
    } catch (error) {
      alert("Erro ao gerar descrição.");
    } finally {
      setIsGeneratingText(false);
    }
  };

  const addExtra = () => {
    const newExtra: Extra = { id: Date.now().toString(), name: '', price: 0 };
    setFormData(prev => ({ ...prev, extras: [...prev.extras, newExtra] }));
  };

  const updateExtra = (id: string, updates: Partial<Extra>) => {
    setFormData(prev => ({
      ...prev,
      extras: prev.extras.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  };

  const removeExtra = (id: string) => {
    setFormData(prev => ({ ...prev, extras: prev.extras.filter(e => e.id !== id) }));
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark pb-32">
      <header className="sticky top-0 z-50 flex items-center bg-background-light dark:bg-background-dark px-4 py-4 border-b border-[#e8dbce] dark:border-[#3d2d1e] justify-between">
        <button onClick={onCancel} className="text-primary font-bold">Cancelar</button>
        <h2 className="text-lg font-bold">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
        <button onClick={() => onSave(formData)} className="text-primary font-bold">Salvar</button>
      </header>

      <div className="flex flex-col flex-1 px-4 py-6 gap-8 max-w-[480px] mx-auto w-full">
        {/* Foto Section */}
        <div className="space-y-4">
          <div 
            className="relative w-full aspect-square rounded-[2rem] overflow-hidden bg-[#e8dbce] dark:bg-[#3d2d1e] border-4 border-white dark:border-white/5 shadow-2xl" 
            style={{ backgroundImage: `url("${formData.image}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                <p className="text-xs font-black uppercase tracking-widest">IA gerando foto premium...</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-primary/10 space-y-4 shadow-sm">
            <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              Criação com Inteligência Artificial
            </h4>
            <div className="flex flex-col gap-3">
              <textarea 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: 'Um burger suculento com bacon crocante e luz de pôr do sol'"
                className="w-full rounded-2xl border-none bg-gray-50 dark:bg-black/20 text-sm p-4 focus:ring-2 focus:ring-primary/20"
                rows={2}
              />
              <div className="flex gap-2">
                <select 
                  className="flex-1 rounded-xl text-xs bg-gray-50 dark:bg-black/20 border-none font-bold"
                  value={imageSettings.aspectRatio}
                  onChange={(e) => setImageSettings({ aspectRatio: e.target.value as any })}
                >
                  <option value="1:1">Quadrado (1:1)</option>
                  <option value="16:9">Widescreen (16:9)</option>
                  <option value="9:16">Stories (9:16)</option>
                </select>
                <button 
                  onClick={handleGenerateImage}
                  disabled={isGenerating}
                  className="flex-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  Gerar Foto IA
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Detalhes Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Nome do Item</label>
            <input 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-2xl border-none bg-white dark:bg-white/5 h-14 p-4 shadow-sm" 
              placeholder="Ex: Smash Salad Bacon"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Preço (R$)</label>
              <input 
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-2xl border-none bg-white dark:bg-white/5 h-14 p-4 shadow-sm font-bold text-primary" 
                placeholder="0.00" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Categoria</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Category }))}
                className="w-full rounded-2xl border-none bg-white dark:bg-white/5 h-14 p-4 shadow-sm font-bold"
              >
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
               <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Descrição</label>
               <button 
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingText}
                  className="text-[10px] font-black text-primary uppercase flex items-center gap-1 hover:opacity-70"
                >
                  <span className="material-symbols-outlined text-sm">magic_button</span>
                  {isGeneratingText ? 'Escrevendo...' : 'Gerar com IA'}
               </button>
            </div>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-2xl border-none bg-white dark:bg-white/5 min-h-[120px] p-4 shadow-sm resize-none text-sm leading-relaxed" 
              placeholder="Descreva os ingredientes e diferenciais..."
            ></textarea>
          </div>
        </div>

        {/* Adicionais Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Adicionais</p>
            <button onClick={addExtra} className="flex items-center gap-1 text-primary text-xs font-black uppercase">
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Novo Extra
            </button>
          </div>
          <div className="space-y-3">
            {formData.extras.map(extra => (
              <div key={extra.id} className="flex items-center gap-3 bg-white dark:bg-white/5 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                <input 
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold p-0" 
                  value={extra.name}
                  onChange={(e) => updateExtra(extra.id, { name: e.target.value })}
                  placeholder="Ex: Bacon Extra"
                />
                <input 
                  type="number"
                  className="w-16 bg-transparent border-none focus:ring-0 text-right text-sm font-black text-primary p-0" 
                  value={extra.price}
                  onChange={(e) => updateExtra(extra.id, { price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
                <button onClick={() => removeExtra(extra.id)} className="text-red-400 hover:text-red-600 transition-colors">
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Disponibilidade */}
        <div className="flex items-center justify-between bg-white dark:bg-white/5 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5">
          <div>
            <p className="text-sm font-black">Disponível no Cardápio</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Ocultar item temporariamente</p>
          </div>
          <button 
            onClick={() => setFormData(prev => ({ ...prev, isAvailable: !prev.isAvailable }))}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${formData.isAvailable ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
          >
            <span className={`pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${formData.isAvailable ? 'translate-x-5' : 'translate-x-0'}`}></span>
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl p-6 border-t border-[#e8dbce] dark:border-[#3d2d1e] z-50">
        <div className="max-w-[480px] mx-auto w-full">
          <button 
            onClick={() => onSave(formData)}
            className="flex w-full items-center justify-center rounded-2xl bg-primary h-16 px-4 text-white text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-2xl shadow-primary/30"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
