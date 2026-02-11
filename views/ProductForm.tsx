
import React, { useState, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!aiPrompt && !formData.name) { alert("Digite um nome ou descrição para a imagem."); return; }
    setIsGenerating(true);
    try {
      const img = await generateProductImage(aiPrompt || formData.name);
      setFormData(prev => ({ ...prev, image: img }));
    } catch (e) { alert("Erro ao gerar imagem IA."); }
    finally { setIsGenerating(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Limite de 2MB para evitar estouro de string no banco
        alert("A imagem é muito grande. Escolha uma foto de até 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
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
        {/* Preview Imagem e Upload/IA */}
        <div className="space-y-4">
          <div 
            className="w-full aspect-square rounded-[2.5rem] bg-gray-200 dark:bg-white/5 bg-cover bg-center border-4 border-white dark:border-white/10 shadow-2xl relative overflow-hidden group cursor-pointer"
            style={{ backgroundImage: `url('${formData.image}')` }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <span className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                 <span className="material-symbols-outlined">upload</span> Alterar Foto
               </span>
            </div>
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black uppercase tracking-widest">IA Criando Foto Gourmet...</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileUpload} 
               accept="image/*" 
               className="hidden" 
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="flex flex-col items-center justify-center gap-1 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 p-4 rounded-3xl active:scale-95 transition-all shadow-sm"
             >
                <span className="material-symbols-outlined text-gray-400">add_a_photo</span>
                <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Upload Galeria</span>
             </button>
             <button 
               onClick={() => setAiPrompt('')}
               className={`flex flex-col items-center justify-center gap-1 border p-4 rounded-3xl active:scale-95 transition-all shadow-sm ${aiPrompt === '' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-400'}`}
             >
                <span className="material-symbols-outlined">auto_awesome</span>
                <span className="text-[9px] font-black uppercase tracking-widest">Gerador de IA</span>
             </button>
          </div>

          <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-primary/20 space-y-4">
             <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">magic_button</span> Prompt para Foto IA
             </h4>
             <textarea 
               value={aiPrompt}
               onChange={(e) => setAiPrompt(e.target.value)}
               className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl p-4 text-sm font-medium"
               placeholder="Ex: Um hambúrguer com queijo cheddar escorrendo e fundo desfocado"
               rows={2}
             />
             <button 
               onClick={handleGenerateImage}
               disabled={isGenerating}
               className="w-full bg-primary text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
             >
               {isGenerating ? 'Processando...' : <><span className="material-symbols-outlined text-sm">brush</span> Gerar Foto Realista</>}
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
              className="w-full p-4 bg-white dark:bg-white/5 border-none rounded-2xl shadow-sm font-bold"
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
                className="w-full p-4 bg-white dark:bg-white/5 border-none rounded-2xl shadow-sm font-bold appearance-none"
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
                <span className="material-symbols-outlined text-sm">auto_awesome</span> {isGeneratingText ? 'Escrevendo...' : 'IA Sugerir'}
              </button>
            </div>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-4 bg-white dark:bg-white/5 border-none rounded-2xl shadow-sm min-h-[100px] text-sm leading-relaxed"
              placeholder="Descreva seu item de forma apetitosa..."
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
               <div key={ex.id} className="flex gap-2 items-center bg-white dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                 <input 
                   className="flex-1 bg-transparent border-none text-xs font-bold focus:ring-0" 
                   value={ex.name} 
                   onChange={(e) => setFormData(p => ({...p, extras: p.extras.map(i => i.id === ex.id ? {...i, name: e.target.value} : i)}))}
                   placeholder="Nome (ex: Bacon)" 
                 />
                 <div className="flex items-center bg-gray-50 dark:bg-black/20 rounded-xl px-2">
                    <span className="text-[10px] font-black text-gray-400 mr-1">R$</span>
                    <input 
                      type="number" 
                      className="w-16 bg-transparent border-none text-xs font-black text-primary text-right focus:ring-0" 
                      value={ex.price}
                      onChange={(e) => setFormData(p => ({...p, extras: p.extras.map(i => i.id === ex.id ? {...i, price: parseFloat(e.target.value) || 0} : i)}))}
                    />
                 </div>
                 <button onClick={() => setFormData(p => ({...p, extras: p.extras.filter(i => i.id !== ex.id)}))} className="text-red-500 p-2">
                    <span className="material-symbols-outlined text-sm">delete</span>
                 </button>
               </div>
             ))}
           </div>
        </div>

        {/* Disponibilidade */}
        <div className="flex items-center justify-between bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/5">
           <div>
              <p className="font-black">Item Disponível</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Exibir este item no cardápio online</p>
           </div>
           <button 
             onClick={() => setFormData(p => ({...p, isAvailable: !p.isAvailable}))}
             className={`w-14 h-8 rounded-full transition-colors relative shadow-inner ${formData.isAvailable ? 'bg-primary' : 'bg-gray-200 dark:bg-white/10'}`}
           >
             <div className={`size-6 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${formData.isAvailable ? 'translate-x-7' : 'translate-x-1'}`}></div>
           </button>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 z-50">
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="max-w-md mx-auto w-full bg-primary text-white font-black py-5 rounded-2xl shadow-2xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <span className="material-symbols-outlined">save</span>
          {isSaving ? 'SALVANDO...' : 'ATUALIZAR CARDÁPIO'}
        </button>
      </footer>
    </div>
  );
};

export default ProductForm;
