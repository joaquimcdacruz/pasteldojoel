import React from 'react';
import { Utensils, Plus, Minus, Edit3, Trash2, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { Order, OrderItem, DEFAULT_CATEGORIES, OrderType, Filling } from '@/types';

interface OrderItemsListProps {
  order: Order;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onEditItem: (item: OrderItem) => void;
  onDeleteItem: (itemId: string) => void;
  fillings: Filling[];
}


const OrderItemsList: React.FC<OrderItemsListProps> = ({ 
  order, 
  onUpdateQuantity, 
  onEditItem,
  onDeleteItem,
  fillings
}) => {

  const isOpen = order.status === 'OPEN';
  const items = order.items || [];

  const sortedItems = [...items].sort((a, b) => {
    const catA = DEFAULT_CATEGORIES.indexOf(a.category);
    const catB = DEFAULT_CATEGORIES.indexOf(b.category);
    // Categorias não encontradas vão para o final
    const indexA = catA === -1 ? 999 : catA;
    const indexB = catB === -1 ? 999 : catB;
    if (indexA !== indexB) return indexA - indexB;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="bg-white rounded-3xl overflow-hidden h-full flex flex-col border border-black/[0.05] shadow-sm">
      <div className="p-3 border-b border-black/[0.03] flex items-center justify-between bg-black/[0.01]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center text-brand-600 shadow-sm">
            <Utensils size={14} />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 font-display">Itens da Comanda</h3>
        </div>
        <span className="bg-black/[0.02] text-slate-500 px-3 py-1 rounded-full text-[8px] font-black border border-black/5 uppercase tracking-widest">
          {order.items.length} ITEM{(order.items.length !== 1) ? 'S' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar bg-white">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 opacity-20">
            <ShoppingBag size={48} className="mb-4 text-slate-400" />
            <p className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Comanda Vazia</p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <div key={item.id} className="group bg-white hover:bg-slate-50 border border-black/[0.05] hover:border-brand-600/30 rounded-[1.5rem] transition-all duration-500 relative overflow-hidden flex flex-col shadow-sm">
               {/* Selection Glow */}
               <div className="absolute inset-y-0 left-0 w-1 bg-brand-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

               {/* Row 1: Item Name & Type Status */}
               <div className="p-3 pb-1.5 flex justify-between items-center bg-slate-50 border-b border-black/[0.03]">
                 <h4 className="font-black text-[12px] text-slate-900 uppercase tracking-tight group-hover:text-brand-600 transition-colors duration-300">
                   {item.name}
                   {item.fillingId && (
                      <span className="ml-2 text-brand-600/80 lowercase italic font-medium tracking-normal">
                         ({fillings.find(f => f.id === item.fillingId)?.name || 'Opção selecionada'})
                      </span>
                    )}
                 </h4>
                 {item.orderType && (
                    <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border flex items-center gap-1 ${
                      item.orderType === OrderType.TAKEAWAY
                        ? 'bg-blue-600/10 text-blue-600 border-blue-500/20'
                        : 'bg-brand-600/10 text-brand-600 border-brand-600/20'
                    }`}>
                      {item.orderType === OrderType.TAKEAWAY ? <ShoppingBag size={7}/> : <UtensilsCrossed size={7}/>}
                      {item.orderType}
                    </span>
                  )}
               </div>

               {/* Row 2: Addons & Notes (Details) - Only if they exist */}
               {( (item.addons && item.addons.length > 0) || item.notes ) && (
                 <div className="px-4 py-2 space-y-2">
                    {item.addons && item.addons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {item.addons.map(a => (
                                <span key={a.id} className="text-[7px] bg-brand-600/5 text-brand-600 px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border border-brand-600/10">
                                    + {a.name}
                                </span>
                            ))}
                        </div>
                    )}
                    {item.notes && <p className="text-[9px] text-slate-500 italic font-medium leading-relaxed bg-black/[0.01] p-2 rounded-lg border border-black/[0.03]">"{item.notes}"</p>}
                 </div>
               )}

               {/* Row 3: Controls & Final Price */}
               <div className="p-3 pt-1.5 mt-auto flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2 bg-black/[0.01] p-1 rounded-xl border border-black/[0.05]">
                    {isOpen ? (
                      <>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-600 rounded-lg transition-all duration-300"
                          title="Remover item"
                        >
                          <Trash2 size={12} />
                        </button>
                        <div className="w-px h-4 bg-black/10" />
                        <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-600 rounded-lg transition-all duration-300"><Minus size={12} /></button>
                        <span className="min-w-[20px] text-center font-black text-[11px] text-slate-900 tracking-tighter">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-1.5 text-brand-600 hover:bg-brand-600/10 rounded-lg transition-all duration-300"><Plus size={12} /></button>
                        <button onClick={() => onEditItem(item)} className="p-1.5 text-blue-600 hover:bg-blue-600/10 rounded-lg transition-all duration-300 ml-1 border-l border-black/10 pl-2"><Edit3 size={12} /></button>
                      </>
                    ) : (
                      <span className="px-3 py-1 font-black text-[10px] text-slate-900 bg-black/[0.02] rounded-lg tracking-widest uppercase">Qtd: {item.quantity}</span>
                    )}
                  </div>
                  <span className="text-sm font-black text-brand-600 font-display tracking-tight">
                    {((item.price + (item.extra || 0)) * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrderItemsList;