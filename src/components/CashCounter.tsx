import React, { useState, useEffect } from 'react';
import { Minus, Plus, Banknote, Coins } from 'lucide-react';
import { CashBreakdown } from '@/types';

interface CashCounterProps {
  onChange: (total: number, breakdown: CashBreakdown) => void;
  initialBreakdown?: CashBreakdown;
}

const denominations = [
  { key: 'bills_200', label: '200,00', value: 200, type: 'bill' },
  { key: 'bills_100', label: '100,00', value: 100, type: 'bill' },
  { key: 'bills_50', label: '50,00', value: 50, type: 'bill' },
  { key: 'bills_20', label: '20,00', value: 20, type: 'bill' },
  { key: 'bills_10', label: '10,00', value: 10, type: 'bill' },
  { key: 'bills_5', label: '5,00', value: 5, type: 'bill' },
  { key: 'bills_2', label: '2,00', value: 2, type: 'bill' },
  { key: 'coins_1', label: '1,00', value: 1, type: 'coin' },
  { key: 'coins_050', label: '0,50', value: 0.5, type: 'coin' },
  { key: 'coins_025', label: '0,25', value: 0.25, type: 'coin' },
  { key: 'coins_010', label: '0,10', value: 0.1, type: 'coin' },
  { key: 'coins_005', label: '0,05', value: 0.05, type: 'coin' },
];

const CashCounter: React.FC<CashCounterProps> = ({ onChange, initialBreakdown }) => {
  const [breakdown, setBreakdown] = useState<CashBreakdown>(initialBreakdown || {
    bills_200: 0, bills_100: 0, bills_50: 0, bills_20: 0, bills_10: 0, bills_5: 0, bills_2: 0,
    coins_1: 0, coins_050: 0, coins_025: 0, coins_010: 0, coins_005: 0
  });

  useEffect(() => {
    const total = denominations.reduce((sum, d) => {
      const qty = breakdown[d.key as keyof CashBreakdown] || 0;
      return sum + (qty * d.value);
    }, 0);
    onChange(total, breakdown);
  }, [breakdown]);

  const updateQty = (key: keyof CashBreakdown, delta: number) => {
    setBreakdown(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta)
    }));
  };

  const handleInputChange = (key: keyof CashBreakdown, val: string) => {
    const num = parseInt(val) || 0;
    setBreakdown(prev => ({
      ...prev,
      [key]: Math.max(0, num)
    }));
  };

  return (
    <div className="space-y-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar p-1">
      {/* Notas Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
            <Banknote size={14} className="text-green-500" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cédulas (Notas)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
            {denominations.filter(d => d.type === 'bill').map((d) => (
            <div key={d.key} className="glass-card p-3 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-brand-500/30 transition-all duration-300">
                <div className="flex flex-col">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">R$</p>
                    <p className="text-sm font-black text-white font-display leading-none">{d.label}</p>
                </div>

                <div className="flex items-center gap-1.5 px-1">
                <button 
                    type="button"
                    onClick={() => updateQty(d.key as keyof CashBreakdown, -1)}
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                >
                    <Minus size={12} />
                </button>
                
                <input 
                    type="number"
                    value={breakdown[d.key as keyof CashBreakdown] || ''}
                    onChange={(e) => handleInputChange(d.key as keyof CashBreakdown, e.target.value)}
                    placeholder="0"
                    className="w-10 bg-transparent border-b border-white/10 text-center font-bold text-white outline-none focus:border-brand-500 transition-all text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />

                <button 
                    type="button"
                    onClick={() => updateQty(d.key as keyof CashBreakdown, 1)}
                    className="w-7 h-7 rounded-lg bg-brand-600/20 border border-brand-600/20 flex items-center justify-center text-brand-500 hover:text-white hover:bg-brand-600 active:scale-90 transition-all"
                >
                    <Plus size={12} />
                </button>
                </div>
            </div>
            ))}
        </div>
      </div>

      {/* Moedas Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
            <Coins size={14} className="text-blue-500" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Moedas</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
            {denominations.filter(d => d.type === 'coin').map((d) => (
            <div key={d.key} className="glass-card p-3 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-brand-500/30 transition-all duration-300">
                <div className="flex flex-col">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">R$</p>
                    <p className="text-sm font-black text-white font-display leading-none">{d.label}</p>
                </div>

                <div className="flex items-center gap-1.5 px-1">
                <button 
                    type="button"
                    onClick={() => updateQty(d.key as keyof CashBreakdown, -1)}
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                >
                    <Minus size={12} />
                </button>
                
                <input 
                    type="number"
                    value={breakdown[d.key as keyof CashBreakdown] || ''}
                    onChange={(e) => handleInputChange(d.key as keyof CashBreakdown, e.target.value)}
                    placeholder="0"
                    className="w-10 bg-transparent border-b border-white/10 text-center font-bold text-white outline-none focus:border-brand-500 transition-all text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />

                <button 
                    type="button"
                    onClick={() => updateQty(d.key as keyof CashBreakdown, 1)}
                    className="w-7 h-7 rounded-lg bg-brand-600/20 border border-brand-600/20 flex items-center justify-center text-brand-500 hover:text-white hover:bg-brand-600 active:scale-90 transition-all"
                >
                    <Plus size={12} />
                </button>
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CashCounter;
