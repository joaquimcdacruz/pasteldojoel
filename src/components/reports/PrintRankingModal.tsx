"use client";

import React, { useState, useMemo } from 'react';
import { Printer, X, Check, Filter, ArrowUpDown, ListOrdered } from 'lucide-react';
import { RankingItemToPrint } from './ProductRankingReceipt';

export interface PrintRankingConfig {
  filterMode: 'with_sales' | 'all' | 'screen_filter';
  limit: 'all' | 10 | 20 | 30;
  orderBy: 'qty' | 'revenue';
}

interface PrintRankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (config: PrintRankingConfig) => void;
  dateLabel: string;
  allProducts: Array<{
    name: string;
    value: number;
    revenue: number;
    category: string;
  }>;
  screenFilteredProducts: Array<{
    name: string;
    value: number;
    revenue: number;
    category: string;
  }>;
  activeScreenFiltersDescription?: string;
  isPrinting?: boolean;
}

const PrintRankingModal: React.FC<PrintRankingModalProps> = ({
  isOpen,
  onClose,
  onPrint,
  dateLabel,
  allProducts,
  screenFilteredProducts,
  activeScreenFiltersDescription,
  isPrinting = false,
}) => {
  const [filterMode, setFilterMode] = useState<'with_sales' | 'all' | 'screen_filter'>('with_sales');
  const [limit, setLimit] = useState<'all' | 10 | 20 | 30>('all');
  const [orderBy, setOrderBy] = useState<'qty' | 'revenue'>('qty');

  const productsWithSalesCount = useMemo(() => {
    return allProducts.filter(p => p.value > 0).length;
  }, [allProducts]);

  // Pré-visualização dos itens e totais que serão impressos
  const previewData = useMemo(() => {
    let list: RankingItemToPrint[] = [];

    if (filterMode === 'with_sales') {
      list = allProducts.filter(p => p.value > 0);
    } else if (filterMode === 'screen_filter') {
      list = [...screenFilteredProducts];
    } else {
      list = [...allProducts];
    }

    // Ordenação
    list.sort((a, b) => {
      if (orderBy === 'revenue') {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        return b.value - a.value;
      } else {
        if (b.value !== a.value) return b.value - a.value;
        return b.revenue - a.revenue;
      }
    });

    // Limite
    if (limit !== 'all') {
      list = list.slice(0, limit);
    }

    const totalVolume = list.reduce((s, i) => s + i.value, 0);
    const totalRevenue = list.reduce((s, i) => s + i.revenue, 0);

    return {
      items: list,
      count: list.length,
      totalVolume,
      totalRevenue,
    };
  }, [allProducts, screenFilteredProducts, filterMode, limit, orderBy]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPrint({
      filterMode,
      limit,
      orderBy,
    });
  };

  const fmtCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-50 rounded-2xl text-brand-600 border border-brand-100">
              <Printer size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Imprimir Ranking de Produtos
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Período: <strong className="text-slate-800 font-bold">{dateLabel}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Opção 1: Quais produtos incluir */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Filter size={13} />
              Quais produtos imprimir?
            </label>
            <div className="grid grid-cols-1 gap-2">
              <label
                className={`flex items-start justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  filterMode === 'with_sales'
                    ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="filterMode"
                    value="with_sales"
                    checked={filterMode === 'with_sales'}
                    onChange={() => setFilterMode('with_sales')}
                    className="mt-0.5 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="text-xs font-black text-slate-800 block">
                      Apenas Produtos Vendidos (Recomendado)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Economiza papel na bobina térmica ({productsWithSalesCount} itens com saída)
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg shrink-0">
                  {productsWithSalesCount} un
                </span>
              </label>

              <label
                className={`flex items-start justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  filterMode === 'all'
                    ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="filterMode"
                    value="all"
                    checked={filterMode === 'all'}
                    onChange={() => setFilterMode('all')}
                    className="mt-0.5 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="text-xs font-black text-slate-800 block">
                      Todos os Produtos do Cardápio
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Inclui itens sem vendas no período ({allProducts.length} itens cadastrados)
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-lg shrink-0">
                  {allProducts.length} itens
                </span>
              </label>

              {activeScreenFiltersDescription && (
                <label
                  className={`flex items-start justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                    filterMode === 'screen_filter'
                      ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="filterMode"
                      value="screen_filter"
                      checked={filterMode === 'screen_filter'}
                      onChange={() => setFilterMode('screen_filter')}
                      className="mt-0.5 text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 block">
                        Filtros Atuais da Tela
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {activeScreenFiltersDescription}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded-lg shrink-0">
                    {screenFilteredProducts.length} itens
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Opção 2 e 3: Ordenação e Limite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <ArrowUpDown size={12} />
                Ordenar por
              </label>
              <select
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value as 'qty' | 'revenue')}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 p-2.5 rounded-xl outline-none focus:border-brand-600 cursor-pointer"
              >
                <option value="qty">Quantidade Vendida (Mais Vendidos)</option>
                <option value="revenue">Maior Faturamento (R$)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <ListOrdered size={12} />
                Limite de itens
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value) as any)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 p-2.5 rounded-xl outline-none focus:border-brand-600 cursor-pointer"
              >
                <option value="all">Todos os itens selecionados</option>
                <option value={10}>Top 10 mais vendidos</option>
                <option value={20}>Top 20 mais vendidos</option>
                <option value={30}>Top 30 mais vendidos</option>
              </select>
            </div>
          </div>

          {/* Card Resumo do que será impresso */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1 text-xs">
            <div className="flex justify-between items-center text-slate-500 font-bold text-[11px] uppercase tracking-wider">
              <span>Produtos a Imprimir</span>
              <span className="text-slate-900 font-black">{previewData.count} produtos</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 font-bold text-[11px] uppercase tracking-wider">
              <span>Volume Total</span>
              <span className="text-slate-900 font-black">{previewData.totalVolume} un.</span>
            </div>
            <div className="flex justify-between items-center text-slate-700 font-bold border-t border-slate-200/80 pt-1 mt-1 text-xs">
              <span className="font-black">Faturamento dos Itens</span>
              <span className="font-black text-slate-900 text-sm">
                {fmtCurrency(previewData.totalRevenue)}
              </span>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPrinting}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPrinting || previewData.count === 0}
              className="flex-1 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Printer size={16} />
              {isPrinting ? 'Imprimindo...' : 'Imprimir Agora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrintRankingModal;
