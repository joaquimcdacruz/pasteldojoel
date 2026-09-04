"use client";

import React from 'react';
import { MenuItem, CategoryItem, Filling, MenuItemFilling } from '@/types';
import { StorageService } from '@/services/storageService';
import { EyeOff, Beef } from 'lucide-react';

interface MenuSelectionProps {
  menuItems: MenuItem[];
  categories: CategoryItem[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  addItemToOrder: (menuItem: MenuItem) => Promise<void>;
  fillings?: Filling[];
  menuFillings?: MenuItemFilling[];
}

const MenuSelection: React.FC<MenuSelectionProps> = ({
  menuItems,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm,
  addItemToOrder,
  fillings = [],
  menuFillings = [],
}) => {
  const filteredItems = menuItems.filter((item) => {
    const selectedCatObj = categories.find(c => c.name === selectedCategory || c.id === selectedCategory);
    const matchesCategory = selectedCatObj 
      ? (item.category === selectedCatObj.id || item.category === selectedCatObj.name || item.category?.toLowerCase() === selectedCatObj.name.toLowerCase())
      : (item.category === selectedCategory || item.category?.toLowerCase() === selectedCategory.toLowerCase());
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Compute auto-disabled product IDs from fillings AND numeric stock
  const autoDisabledIds = StorageService.getAutoDisabledProductIds(fillings, menuFillings, menuItems);

  return (
    <div className="flex-1 min-h-[500px] lg:h-full flex flex-col bg-white rounded-3xl border border-black/[0.05] lg:overflow-hidden shadow-sm">
      <div className="p-3 border-b border-black/[0.03] flex gap-2 overflow-x-auto custom-scrollbar bg-black/[0.01] scroll-smooth">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.name)}
            className={`px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest font-black whitespace-nowrap transition-all duration-500 border ${
              selectedCategory === cat.name 
              ? 'bg-brand-600 text-white border-brand-500 shadow-lg shadow-brand-900/10' 
              : 'bg-black/[0.02] text-slate-500 border-black/5 hover:bg-black/5 hover:text-slate-900'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <div className="p-3 border-b border-black/[0.03] bg-white">
        <input
          type="text"
          placeholder="Filtrar produtos por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filteredItems.length === 1) {
              const item = filteredItems[0];
              const autoDisabledIds = StorageService.getAutoDisabledProductIds(fillings, menuFillings, menuItems);
              const isUnavailable = item.inStock === false || autoDisabledIds.has(item.id);
              if (!isUnavailable) {
                addItemToOrder(item);
                setSearchTerm('');
              }
            }
          }}
          className="w-full px-5 py-3 bg-black/[0.02] rounded-2xl text-sm outline-none border border-black/5 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 text-slate-900 placeholder:text-slate-400 transition-all duration-300"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5 custom-scrollbar content-start items-start bg-white">
        {filteredItems.map((item) => {
          const isOutOfStock = item.inStock === false;
          const isAutoDisabled = autoDisabledIds.has(item.id);
          const isUnavailable = isOutOfStock || isAutoDisabled;

          return (
            <button 
              key={item.id} 
              onClick={() => !isUnavailable && addItemToOrder(item)} 
              disabled={isUnavailable}
              className={`flex flex-col p-5 rounded-[2rem] border text-left transition-all duration-500 group min-h-[140px] justify-between relative overflow-hidden ${
                isUnavailable 
                  ? 'border-red-500/10 bg-red-500/[0.02] opacity-50 cursor-not-allowed'
                  : 'border-black/[0.05] hover:border-brand-600/30 hover:shadow-lg hover:shadow-brand-900/5 bg-white hover:bg-slate-50 active:scale-95'
              }`}
            >
              {/* Out of Stock Badge */}
              {isUnavailable && (
                <div className="absolute top-3 right-3 z-10">
                  {isOutOfStock ? (
                    <div className="bg-red-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                      <EyeOff size={10} /> Esgotado
                    </div>
                  ) : (
                    <div className="bg-amber-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Beef size={10} /> Recheio
                    </div>
                  )}
                </div>
              )}

              {/* Hover Indicator */}
              {!isUnavailable && (
                <div className="absolute top-0 right-0 w-10 h-10 bg-brand-600/5 rounded-bl-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              
              <h4 className={`font-black text-[15px] mb-3 line-clamp-2 uppercase tracking-tight leading-tight transition-colors duration-300 ${
                isUnavailable ? 'text-slate-300 line-through' : 'text-slate-800 group-hover:text-brand-600'
              }`}>{item.name}</h4>
              <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Preço Uni.</span>
                      <span className={`font-display font-black text-lg tracking-tight ${isUnavailable ? 'text-slate-300' : 'text-brand-600'}`}>{item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  {(() => {
                    const isBev = StorageService.isBeverage(item);
                    const itemLinks = menuFillings.filter(mf => mf.menuItemId === item.id);
                    let displayStock = item.stockQuantity;

                    if (isBev && itemLinks.length > 0) {
                      displayStock = itemLinks.reduce((sum, link) => {
                        const filling = fillings.find(f => f.id === link.fillingId);
                        return sum + (filling?.stockQuantity || 0);
                      }, 0);
                    }

                    if (displayStock === undefined || displayStock === null) return null;

                    return (
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${displayStock <= 5 ? 'bg-amber-600/10 text-amber-600 border-amber-500/20' : 'bg-emerald-600/10 text-emerald-600 border-emerald-500/20'}`}>
                        {displayStock} un
                      </span>
                    );
                  })()}

              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MenuSelection;