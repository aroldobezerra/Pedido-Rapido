
import React, { useState, useEffect } from 'react';
import { Product, Category, Extra } from '../types';
import { generateProductImage, editProductImage, getSmartResponse } from '../services/geminiService';

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
    image: 'https://picsum.photos/800/450?food',
    extras: [],
    isAvailable: true,
    trackInventory: true
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [imageSettings, setImageSettings] = useState({ aspectRatio: '16:9', size: '1K' });

  const handleAiAction = async (type: 'generate' | 'edit') => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    try {
      let newImage = '';
      if (type === 'generate') {
        newImage = await generateProductImage(aiPrompt, imageSettings.aspectRatio, imageSettings.size);
      } else {
        newImage = await editProductImage(formData.image, aiPrompt);
      }
      setFormData(prev => ({ ...prev, image: newImage }));
      setAiPrompt('');
    } catch (error) {
      console.error(error);
      alert("AI failed to process. Ensure API_KEY is valid.");
    } finally {
      setIsGenerating(false);
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
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-50 flex items-center bg-background-light dark:bg-background-dark px-4 py-4 border-b border-[#e8dbce] dark:border-[#3d2d1e] justify-between">
        <button onClick={onCancel} className="text-primary font-medium text-base">Cancel</button>
        <h2 className="text-[#1c140d] dark:text-[#fcfaf8] text-lg font-bold">{product ? 'Edit Product' : 'Add Product'}</h2>
        <button onClick={() => onSave(formData)} className="text-primary font-bold text-base">Done</button>
      </header>

      <div className="flex flex-col flex-1 px-4 py-6 gap-6 max-w-[480px] mx-auto w-full">
        {/* Image Section */}
        <div className="flex flex-col gap-4">
          <div 
            className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#e8dbce] dark:bg-[#3d2d1e] flex flex-col items-center justify-center border-2 border-dashed border-[#9c7349]/30" 
            style={{ backgroundImage: `url("${formData.image}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-2"></div>
                <p className="text-sm font-bold">Gemini is crafting your masterpiece...</p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 bg-white/90 dark:bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm transition-transform active:scale-95 cursor-pointer">
                  <span className="material-symbols-outlined text-primary text-xl">camera_enhance</span>
                  <span className="text-sm font-bold text-[#1c140d] dark:text-white">Change Photo</span>
                  <input type="file" className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10 space-y-4">
            <h4 className="text-sm font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">auto_awesome</span>
              AI Creative Assistant
            </h4>
            <div className="flex flex-col gap-3">
              <textarea 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: 'A delicious burger with retro lighting' or 'Add smoke effect'"
                className="w-full rounded-lg border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm p-3 focus:ring-primary focus:border-primary"
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <select 
                  className="rounded-lg text-xs bg-gray-50 dark:bg-white/10 border-none"
                  value={imageSettings.aspectRatio}
                  onChange={(e) => setImageSettings(s => ({ ...s, aspectRatio: e.target.value }))}
                >
                  <option value="1:1">1:1 Square</option>
                  <option value="16:9">16:9 Wide</option>
                  <option value="9:16">9:16 Portait</option>
                  <option value="4:3">4:3 Classic</option>
                </select>
                <select 
                  className="rounded-lg text-xs bg-gray-50 dark:bg-white/10 border-none"
                  value={imageSettings.size}
                  onChange={(e) => setImageSettings(s => ({ ...s, size: e.target.value }))}
                >
                  <option value="1K">1K Quality</option>
                  <option value="2K">2K Pro</option>
                  <option value="4K">4K Cinematic</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleAiAction('generate')}
                  disabled={isGenerating || !aiPrompt}
                  className="flex-1 bg-primary text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50"
                >
                  Generate New
                </button>
                <button 
                  onClick={() => handleAiAction('edit')}
                  disabled={isGenerating || !aiPrompt}
                  className="flex-1 border border-primary text-primary text-xs font-bold py-2 rounded-lg disabled:opacity-50"
                >
                  Edit Current
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-[#1c140d] dark:text-[#fcfaf8] text-sm font-bold px-1 uppercase tracking-wider">Product Info</p>
            <input 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="form-input flex w-full rounded-xl focus:ring-primary border border-[#e8dbce] dark:border-[#3d2d1e] bg-white dark:bg-[#2d2116] h-14 p-4" 
              placeholder="Product Name (e.g. Classic Bacon Burger)"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-[#1c140d] dark:text-[#fcfaf8] text-xs font-bold px-1">PRICE ($)</p>
              <input 
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="form-input flex w-full rounded-xl border border-[#e8dbce] dark:border-[#3d2d1e] bg-white dark:bg-[#2d2116] h-14 p-4" 
                placeholder="0.00" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[#1c140d] dark:text-[#fcfaf8] text-xs font-bold px-1">CATEGORY</p>
              <select 
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Category }))}
                className="form-select flex w-full rounded-xl border border-[#e8dbce] dark:border-[#3d2d1e] bg-white dark:bg-[#2d2116] h-14 p-4 appearance-none"
              >
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[#1c140d] dark:text-[#fcfaf8] text-xs font-bold px-1 uppercase tracking-wider">Description</p>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="form-input flex w-full min-w-0 resize-none rounded-xl border border-[#e8dbce] dark:border-[#3d2d1e] bg-white dark:bg-[#2d2116] min-h-[100px] p-4" 
              placeholder="Ingredients, allergies, or a tasty description..."
            ></textarea>
          </div>
        </div>

        {/* Extras */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[#1c140d] dark:text-[#fcfaf8] text-sm font-bold uppercase tracking-wider">Extras & Add-ons</p>
            <button onClick={addExtra} className="flex items-center gap-1 text-primary text-sm font-bold">
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Add New
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {formData.extras.map(extra => (
              <div key={extra.id} className="flex items-center gap-3 bg-white dark:bg-[#2d2116] p-3 rounded-xl border border-[#e8dbce] dark:border-[#3d2d1e] ios-shadow">
                <input 
                  className="flex-1 bg-transparent border-none focus:ring-0 text-base p-0" 
                  value={extra.name}
                  onChange={(e) => updateExtra(extra.id, { name: e.target.value })}
                  placeholder="e.g. Extra Cheese"
                />
                <div className="w-[1px] h-6 bg-[#e8dbce] dark:border-[#3d2d1e]"></div>
                <input 
                  type="number"
                  className="w-16 bg-transparent border-none focus:ring-0 text-right text-base p-0 font-bold text-primary" 
                  value={extra.price}
                  onChange={(e) => updateExtra(extra.id, { price: parseFloat(e.target.value) || 0 })}
                  placeholder="+0.00"
                />
                <button onClick={() => removeExtra(extra.id)} className="text-[#9c7349]">
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory */}
        <div className="flex items-center justify-between bg-white dark:bg-[#2d2116] p-4 rounded-xl border border-[#e8dbce] dark:border-[#3d2d1e] ios-shadow mt-2">
          <div className="flex flex-col">
            <p className="text-base font-bold">Track Inventory</p>
            <p className="text-xs text-[#9c7349]">Alert when stock is low</p>
          </div>
          <button 
            onClick={() => setFormData(prev => ({ ...prev, trackInventory: !prev.trackInventory }))}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${formData.trackInventory ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
          >
            <span className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.trackInventory ? 'translate-x-5' : 'translate-x-0'}`}></span>
          </button>
        </div>

        <div className="h-24"></div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 border-t border-[#e8dbce] dark:border-[#3d2d1e]">
        <div className="max-w-[480px] mx-auto w-full">
          <button 
            onClick={() => onSave(formData)}
            className="flex w-full items-center justify-center rounded-xl bg-primary h-14 px-4 text-white text-base font-bold transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
          >
            Save Product
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
