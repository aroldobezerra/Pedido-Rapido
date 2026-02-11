
import React, { useState } from 'react';
import { Product, Extra } from '../types';
import { generateProductImage, getSmartProductDescription } from '../services/geminiService';

interface ProductFormProps {
  categories: string[];
  product: Product | null;
  onSave: (p: Product) => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ categories, product, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Product>(product || {
    id: 'new',
    name: '',
    price: 0,
    category: categories[0] || '',
    description: '',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    extras: [],
    isAvailable: true,
    trackInventory: false
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const handleSave = async () => {
    if (!formData.name) { alert("Dê um nome ao produto."); return; }
    if (!formData.category) { alert("Escolha uma categoria."); return; }
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt && !formData.name) { alert("Digite um nome para a imagem."); return; }
    setIsGenerating(true);
    try {
      const img = await generateProductImage(aiPrompt || formData.name);
      setFormData(prev => ({ ...prev, image: img }));
    } catch (e) { alert("Erro ao gerar imagem IA."); }
    finally { setIsGenerating(false); }
  };

  const addExtra = () => {
    setFormData(prev => ({ ...prev, extras: [...prev.extras, { id: Date.now().toString(), name: '', price: 0 }] }));
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-40">
      <header className="sticky top-0 z-50 bg-white dark:bg-background-dark px-4 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
        <button onClick={onCancel} className="flex items-center gap-2 text-[#9c7349] font-bold">
          <span className="material-symbols-outlined">arrow_back</span>
          Voltar
        </button>
        <h2 className="text-lg font-black">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="text-primary font-black uppercase tracking-widest text-sm disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </header>

      <main className="max-w-md mx-auto w-full p-6 space-y-8">
        {/* Preview Imagem */}
        <div className="space-y-4">
          <div 
            className="w-full aspect-square rounded-[2.5rem] bg-gray-200 dark:bg-white/5 bg-cover bg-center border-4 border-white dark:border-white/10 shadow-2xl relative overflow-hidden"
            style={{ backgroundImage: `url('${formData.image}')` }}
          >
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black uppercase tracking-widest">IA Criando Foto Gourmet...</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-primary/20 space-y-4">
             <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">auto_awesome</span> Criar Foto com IA
             </h4>
             <textarea 
               value={aiPrompt}
               onChange={(e) => setAiPrompt(e.target.value)}
               className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl p-4 text-sm"
               placeholder="Ex: Hambúrguer suculento com queijo derretido e luz de estúdio"
               rows={2}
             />
             <button 
               onClick={handleGenerateImage}
               disabled={isGenerating}
               className="w-full bg-primary/10 text-primary font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest disabled:opacity-50"
             >
               Gerar Imagem Realista
             </button>
          </div>
        </div>

        {/* Campos Principais */}
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-400 px-1">Nome do Produto</label>
            <input 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-4 bg-white dark:bg-white/5 border-none rounded-2xl shadow-sm"
              placeholder="Ex: Smash Burger"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 px-1">Preço (R$)</label>
              <input 
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="w-full p-4 bg-white dark:bg-white/5 border-none rounded-2xl shadow-sm font-bold text-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 px-1">Categoria</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-4 bg-white dark:bg-white/5 border-none rounded-2xl shadow-sm font-bold"
              >
                {categories.length === 0 ? <option value="">Sem Categorias</option> : categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Descrição</label>
              <button 
                onClick={async () => {
                  if(!formData.name) return;
                  setIsGeneratingText(true);
                  try {
                    const desc = await getSmartProductDescription(formData.name);
                    setFormData(prev => ({ ...prev, description: desc }));
                  } finally { setIsGeneratingText(false); }
                }}
                className="text-[10px] font-black text-primary uppercase flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">magic_button</span> {isGeneratingText ? 'Escrevendo...' : 'IA Escrever'}
              </button>
            </div>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-4 bg-white dark:bg-white/5 border-none rounded-2xl shadow-sm min-h-[100px]"
              placeholder="Descreva seu item..."
            />
          </div>
        </div>

        {/* Adicionais */}
        <div className="space-y-4">
           <div className="flex justify-between items-center px-1">
              <h4 className="text-[10px] font-black uppercase text-gray-400">Complementos / Adicionais</h4>
              <button onClick={addExtra} className="text-primary text-[10px] font-black uppercase flex items-center gap-1">
                 <span className="material-symbols-outlined text-sm">add_circle</span> Adicionar
              </button>
           </div>
           <div className="space-y-2">
             {formData.extras.map(ex => (
               <div key={ex.id} className="flex gap-2 items-center bg-white dark:bg-white/5 p-3 rounded-2xl">
                 <input 
                   className="flex-1 bg-transparent border-none text-xs font-bold" 
                   value={ex.name} 
                   onChange={(e) => setFormData(p => ({...p, extras: p.extras.map(i => i.id === ex.id ? {...i, name: e.target.value} : i)}))}
                   placeholder="Nome (ex: Bacon)" 
                 />
                 <input 
                   type="number" 
                   className="w-16 bg-transparent border-none text-xs font-black text-primary text-right" 
                   value={ex.price}
                   onChange={(e) => setFormData(p => ({...p, extras: p.extras.map(i => i.id === ex.id ? {...i, price: parseFloat(e.target.value) || 0} : i)}))}
                 />
                 <button onClick={() => setFormData(p => ({...p, extras: p.extras.filter(i => i.id !== ex.id)}))} className="text-red-500">
                    <span className="material-symbols-outlined text-sm">delete</span>
                 </button>
               </div>
             ))}
           </div>
        </div>

        {/* Disponibilidade */}
        <div className="flex items-center justify-between bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/5">
           <div>
              <p className="font-black">Disponível</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Aparece no cardápio online</p>
           </div>
           <button 
             onClick={() => setFormData(p => ({...p, isAvailable: !p.isAvailable}))}
             className={`w-12 h-7 rounded-full transition-colors relative ${formData.isAvailable ? 'bg-primary' : 'bg-gray-300'}`}
           >
             <div className={`size-5 bg-white rounded-full absolute top-1 transition-transform ${formData.isAvailable ? 'right-1' : 'left-1'}`}></div>
           </button>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 z-50">
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="max-w-md mx-auto w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <span className="material-symbols-outlined">save</span>
          {isSaving ? 'SALVANDO ALTERAÇÕES...' : 'SALVAR NO CARDÁPIO'}
        </button>
      </footer>
    </div>
  );
};

export default ProductForm;
