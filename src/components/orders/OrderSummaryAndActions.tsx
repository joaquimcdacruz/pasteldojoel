import React, { useState } from 'react';
import { CheckCircle, Printer, RotateCcw, Save, Tag, MinusCircle, Trash2 } from 'lucide-react';
import { Order, OrderStatus } from '@/types';

interface OrderSummaryAndActionsProps {
  order: Order;
  onUpdateStatus: (status: OrderStatus) => void;
  onDelete: () => void;
  onSave: () => void;
  onUpdateDiscount: (amount: number) => void;
}

const OrderSummaryAndActions: React.FC<OrderSummaryAndActionsProps> = ({
  order,
  onUpdateStatus,
  onDelete,
  onSave,
  onUpdateDiscount
}) => {
  const [isDiscountInputOpen, setIsDiscountInputOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState(order.discount.toString());
  const isOpen = order.status === OrderStatus.OPEN;

  const handleApplyDiscount = () => {
    const val = parseFloat(discountValue) || 0;
    onUpdateDiscount(val);
    setIsDiscountInputOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-black/[0.05] space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Resumo de Valores</h3>
            {isOpen && (
                <button 
                    onClick={() => setIsDiscountInputOpen(!isDiscountInputOpen)}
                    className="text-brand-600 hover:text-brand-700 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all hover:scale-105"
                >
                    <Tag size={12}/> {order.discount > 0 ? 'Editar' : 'Desconto'}
                </button>
            )}
        </div>
        
        <div className="space-y-4">
            <div className="flex justify-between text-xs font-bold text-slate-500">
                <span className="uppercase tracking-widest">Subtotal</span>
                <span className="text-slate-900">{order.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            
            {(order.discount > 0 || isDiscountInputOpen) && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    {isDiscountInputOpen ? (
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 tracking-tighter uppercase">R$</span>
                                <input 
                                    type="number" 
                                    value={discountValue} 
                                    onChange={(e) => setDiscountValue(e.target.value)}
                                    className="w-full text-xs py-3 pl-8 pr-3 bg-black/[0.02] rounded-xl border border-black/5 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 font-black text-slate-900 transition-all"
                                    placeholder="0,00"
                                    autoFocus
                                />
                            </div>
                            <button onClick={handleApplyDiscount} className="bg-brand-600 text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-900/20 hover:bg-brand-500 transition-all">OK</button>
                        </div>
                    ) : (
                        <div className="flex justify-between text-[11px] text-green-600 font-black uppercase tracking-widest bg-green-500/5 p-3 rounded-xl border border-green-500/10">
                            <span className="flex items-center gap-2 animate-pulse"><MinusCircle size={12}/> Desconto Aplicado</span>
                            <span>-{order.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-between items-center pt-4 mt-1 border-t border-black/[0.05]">
                <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Total Bruto</span>
                <span className="text-2xl font-black text-brand-600 font-display tracking-tight">
                    {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {isOpen ? (
          <button
            onClick={() => onUpdateStatus(OrderStatus.CLOSED)}
            disabled={order.items.length === 0}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 shadow-lg shadow-brand-900/20 hover:shadow-brand-500/30 transition-all disabled:opacity-30 group active:scale-[0.98] transform hover:-translate-y-1"
          >
            <CheckCircle size={18} className="group-hover:scale-110 transition-transform duration-500"/> Finalizar Pagamento
          </button>
        ) : (
          <button
            onClick={() => onUpdateStatus(OrderStatus.OPEN)}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 shadow-sm border border-black/5 transition-all group active:scale-[0.98] transform hover:-translate-y-1"
          >
            <RotateCcw size={18} className="group-hover:rotate-[-45deg] transition-transform duration-700"/> Reativar Comanda
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => window.print()} 
            className="bg-slate-50 border border-black/5 py-4 rounded-2xl font-black text-[10px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.95]"
          >
            <Printer size={16}/> Imprimir
          </button>
          <button 
            onClick={onSave} 
            className="bg-brand-600/10 border border-brand-600/20 text-brand-600 py-4 rounded-2xl font-black text-[10px] hover:bg-brand-600/20 uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-[0.95]"
          >
            <Save size={16}/> Salvar
          </button>
        </div>

        <button 
            onClick={onDelete} 
            className="w-full py-3.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-red-200/70 active:scale-[0.98]"
        >
            <Trash2 size={16} />
            Excluir Comanda
        </button>
      </div>
    </div>
  );
};

export default OrderSummaryAndActions;