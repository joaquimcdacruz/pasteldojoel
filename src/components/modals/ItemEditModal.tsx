"use client";

import React from 'react';
import { Plus, Minus, X, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { OrderItem, MenuItem, Addon, OrderType, Filling, MenuItemFilling } from '@/types';

interface ItemEditModalProps {
  isItemModalOpen: boolean;
  setIsItemModalOpen: (isOpen: boolean) => void;
  editingItem: OrderItem | null;
  selectedMenuItem: MenuItem | null;
  itemQuantity: number;
  setItemQuantity: (quantity: number) => void;
  itemNotes: string;
  setItemNotes: (notes: string) => void;
  itemExtra: number;
  setItemExtra: (extra: number) => void;
  addons: Addon[];
  selectedAddons?: Addon[];
  onToggleAddon?: (addon: Addon) => void;
  handleSaveItem: () => Promise<void>;
  itemOrderType: OrderType;
  setItemOrderType: (type: OrderType) => void;
  fillings: Filling[];
  productFillings: MenuItemFilling[];
  selectedFillingId: string | null;
  setSelectedFillingId: (id: string | null) => void;
}


const ItemEditModal: React.FC<ItemEditModalProps> = ({
  isItemModalOpen,
  setIsItemModalOpen,
  editingItem,
  selectedMenuItem,
  itemQuantity,
  setItemQuantity,
  itemNotes,
  setItemNotes,
  itemExtra,
  setItemExtra,
  addons,
  selectedAddons = [],
  onToggleAddon,
  handleSaveItem,
  itemOrderType,
  setItemOrderType,
  fillings,
  productFillings,
  selectedFillingId,
  setSelectedFillingId
}) => {
  const maxStock = (() => {
    if (selectedFillingId) {
      const filling = fillings.find(f => f.id === selectedFillingId);
      return filling?.stockQuantity ?? null;
    }
    return selectedMenuItem?.stockQuantity ?? null;
  })();

  if (!isItemModalOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300"
      onKeyDown={(e) => e.key === 'Enter' && handleSaveItem()}
    >
      <div className="glass-card rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-black/[0.1] animate-in zoom-in-95 duration-500 bg-white">
        {/* Header Compacto */}
        <div className="px-8 py-6 border-b border-black/[0.03] flex justify-between items-center bg-slate-50">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic truncate pr-4">
            {editingItem ? 'Editar Item' : selectedMenuItem?.name}
          </h3>
          <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-black/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto scrollbar-hide bg-white">
          {/* Seletor de Quantidade */}
          <div className="flex items-center justify-between bg-black/[0.02] p-3 rounded-[1.5rem] border border-black/[0.05]">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Quantidade</span>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))} 
                className="w-12 h-12 rounded-2xl bg-white border border-black/10 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 active:scale-90 transition-all shadow-sm"
              >
                <Minus size={20} />
              </button>
              <span className="text-3xl font-black text-slate-900 w-8 text-center font-display italic tracking-tighter">{itemQuantity}</span>
              <button 
                onClick={() => {
                  if (maxStock === null || itemQuantity < maxStock) {
                    setItemQuantity(itemQuantity + 1);
                  }
                }} 
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all active:scale-90 ${
                  maxStock !== null && itemQuantity >= maxStock
                    ? 'bg-slate-300 cursor-not-allowed opacity-50'
                    : 'bg-brand-600 shadow-lg shadow-brand-900/20 hover:bg-brand-500'
                }`}
                disabled={maxStock !== null && itemQuantity >= maxStock}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          {maxStock !== null && itemQuantity >= maxStock && (
            <p className="text-[9px] text-red-600 font-black uppercase text-center tracking-widest animate-pulse -mt-4">
              Limite de estoque atingido ({maxStock} un)
            </p>
          )}


          {/* Tipo de Atendimento */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 font-display">Opção de Atendimento</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setItemOrderType(OrderType.DINE_IN)}
                className={`flex items-center justify-center gap-3 p-4 rounded-[1.5rem] border transition-all ${
                  itemOrderType === OrderType.DINE_IN
                    ? 'bg-brand-600 text-white border-brand-500 shadow-lg shadow-brand-900/20'
                    : 'bg-black/[0.02] text-slate-500 border-black/[0.05] hover:border-black/20'
                }`}
              >
                <UtensilsCrossed size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Comer Aqui</span>
              </button>
              <button
                type="button"
                onClick={() => setItemOrderType(OrderType.TAKEAWAY)}
                className={`flex items-center justify-center gap-3 p-4 rounded-[1.5rem] border transition-all ${
                  itemOrderType === OrderType.TAKEAWAY
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20'
                    : 'bg-black/[0.02] text-slate-500 border-black/[0.05] hover:border-black/20'
                }`}
              >
                <ShoppingBag size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Para Viagem</span>
              </button>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Observações Detalhadas</label>
            <textarea
              rows={3}
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              className="w-full bg-black/[0.02] rounded-[1.5rem] p-5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/50 border border-black/[0.05] resize-none transition-all placeholder:text-slate-400"
              placeholder="Ex: Sem cebola, bem frito, molho especial..."
            />
          </div>

          {/* Opções de Sabores / Recheios */}
          {(() => {
            const linkedFillingIds = productFillings
              .filter(mf => mf.menuItemId === selectedMenuItem?.id)
              .map(mf => mf.fillingId);
            
            const itemFillings = fillings.filter(f => linkedFillingIds.includes(f.id));
            
            if (itemFillings.length === 0) return null;

            const isBeverage = selectedMenuItem?.category === 'Bebidas' || selectedMenuItem?.category?.includes('Bebida');
            const label = isBeverage ? 'Escolha o Sabor' : 'Escolha o Recheio';

            return (
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">{label}</label>
                <div className="grid grid-cols-2 gap-3">
                  {itemFillings.map((filling) => {
                    const isSelected = selectedFillingId === filling.id;
                    const isOutOfStock = !filling.inStock; 
                    
                    return (
                      <button
                        key={filling.id}
                        disabled={isOutOfStock && !isSelected}
                        onClick={() => {
                          const newId = isSelected ? null : filling.id;
                          setSelectedFillingId(newId);
                          
                          const newMax = newId 
                            ? (fillings.find(f => f.id === newId)?.stockQuantity ?? null)
                            : (selectedMenuItem?.stockQuantity ?? null);
                            
                          if (newMax !== null && itemQuantity > newMax) {
                            setItemQuantity(newMax || 1);
                          }
                        }}

                        className={`flex flex-col items-center justify-center gap-1 text-[10px] px-4 py-3.5 rounded-2xl border transition-all font-black uppercase tracking-tight italic ${
                          isSelected 
                          ? 'bg-brand-600 text-white border-brand-500 shadow-lg shadow-brand-900/20' 
                          : isOutOfStock 
                            ? 'bg-black/[0.01] text-slate-300 border-black/[0.03] cursor-not-allowed opacity-50'
                            : 'bg-black/[0.02] text-slate-500 border-black/[0.05] hover:border-black/20 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{filling.name}</span>
                        {isOutOfStock ? (
                          <span className="text-[8px] font-black opacity-70 not-italic">(Esgotado)</span>
                        ) : filling.stockQuantity !== undefined && filling.stockQuantity !== null ? (
                          <span className={`text-[8px] font-black not-italic px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : filling.stockQuantity <= 3
                                ? 'bg-amber-600/10 text-amber-600'
                                : 'bg-black/10 text-slate-500'
                          }`}>
                            {filling.stockQuantity} un
                          </span>
                        ) : null}
                      </button>

                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Adicionais */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Personalização / Extras</label>
            <div className="grid grid-cols-2 gap-3">
              {addons.map((addon) => {
                const isSelected = selectedAddons.find(a => a.id === addon.id);
                return (
                  <button
                    key={addon.id}
                    onClick={() => onToggleAddon?.(addon)}
                    className={`flex items-center justify-between text-[10px] px-4 py-3.5 rounded-2xl border transition-all font-black uppercase tracking-tight italic ${
                      isSelected 
                      ? 'bg-brand-600 text-white border-brand-500 shadow-lg shadow-brand-900/20' 
                      : 'bg-black/[0.02] text-slate-500 border-black/[0.05] hover:border-black/20 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate mr-2">{addon.name}</span>
                    <span className={isSelected ? 'text-white/70' : 'text-brand-600'}>
                      {addon.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Valor Manual */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Acréscimo Manual (R$)</label>
            <div className="relative group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-600 font-black text-xs italic tracking-tighter">R$</span>
              <input
                type="number"
                value={itemExtra || ''}
                onChange={(e) => setItemExtra(parseFloat(e.target.value) || 0)}
                className="w-full bg-black/[0.02] rounded-[1.5rem] p-5 pl-12 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/50 border border-black/[0.05] font-black transition-all"
                placeholder="0,00"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-black/[0.05] grid grid-cols-2 gap-4 bg-slate-50">
          <button 
            onClick={() => setIsItemModalOpen(false)} 
            className="py-4 bg-slate-100 border border-black/5 text-slate-600 text-[10px] font-black uppercase tracking-[0.2rem] rounded-[1.5rem] hover:bg-slate-200 hover:text-slate-900 transition-all active:scale-[0.98]"
          >
            Voltar
          </button>
          <button 
            onClick={handleSaveItem} 
            className="py-4 bg-brand-600 text-white text-[10px] font-black uppercase tracking-[0.2rem] rounded-[1.5rem] shadow-lg shadow-brand-900/20 hover:bg-brand-500 transition-all active:scale-[0.98]"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemEditModal;