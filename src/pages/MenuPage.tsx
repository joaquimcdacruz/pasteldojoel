import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Loader2, ListOrdered, Sparkles, X, PlusCircle, UtensilsCrossed, Eye, EyeOff, Beef, ToggleLeft, ToggleRight, Link as LinkIcon, PackagePlus, CheckCircle2, RotateCcw, AlertTriangle, ExternalLink } from 'lucide-react';
import { MenuItem, CategoryItem, Addon, Filling, MenuItemFilling } from '@/types';
import { StorageService } from '@/services/storageService';
import { subscribeToCollection, getFirebaseHealth, FirebaseHealthState } from '@/integrations/firebase/config';
import { generateCreativeDescription } from '@/services/geminiService';
import ConfirmationModal from '@/components/modals/ConfirmationModal';


const MenuPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('pastelaria_categories');
      if (stored) {
        const p = JSON.parse(stored);
        if (Array.isArray(p) && p.length > 0) return p;
      }
    } catch {}
    return [];
  });
  const [items, setItems] = useState<MenuItem[]>(() => {
    try {
      const stored = localStorage.getItem('pastelaria_menu');
      if (stored) {
        const p = JSON.parse(stored);
        if (Array.isArray(p) && p.length > 0) return p;
      }
    } catch {}
    return [];
  });
  const [addons, setAddons] = useState<Addon[]>(() => {
    try {
      const stored = localStorage.getItem('pastelaria_addons');
      if (stored) {
        const p = JSON.parse(stored);
        if (Array.isArray(p) && p.length > 0) return p;
      }
    } catch {}
    return [];
  });
  const [fillings, setFillings] = useState<Filling[]>(() => {
    try {
      const stored = localStorage.getItem('pastelaria_fillings');
      if (stored) {
        const p = JSON.parse(stored);
        if (Array.isArray(p) && p.length > 0) return p;
      }
    } catch {}
    return [];
  });
  const [menuFillings, setMenuFillings] = useState<MenuItemFilling[]>(() => {
    try {
      const stored = localStorage.getItem('pastelaria_menu_item_fillings');
      if (stored) {
        const p = JSON.parse(stored);
        if (Array.isArray(p) && p.length > 0) return p;
      }
    } catch {}
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [firebaseHealth, setFirebaseHealthState] = useState<FirebaseHealthState>(getFirebaseHealth());

  useEffect(() => {
    const handleHealthChange = (e: any) => {
      setFirebaseHealthState(e.detail || getFirebaseHealth());
    };
    window.addEventListener('firebase-health-changed', handleHealthChange);
    return () => window.removeEventListener('firebase-health-changed', handleHealthChange);
  }, []);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [isFillingModalOpen, setIsFillingModalOpen] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  
  // Confirmation Modals
  const [promptDelete, setPromptDelete] = useState<{ type: 'item' | 'category' | 'addon' | 'filling', id: string, name: string } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  
  // Item Form
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemOrder, setItemOrder] = useState('0');
  const [itemStockQuantity, setItemStockQuantity] = useState<string>('');
  const [selectedFillingIds, setSelectedFillingIds] = useState<string[]>([]);
  
  // Category Form
  const [categoryName, setCategoryName] = useState('');

  // Addon Form
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [addonName, setAddonName] = useState('');
  const [addonPrice, setAddonPrice] = useState('');
  const [addonOrder, setAddonOrder] = useState('0');

  // Filling Form
  const [fillingName, setFillingName] = useState('');
  const [fillingStockQuantity, setFillingStockQuantity] = useState('');
  const [fillingSaveStatus, setFillingSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  // Inline stock editing for existing fillings
  const [editingFillingStockId, setEditingFillingStockId] = useState<string | null>(null);
  const [editingFillingStockValue, setEditingFillingStockValue] = useState<string>('');


  useEffect(() => { 
    loadData(true); 

    const handleMenuChanged = () => loadData(true);
    window.addEventListener('menu-changed', handleMenuChanged);

    // Real-time Firebase Firestore subscriptions
    const unsubMenu = subscribeToCollection('menu_items', () => loadData(true));
    const unsubFillings = subscribeToCollection('fillings', () => loadData(true));
    const unsubCats = subscribeToCollection('categories', () => loadData(true));
    const unsubAddons = subscribeToCollection('addons', () => loadData(true));
    const unsubMf = subscribeToCollection('menu_item_fillings', () => loadData(true));

    return () => {
      window.removeEventListener('menu-changed', handleMenuChanged);
      unsubMenu();
      unsubFillings();
      unsubCats();
      unsubAddons();
      unsubMf();
    };
  }, []);



  const loadData = async (silent = true) => {
    if (!silent && items.length === 0) {
      setIsLoading(true);
    }
    try {
      const [cats, products, extras, fills, mf] = await Promise.all([
        StorageService.getCategories(),
        StorageService.getProducts(),
        StorageService.getAddons(),
        StorageService.getFillings(),
        StorageService.getMenuFillings()
      ]);
      setCategories(cats);
      setItems(products);
      setAddons(extras);
      setFillings(fills);
      setMenuFillings(mf);
    } catch (err) {
      console.error("Erro ao carregar cardápio:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute auto-disabled product IDs
  const autoDisabledIds = StorageService.getAutoDisabledProductIds(fillings, menuFillings, items);

  const handleSaveItem = async () => {
    if (!itemName || !itemPrice || !itemCategory) return;

    const newItem: MenuItem = {
      id: editingItem?.id || StorageService.generateId(),
      name: itemName,
      price: parseFloat(itemPrice),
      category: itemCategory,
      description: itemDescription,
      order: parseInt(itemOrder) || 0,
      inStock: editingItem?.inStock !== false,
      stockQuantity: itemStockQuantity === '' ? undefined : parseInt(itemStockQuantity)
    };
    await StorageService.saveProduct(newItem);
    // Save filling links
    await StorageService.saveMenuFillings(newItem.id, selectedFillingIds);
    setIsModalOpen(false);
    loadData();
  };

  const handleSaveCategory = async () => {
    if (!categoryName) return;
    const newCat: CategoryItem = {
      id: StorageService.generateId(),
      name: categoryName,
      order: categories.length
    };
    await StorageService.saveCategory(newCat);
    setIsCategoryModalOpen(false);
    setCategoryName('');
    loadData();
  };

  const handleSaveAddon = async () => {
    if (!addonName || !addonPrice) return;
    const newAddon: Addon = {
      id: editingAddon?.id || StorageService.generateId(),
      name: addonName,
      price: parseFloat(addonPrice),
      order: parseInt(addonOrder) || 0
    };
    await StorageService.saveAddon(newAddon);
    setAddonName('');
    setAddonPrice('');
    setAddonOrder('0');
    setEditingAddon(null);
    loadData();
  };

  const handleSaveFilling = async () => {
    if (!fillingName.trim()) return;
    setFillingSaveStatus('saving');
    try {
      const newFilling: Filling = {
        id: StorageService.generateId(),
        name: fillingName.trim(),
        inStock: true,
        stockQuantity: fillingStockQuantity ? parseInt(fillingStockQuantity) : undefined
      };
      await StorageService.saveFilling(newFilling);
      setFillingName('');
      setFillingStockQuantity('');
      setFillingSaveStatus('success');
      setTimeout(() => setFillingSaveStatus('idle'), 2000);
      loadData();
    } catch (e) {
      console.error('Erro ao salvar recheio:', e);
      setFillingSaveStatus('error');
      setTimeout(() => setFillingSaveStatus('idle'), 3000);
    }
  };

  const handleUpdateFillingStock = async (filling: Filling, newQty: string) => {
    const qty = newQty === '' ? undefined : parseInt(newQty);
    // Preserve existing inStock flag — only the toggle button should change availability
    await StorageService.saveFilling({ ...filling, stockQuantity: qty });
    setEditingFillingStockId(null);
    setEditingFillingStockValue('');
    loadData();

  };


  const handleToggleFillingStock = async (filling: Filling) => {
    const newState = !filling.inStock;
    // Optimistic update
    setFillings(prev => prev.map(f => f.id === filling.id ? { ...f, inStock: newState } : f));
    await StorageService.saveFilling({ ...filling, inStock: newState });
    loadData();
  };


  const handleToggleProductStock = async (product: MenuItem) => {
    const newState = product.inStock === false;
    // Optimistic update
    setItems(prev => prev.map(item => item.id === product.id ? { ...item, inStock: newState } : item));
    await StorageService.toggleProductStock(product.id, newState);
    loadData();
  };


  const executeDelete = async () => {
    if (!promptDelete) return;
    
    if (promptDelete.type === 'item') {
      await StorageService.deleteProduct(promptDelete.id);
    } else if (promptDelete.type === 'category') {
      await StorageService.deleteCategory(promptDelete.id);
    } else if (promptDelete.type === 'addon') {
      await StorageService.deleteAddon(promptDelete.id);
    } else if (promptDelete.type === 'filling') {
      await StorageService.deleteFilling(promptDelete.id);
    }
    
    setPromptDelete(null);
    loadData();
  };

  const [isResetting, setIsResetting] = useState(false);

  const handleResetMenu = async () => {
    setIsResetting(true);
    try {
      await StorageService.resetToDefaultMenu();
      await loadData();
      setIsResetConfirmOpen(false);
    } catch (e) {
      console.error("Erro ao resetar cardápio:", e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleGenerateAIDescription = async () => {
    if (!itemName) return;
    setIsGeneratingDescription(true);
    try {
      const catName = categories.find(c => c.id === itemCategory || c.name === itemCategory)?.name || '';
      const aiDesc = await generateCreativeDescription(itemName, catName);
      if (aiDesc) setItemDescription(aiDesc);
    } catch (error) {
      console.error("AI Generation failed", error);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const openItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemPrice(item.price.toString());
      setItemCategory(item.category);
      setItemDescription(item.description || '');
      setItemOrder((item.order || 0).toString());
      setItemStockQuantity(item.stockQuantity !== undefined && item.stockQuantity !== null ? item.stockQuantity.toString() : '');
      // Load filling links for this product
      setSelectedFillingIds(menuFillings.filter(mf => mf.menuItemId === item.id).map(mf => mf.fillingId));
    } else {
      setEditingItem(null);
      setItemName('');
      setItemPrice('');
      setItemCategory(categories[0]?.id || categories[0]?.name || '');
      setItemDescription('');
      setItemOrder('0');
      setItemStockQuantity('');
      setSelectedFillingIds([]);
    }
    setIsModalOpen(true);
  };

  const toggleFillingLink = (fillingId: string) => {
    setSelectedFillingIds(prev => 
      prev.includes(fillingId) ? prev.filter(id => id !== fillingId) : [...prev, fillingId]
    );
  };



  if (isLoading && items.length === 0) return <div className="p-10 flex justify-center text-brand-500 h-full items-center"><Loader2 className="animate-spin w-10 h-10" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-300 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-600/10 border border-brand-600/20 mb-2">
            <Sparkles size={12} className="text-brand-500" />
            <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Gestão de Cardápio</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-black font-display tracking-tight text-slate-900 uppercase italic">Cardápio do Joel</h2>
          <p className="text-base text-slate-600 font-medium max-w-xl font-display italic">Curadoria exclusiva dos melhores pastéis e acompanhamentos da região.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto flex-wrap">
          <button 
            onClick={() => setIsResetConfirmOpen(true)} 
            title="Recarregar cardápio oficial completo"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-black/[0.02] backdrop-blur-xl border border-black/[0.05] px-4 py-4 rounded-2xl font-black text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 hover:border-amber-500/20 transition-all duration-300 shadow-sm text-[10px] uppercase tracking-widest"
          >
            <RotateCcw size={16}/> Restaurar Cardápio
          </button>
          <button 
            onClick={() => setIsCategoryModalOpen(true)} 
            className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-black/[0.02] backdrop-blur-xl border border-black/[0.05] px-5 py-4 rounded-2xl font-black text-slate-600 hover:text-slate-900 hover:bg-black/[0.05] hover:border-black/[0.1] transition-all duration-300 shadow-sm text-[10px] uppercase tracking-widest"
          >
            <ListOrdered size={16}/> Categorias
          </button>
          <button 
            onClick={() => setIsAddonModalOpen(true)} 
            className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-black/[0.02] backdrop-blur-xl border border-black/[0.05] px-5 py-4 rounded-2xl font-black text-slate-600 hover:text-slate-900 hover:bg-black/[0.05] hover:border-black/[0.1] transition-all duration-300 shadow-sm text-[10px] uppercase tracking-widest"
          >
            <PlusCircle size={16}/> Extras
          </button>
          <button 
            onClick={() => setIsFillingModalOpen(true)} 
            className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-black/[0.02] backdrop-blur-xl border border-black/[0.05] px-5 py-4 rounded-2xl font-black text-slate-600 hover:text-slate-900 hover:bg-black/[0.05] hover:border-black/[0.1] transition-all duration-300 shadow-sm text-[10px] uppercase tracking-widest"
          >
            <Beef size={16}/> Recheios
          </button>
          <button 
            onClick={() => openItemModal()} 
            className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-brand-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-brand-500 hover:shadow-glow-orange transition-all duration-500 shadow-xl shadow-brand-900/10 text-[11px] uppercase tracking-widest transform hover:-translate-y-1"
          >
            <Plus size={18}/> Novo Item
          </button>
        </div>
      </div>

      {/* Banner se Firestore precisa ser ativado para sincronizar entre navegadores */}
      {firebaseHealth.status === 'api_disabled' && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                Sincronização entre navegadores pausada (Cloud Firestore pendente)
              </h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Cada navegador está mostrando dados diferentes porque o banco Cloud Firestore ainda precisa ser criado/ativado no console do Firebase do projeto <strong>{firebaseHealth.projectId || 'pasteldojoel-e3992'}</strong>.
              </p>
            </div>
          </div>
          <a
            href={firebaseHealth.activationUrl || `https://console.firebase.google.com/project/${firebaseHealth.projectId || 'pasteldojoel-e3992'}/firestore`}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap px-6 py-3.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center gap-2"
          >
            <ExternalLink size={16} />
            Ativar Firestore no Console (1 min)
          </a>
        </div>
      )}

      {/* Banner if items are incomplete */}
      {items.length < 50 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm">
              <Sparkles size={22} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                Cardápio com {items.length} {items.length === 1 ? 'item cadastrado' : 'itens cadastrados'}
              </h4>
              <p className="text-xs text-slate-600 font-medium">
                O cardápio oficial completo da Pastelaria do Joel possui 58 produtos, 7 categorias, 12 adicionais e opções de bebidas.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetMenu}
            disabled={isResetting}
            className="whitespace-nowrap px-6 py-3.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center gap-2"
          >
            {isResetting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            {isResetting ? 'Carregando 58 Itens...' : 'Carregar 58 Itens Oficiais'}
          </button>
        </div>
      )}

      <div className="space-y-8">
        {categories.sort((a,b) => (a.order || 0) - (b.order || 0)).map((cat) => {
          const catItems = items
            .filter(i => i.category === cat.id || i.category === cat.name || (i.category && cat.name && i.category.trim().toLowerCase() === cat.name.trim().toLowerCase()))
            .sort((a,b) => (a.order || 0) - (b.order || 0));

          return (
          <div key={cat.id} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="flex items-center justify-between border-b border-black/[0.03] pb-4">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-10 bg-brand-600 rounded-full shadow-glow-orange"></div>
                <h3 className="text-2xl font-black text-slate-900 font-display uppercase tracking-[0.1em] italic">
                  {cat.name}
                </h3>
                <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full border border-black/[0.05] uppercase tracking-widest">
                  {catItems.length} {catItems.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <button 
                onClick={() => setPromptDelete({ type: 'category', id: cat.id, name: cat.name })}
                className="text-slate-400 hover:text-red-500 p-2.5 transition-all duration-300 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20"
              >
                <Trash2 size={20}/>
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {catItems
                .map(item => {
                const isOutOfStock = item.inStock === false;
                const isAutoDisabled = autoDisabledIds.has(item.id);
                const isUnavailable = isOutOfStock || isAutoDisabled;

                // Find which fillings are linked and out of stock for this item
                const linkedFillingIds = menuFillings.filter(mf => mf.menuItemId === item.id).map(mf => mf.fillingId);
                const outOfStockFillingNames = fillings
                  .filter(f => linkedFillingIds.includes(f.id) && !f.inStock)
                  .map(f => f.name);

                return (
                <div key={item.id} className={`glass-card p-4 lg:p-5 rounded-[2rem] flex flex-col justify-between border transition-all duration-700 group relative overflow-hidden bg-white shadow-sm ${isUnavailable ? 'border-red-500/20 opacity-60' : 'border-black/[0.05] hover:border-brand-600/30 hover:shadow-brand-600/5'}`}>
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-600/5 blur-[50px] group-hover:bg-brand-600/10 transition-all duration-700 rounded-full" />
                  
                  {/* Stock Badge */}
                  {isOutOfStock && (
                    <div className="absolute top-5 left-5 z-30 flex items-center gap-1.5 bg-red-600/90 text-white px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg animate-pulse">
                      <EyeOff size={10} /> Sem Estoque
                    </div>
                  )}
                  {isAutoDisabled && !isOutOfStock && (
                    <div className="absolute top-5 left-5 z-30 flex items-center gap-1.5 bg-amber-600/90 text-white px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg" title={`Recheio(s) esgotado(s): ${outOfStockFillingNames.join(', ')}`}>
                      <Beef size={10} /> Recheio Esgotado
                    </div>
                  )}

                  <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-3 group-hover:translate-y-0 z-20">
                    <button 
                      onClick={() => handleToggleProductStock(item)} 
                      className={`p-3 backdrop-blur-md text-white rounded-2xl border border-black/5 transition-all duration-300 shadow-sm active:scale-90 ${item.inStock === false ? 'bg-red-600/50 hover:bg-green-600' : 'bg-black/5 hover:bg-red-600 hover:text-white text-slate-400'}`}
                      title={item.inStock === false ? 'Repor Estoque' : 'Marcar Sem Estoque'}
                    >
                      {item.inStock === false ? <Eye size={14}/> : <EyeOff size={14}/>}
                    </button>
                    <button onClick={() => openItemModal(item)} className="p-3 bg-black/5 backdrop-blur-md text-slate-400 rounded-2xl border border-black/5 hover:bg-brand-600 hover:text-white transition-all duration-300 shadow-sm active:scale-90"><Edit2 size={14}/></button>
                    <button 
                      onClick={() => setPromptDelete({ type: 'item', id: item.id, name: item.name })}
                      className="p-3 bg-black/5 backdrop-blur-md text-slate-400 rounded-2xl border border-black/5 hover:bg-red-600 hover:text-white transition-all duration-300 shadow-sm active:scale-90"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>

                  <div className="mb-8 relative z-10">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-black/[0.02] to-transparent border border-black/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-sm ${isUnavailable ? 'text-red-500/50' : 'text-brand-500'}`}>
                        <UtensilsCrossed size={22}/>
                      </div>
                      <h4 className={`font-black text-xl leading-snug tracking-tight mb-3 uppercase transition-colors duration-300 italic ${isUnavailable ? 'text-slate-500 line-through' : 'text-slate-900 group-hover:text-brand-500'}`}>{item.name}</h4>
                      <p className="text-[10px] text-slate-700 line-clamp-3 italic font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                        {item.description || 'Sabor tradicional e inesquecível preparado com os melhores ingredientes selecionados.'}
                      </p>
                      {item.stockQuantity !== undefined && item.stockQuantity !== null ? (
                         <div className={`mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${item.stockQuantity <= 0 ? 'text-red-500' : item.stockQuantity <= 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${item.stockQuantity <= 0 ? 'bg-red-500' : item.stockQuantity <= 5 ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                            {item.stockQuantity <= 0 ? 'Esgotado' : `${item.stockQuantity} disponível(is)`}
                         </div>
                      ) : (
                         <div className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-brand-500 opacity-80">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            ∞ DISPONÍVEL
                         </div>
                      )}
                      {/* Linked fillings tags */}
                      {linkedFillingIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {fillings.filter(f => linkedFillingIds.includes(f.id)).map(f => (
                            <span key={f.id} className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${f.inStock ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20' : 'bg-red-600/10 text-red-400 border-red-500/20'}`}>
                              {f.name}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>

                  <div className="mt-auto pt-6 border-t border-black/[0.03] flex justify-between items-end relative z-10">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] mb-1">Preço Sugerido</span>
                        <span className={`text-3xl font-black font-display tracking-tight italic ${isUnavailable ? 'text-slate-400' : 'text-brand-600'}`}>
                            {item.price.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                        </span>
                    </div>
                    <span className="bg-black/[0.02] text-slate-500 px-4 py-2 rounded-2xl text-[9px] font-black uppercase border border-black/5 tracking-widest shadow-inner group-hover:text-brand-500/50 transition-colors">#{item.order || 0}</span>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        );
        })}
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <div className="glass-card p-10 rounded-[3rem] w-full max-w-xl shadow-2xl space-y-8 relative border border-black/[0.1] animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto custom-scrollbar bg-white">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 p-2 hover:bg-black/5 rounded-full transition-all"><X size={20}/></button>
            <div className="flex items-center gap-4">
               <div className="p-3 bg-brand-600 text-white rounded-2xl shadow-glow-orange">
                  <UtensilsCrossed size={20} />
               </div>
               <h3 className="text-xl font-black font-display text-slate-900 uppercase italic tracking-tight">{editingItem ? 'Editar Produto' : 'Novo Produto'}</h3>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nome do Item</label>
                  <input 
                    autoFocus
                    value={itemName} 
                    onChange={e => setItemName(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSaveItem()}
                    className="w-full p-5 bg-black/[0.02] rounded-[1.5rem] border border-black/[0.05] outline-none text-slate-900 text-sm font-bold focus:ring-2 focus:ring-brand-500/50 transition-all placeholder:text-slate-300" 
                    placeholder="Ex: Pastel de Vento"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Preço (R$)</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 font-black text-xs italic">R$</span>
                     <input 
                        type="number" 
                        step="0.50" 
                        value={itemPrice} 
                        onChange={e => setItemPrice(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSaveItem()}
                        className="w-full p-5 pl-10 bg-black/[0.02] rounded-[1.5rem] border border-black/[0.05] outline-none font-black text-brand-500 text-sm focus:ring-2 focus:ring-brand-500/50 transition-all" 
                        placeholder="0,00"
                      />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Ordem</label>
                  <input type="number" value={itemOrder} onChange={e => setItemOrder(e.target.value)} className="w-full p-5 bg-black/[0.02] rounded-[1.5rem] border border-black/[0.05] outline-none font-black text-slate-400 text-sm focus:ring-2 focus:ring-brand-500/50 transition-all text-center"/>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Estoque</label>
                  {(() => {
                    const categoryName = categories.find(c => c.id === itemCategory || c.name === itemCategory)?.name;
                    const isBev = StorageService.isBeverage({ category: categoryName } as any);
                    const hasFlavors = selectedFillingIds.length > 0;
                    
                    if (isBev && hasFlavors) {
                      const linkedFillings = selectedFillingIds.map(fid => fillings.find(fl => fl.id === fid)).filter(Boolean);
                      const hasInfinite = linkedFillings.some(f => f!.stockQuantity === undefined || f!.stockQuantity === null);
                      const totalStock = linkedFillings.reduce((sum, f) => sum + (f!.stockQuantity || 0), 0);
                      
                      return (
                        <div className="w-full h-[62px] bg-amber-600/5 rounded-[1.5rem] border border-amber-600/10 text-amber-500 flex flex-col items-center justify-center gap-0.5 leading-none">
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Por Sabor</span>
                          <span className="text-sm font-black">{hasInfinite ? '∞' : `${totalStock} un`}</span>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="relative group">
                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black text-base transition-colors pointer-events-none select-none ${
                          itemStockQuantity === '' ? 'text-brand-500 opacity-70' : 'opacity-0'
                        }`}>∞</span>
                        <input 
                          type="number"
                          min="0"
                          value={itemStockQuantity} 
                          onChange={e => setItemStockQuantity(e.target.value)} 
                           onKeyDown={e => e.key === 'Enter' && handleSaveItem()}
                          className="w-full p-5 pl-10 bg-black/[0.02] rounded-[1.5rem] border border-black/[0.05] outline-none font-black text-brand-500 text-sm focus:ring-2 focus:ring-brand-500/50 transition-all text-center placeholder:text-transparent" 
                          placeholder=" "
                        />
                      </div>
                    );
                  })()}
                </div>

              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Categoria</label>
                <div className="relative">
                  <select value={itemCategory} onChange={e => setItemCategory(e.target.value)} className="w-full p-5 bg-black/[0.02] rounded-[1.5rem] border border-black/[0.05] outline-none text-slate-900 text-sm appearance-none font-bold focus:ring-2 focus:ring-brand-500/50 transition-all cursor-pointer">
                    {categories.map(c => <option key={c.id} value={c.id} className="bg-white text-slate-900">{c.name}</option>)}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ListOrdered size={16} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Descrição Gourmet</label>
                  <button onClick={handleGenerateAIDescription} disabled={isGeneratingDescription || !itemName} className="flex items-center gap-2 text-[9px] font-black text-brand-500 uppercase tracking-[0.2em] bg-brand-500/5 px-3 py-1.5 rounded-full border border-brand-500/10 hover:bg-brand-500/10 transition-all disabled:opacity-30">
                    {isGeneratingDescription ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Gerar com IA
                  </button>
                </div>
                <textarea value={itemDescription} onChange={e => setItemDescription(e.target.value)} rows={3} className="w-full p-5 bg-black/[0.02] rounded-[2rem] border border-black/[0.05] outline-none text-slate-900 text-xs resize-none placeholder:text-slate-300 italic leading-relaxed focus:ring-2 focus:ring-brand-500/50 transition-all" placeholder="Descreva os ingredientes e diferenciais deste item..."/>
              </div>

              {/* Filling Links Section */}
              {fillings.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                    <LinkIcon size={12} /> Vincular Recheios
                  </label>
                  <p className="text-[9px] text-slate-400 ml-2 italic">Selecione os recheios usados neste produto. Se algum recheio acabar, o produto será desabilitado automaticamente.</p>
                  <div className="flex flex-wrap gap-2">
                    {fillings.map(f => (
                      <button
                        key={f.id}
                        onClick={() => toggleFillingLink(f.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                          selectedFillingIds.includes(f.id)
                            ? 'bg-brand-600/10 text-brand-600 border-brand-600/20 shadow-sm'
                            : 'bg-black/[0.01] text-slate-400 border-black/5 hover:bg-black/[0.03] hover:text-slate-900'
                        }`}
                      >
                        <Beef size={12} />
                        {f.name}
                        {!f.inStock && <span className="text-red-400 ml-1">(esgotado)</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 py-5 bg-black/[0.02] border border-black/5 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-[1.5rem] transition-all"
              >
                Descartar
              </button>
              <button 
                onClick={handleSaveItem} 
                className="flex-1 py-5 bg-brand-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-900/10 hover:bg-brand-500 transition-all transform active:scale-[0.98]"
              >
                Confirmar Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Addon Modal */}
      {isAddonModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <div className="glass-card p-10 rounded-[3rem] w-full max-w-lg shadow-2xl relative max-h-[85vh] flex flex-col border border-black/[0.1] animate-in zoom-in-95 duration-500 bg-white">
            <button onClick={() => setIsAddonModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 p-2 hover:bg-black/5 rounded-full transition-all"><X size={20}/></button>
            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-900/10">
                  <PlusCircle size={20} />
               </div>
               <h3 className="text-xl font-black font-display text-slate-900 uppercase italic tracking-tight">Gestão de Extras</h3>
            </div>
            
            <div className="space-y-6 mb-10 shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-3 space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Descrição</label>
                       <input 
                         autoFocus
                         value={addonName} 
                         onChange={e => setAddonName(e.target.value)} 
                         onKeyDown={e => e.key === 'Enter' && handleSaveAddon()}
                         placeholder="Ex: Queijo Extra" 
                         className="w-full p-4 bg-black/[0.02] rounded-2xl border border-black/[0.05] text-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder:text-slate-300"
                       />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Preço (R$)</label>
                       <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 font-black text-xs italic">R$</span>
                          <input 
                            type="number" 
                            value={addonPrice} 
                            onChange={e => setAddonPrice(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSaveAddon()}
                            placeholder="0,00" 
                            className="w-full p-4 pl-10 bg-black/[0.02] rounded-2xl border border-black/[0.05] text-brand-500 text-sm font-black outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Ordem</label>
                       <input 
                         type="number" 
                         value={addonOrder} 
                         onChange={e => setAddonOrder(e.target.value)} 
                         onKeyDown={e => e.key === 'Enter' && handleSaveAddon()}
                         className="w-full p-4 bg-black/[0.02] rounded-2xl border border-black/[0.05] text-slate-500 text-sm font-black text-center outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                       />
                    </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveAddon} className="flex-1 py-5 bg-brand-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-900/10 hover:bg-brand-500 transition-all active:scale-[0.98]">
                      {editingAddon ? 'Salvar Alterações' : 'Vincular Novo Adicional'}
                  </button>
                  {editingAddon && (
                    <button 
                      onClick={() => {
                        setEditingAddon(null);
                        setAddonName('');
                        setAddonPrice('');
                        setAddonOrder('0');
                      }}
                      className="px-6 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide pr-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 block mb-4 sticky top-0 bg-[#f8fafc] py-2">Itens Ativos no Sistema</label>
                {addons.map(addon => (
                    <div key={addon.id} className="flex items-center justify-between p-5 bg-black/[0.01] border border-black/5 rounded-[1.5rem] group hover:border-brand-500/20 hover:bg-black/[0.02] transition-all">
                        <div className="flex flex-col">
                           <div className="flex items-center gap-2">
                             <span className="text-slate-900 text-sm font-black uppercase italic tracking-tight">{addon.name}</span>
                             <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md font-black">#{addon.order || 0}</span>
                           </div>
                           <span className="text-brand-500 text-xs font-black italic mt-0.5">{addon.price.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => {
                              setEditingAddon(addon);
                              setAddonName(addon.name);
                              setAddonPrice(addon.price.toString());
                              setAddonOrder((addon.order || 0).toString());
                            }}
                            className="text-slate-400 hover:text-brand-600 p-2.5 rounded-xl hover:bg-brand-600/10 transition-all"
                            title="Editar Extra"
                          >
                            <Edit2 size={18}/>
                          </button>
                          <button 
                            onClick={() => setPromptDelete({ type: 'addon', id: addon.id, name: addon.name })}
                            className="text-slate-400 hover:text-red-500 p-2.5 rounded-xl hover:bg-red-500/10 transition-all"
                            title="Excluir Extra"
                          >
                            <Trash2 size={18}/>
                          </button>
                        </div>
                    </div>
                ))}
                {addons.length === 0 && <p className="text-[10px] text-slate-400 text-center py-10 uppercase tracking-widest italic opacity-40">Nenhum adicional cadastrado.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Filling Modal */}
      {isFillingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <div className="glass-card p-10 rounded-[3rem] w-full max-w-lg shadow-2xl relative max-h-[85vh] flex flex-col border border-black/[0.1] animate-in zoom-in-95 duration-500 bg-white">
            <button onClick={() => setIsFillingModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 p-2 hover:bg-black/5 rounded-full transition-all"><X size={20}/></button>
            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-900/10">
                  <Beef size={20} />
               </div>
               <div>
                 <h3 className="text-xl font-black font-display text-slate-900 uppercase italic tracking-tight">Gestão de Recheios</h3>
                 <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Controle de estoque por recheio</p>
               </div>
            </div>
            
            <div className="space-y-6 mb-10 shrink-0">
                <div className="flex gap-4">
                    <div className="md:col-span-3 space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nome do Recheio</label>
                       <input 
                         autoFocus
                         value={fillingName} 
                         onChange={e => setFillingName(e.target.value)} 
                         onKeyDown={e => e.key === 'Enter' && handleSaveFilling()}
                         placeholder="Ex: Carne Moída" 
                         className="w-full p-4 bg-black/[0.02] rounded-2xl border border-black/[0.05] text-slate-900 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/50 transition-all placeholder:text-slate-300"
                       />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Estoque</label>
                        <div className="relative group">
                          <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black text-base transition-colors pointer-events-none select-none ${
                            fillingStockQuantity === '' ? 'text-brand-500 opacity-70' : 'opacity-0'
                          }`}>∞</span>
                          <input
                            type="number"
                            min="0"
                            value={fillingStockQuantity}
                            onChange={e => setFillingStockQuantity(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveFilling()}
                            placeholder=" "
                            className="w-full p-4 pl-10 bg-black/[0.02] rounded-2xl border border-black/[0.05] text-brand-500 text-sm font-black outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-center placeholder:text-transparent"
                          />
                        </div>
                     </div>
                </div>

                <button
                  onClick={handleSaveFilling}
                  disabled={fillingSaveStatus === 'saving'}
                  className={`w-full py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                    fillingSaveStatus === 'success'
                      ? 'bg-emerald-600 text-white shadow-emerald-900/30'
                      : fillingSaveStatus === 'error'
                      ? 'bg-red-600 text-white'
                      : 'bg-amber-600 text-white shadow-amber-900/30 hover:bg-amber-500'
                  }`}
                >
                  {fillingSaveStatus === 'saving' && <Loader2 size={14} className="animate-spin" />}
                  {fillingSaveStatus === 'success' && <CheckCircle2 size={14} />}
                  {fillingSaveStatus === 'success' ? 'Recheio Salvo!' : fillingSaveStatus === 'error' ? 'Erro ao Salvar' : 'Cadastrar Recheio'}
                </button>
              </div>
               <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide pr-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 block mb-4 sticky top-0 bg-[#f8fafc] py-2">Recheios Cadastrados</label>
                {fillings.map(filling => {
                  const linkedProducts = menuFillings.filter(mf => mf.fillingId === filling.id);
                  const productNames = linkedProducts.map(lp => items.find(i => i.id === lp.menuItemId)?.name).filter(Boolean);
                  
                  return (
                    <div key={filling.id} className={`flex items-center justify-between p-5 border rounded-[1.5rem] group transition-all ${filling.inStock ? 'bg-black/[0.01] border-black/5 hover:border-emerald-500/20 hover:bg-black/[0.02]' : 'bg-red-500/[0.03] border-red-500/10'}`}>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-3">
                             <span className={`text-sm font-black uppercase italic tracking-tight ${filling.inStock ? 'text-slate-900' : 'text-red-400 line-through'}`}>{filling.name}</span>
                             <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${filling.inStock ? 'bg-emerald-600/5 text-emerald-600 border-emerald-500/10' : 'bg-red-600/5 text-red-400 border-red-500/10'}`}>
                               {filling.inStock ? (filling.stockQuantity !== undefined && filling.stockQuantity !== null ? `${filling.stockQuantity} un` : 'Em Estoque') : 'Esgotado'}
                             </span>
                           </div>
                           {productNames.length > 0 && (
                             <p className="text-[9px] text-slate-400 mt-1 truncate italic">
                                Vinculado a: {productNames.join(', ')}
                             </p>
                           )}

                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {/* Inline stock quantity editor */}
                          {editingFillingStockId === filling.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                type="number"
                                value={editingFillingStockValue}
                                onChange={e => setEditingFillingStockValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleUpdateFillingStock(filling, editingFillingStockValue);
                                  if (e.key === 'Escape') { setEditingFillingStockId(null); setEditingFillingStockValue(''); }
                                }}
                                placeholder="Qtd"
                                className="w-20 p-2 bg-black/5 border border-amber-500/40 rounded-xl text-amber-600 font-black text-xs text-center outline-none focus:border-amber-400"
                              />
                              <button
                                onClick={() => handleUpdateFillingStock(filling, editingFillingStockValue)}
                                className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all"
                                title="Confirmar"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                onClick={() => { setEditingFillingStockId(null); setEditingFillingStockValue(''); }}
                                className="p-2 rounded-xl bg-black/5 text-slate-400 hover:text-slate-900 transition-all"
                                title="Cancelar"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingFillingStockId(filling.id);
                                setEditingFillingStockValue(filling.stockQuantity !== undefined && filling.stockQuantity !== null ? filling.stockQuantity.toString() : '');
                              }}
                              className="p-2.5 rounded-xl text-amber-500 hover:bg-amber-500/10 transition-all"
                              title="Atualizar Estoque"
                            >
                              <PackagePlus size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleToggleFillingStock(filling)}
                            className={`p-2.5 rounded-xl transition-all ${filling.inStock ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-red-400 hover:bg-red-500/10'}`}
                            title={filling.inStock ? 'Marcar como Esgotado' : 'Repor Estoque'}
                          >
                            {filling.inStock ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          </button>
                          <button 
                            onClick={() => setPromptDelete({ type: 'filling', id: filling.id, name: filling.name })}
                            className="text-slate-400 hover:text-red-500 p-2.5 rounded-xl hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={18}/>
                          </button>
                        </div>
                    </div>
                  );
                })}
                {fillings.length === 0 && <p className="text-[10px] text-gray-600 text-center py-10 uppercase tracking-widest italic opacity-40">Nenhum recheio cadastrado.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <div className="glass-card p-10 rounded-[3rem] w-full max-w-sm shadow-2xl space-y-8 border border-black/[0.1] animate-in zoom-in-95 duration-500 text-center relative bg-white">
            <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 p-2 hover:bg-black/5 rounded-full transition-all"><X size={20}/></button>
            <div className="mx-auto w-16 h-16 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-900/10 mb-4">
               <ListOrdered size={28} />
            </div>
            <div className="space-y-2">
               <h3 className="text-xl font-black font-display text-slate-900 uppercase italic tracking-tight">Nova Categoria</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Organize seu cardápio com perfeição</p>
            </div>
            
            <div className="space-y-6">
              <input 
                autoFocus
                value={categoryName} 
                onChange={e => setCategoryName(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSaveCategory()}
                className="w-full p-5 bg-black/[0.02] rounded-[1.5rem] border border-black/[0.05] outline-none text-slate-900 text-sm font-bold text-center focus:ring-2 focus:ring-brand-500/50 transition-all placeholder:text-slate-300" 
                placeholder="Ex: Bebidas Geladas"
              />
              <button 
                onClick={handleSaveCategory} 
                className="w-full py-5 bg-brand-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-900/10 hover:bg-brand-500 transition-all active:scale-[0.98]"
              >
                Criar Categoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={!!promptDelete}
        title={`Excluir ${promptDelete?.type === 'item' ? 'Produto' : promptDelete?.type === 'category' ? 'Categoria' : promptDelete?.type === 'filling' ? 'Recheio' : 'Adicional'}`}
        message={`Tem certeza que deseja remover "${promptDelete?.name}"? Esta ação é irreversível e removerá as referências vinculadas no sistema.`}
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setPromptDelete(null)}
      />

      <ConfirmationModal 
        isOpen={isResetConfirmOpen}
        title="Restaurar Cardápio Oficial"
        message="Deseja restaurar o cardápio oficial completo da Pastelaria do Joel? Isso carregará todas as 7 categorias, 58 produtos, 12 adicionais e 8 opções de bebidas com preços e configurações originais."
        isDestructive={false}
        onConfirm={handleResetMenu}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};

export default MenuPage;