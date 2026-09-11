"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { StorageService } from '@/services/storageService';

export interface RankingItemToPrint {
  name: string;
  value: number; // quantidade vendida
  revenue: number; // faturamento em R$
  category: string;
}

interface ProductRankingReceiptProps {
  dateLabel: string;
  items: RankingItemToPrint[];
  sellerName?: string;
  categoryFilter?: string;
  orderBy?: 'qty' | 'revenue';
  totalVolume: number;
  totalRevenue: number;
  totalProductsCount: number;
  productsWithSalesCount: number;
}

const ProductRankingReceipt: React.FC<ProductRankingReceiptProps> = ({
  dateLabel,
  items,
  sellerName,
  categoryFilter,
  orderBy = 'qty',
  totalVolume,
  totalRevenue,
  totalProductsCount,
  productsWithSalesCount,
}) => {
  const portalRoot = typeof document !== 'undefined' ? document.getElementById('print-portal') : null;
  const printSettings = StorageService.getPrintSettings();
  const logo = StorageService.getLogo();
  const showLogo = printSettings.printLogo && Boolean(logo);
  const is58mm = printSettings.paperWidth === '58mm';

  const fmtCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const now = new Date();
  const emissionDate = now.toLocaleDateString('pt-BR');
  const emissionTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const content = (
    <div
      id="print-ranking-report"
      className={`hidden print:block bg-white text-black font-sans text-[12px] leading-tight box-border ${is58mm ? 'paper-58mm' : 'paper-80mm'}`}
    >
      {/* Cabeçalho */}
      {showLogo && logo ? (
        <div className="text-center mb-1">
          <img
            src={logo}
            alt="Logo"
            width="120"
            height="40"
            loading="eager"
            decoding="sync"
            className="h-10 max-h-12 max-w-[42mm] mx-auto mb-1 object-contain grayscale"
          />
          <h1 className="text-[16px] font-black uppercase tracking-wider leading-none mt-0.5 text-black">
            PASTEL DO JOEL
          </h1>
          <p className="text-[11px] uppercase font-bold tracking-wider mt-0.5 text-black">
            RANKING DE PRODUTOS
          </p>
        </div>
      ) : (
        <div className="text-center mb-1.5 pb-1 border-b border-black">
          <h1 className="text-[17px] font-black uppercase tracking-wider leading-none mt-0.5 text-black">
            PASTEL DO JOEL
          </h1>
          <p className="text-[11px] uppercase font-black tracking-widest mt-0.5 text-black">
            RANKING DE PRODUTOS
          </p>
        </div>
      )}

      {/* Informações do Relatório */}
      <div className="border-b border-black pb-1 mb-1 text-[11px] space-y-0.5 print-avoid-break">
        <div className="flex justify-between">
          <span className="font-bold">PERÍODO:</span>
          <span className="font-black uppercase text-right">{dateLabel}</span>
        </div>
        {sellerName && (
          <div className="flex justify-between">
            <span className="font-bold">VENDEDOR:</span>
            <span className="font-black uppercase">{sellerName}</span>
          </div>
        )}
        {categoryFilter && categoryFilter !== 'all' && (
          <div className="flex justify-between">
            <span className="font-bold">CATEGORIA:</span>
            <span className="font-black uppercase">{categoryFilter}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-700">
          <span>EMISSÃO:</span>
          <span>{emissionDate} às {emissionTime}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>CRITÉRIO:</span>
          <span className="uppercase font-bold">
            {orderBy === 'revenue' ? 'Maior Faturamento' : 'Maior Quantidade'}
          </span>
        </div>
      </div>

      {/* Resumo Consolidado */}
      <div className="bg-gray-100/80 p-1.5 mb-1.5 border border-black/30 rounded text-[11px] space-y-0.5 print-avoid-break">
        <div className="flex justify-between font-bold">
          <span>Volume Vendido:</span>
          <span className="font-black">{totalVolume} un.</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Faturamento dos Itens:</span>
          <span className="font-black">{fmtCurrency(totalRevenue)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-700">
          <span>Produtos Listados:</span>
          <span>
            {items.length} ({productsWithSalesCount} com vendas / {totalProductsCount} total)
          </span>
        </div>
      </div>

      {/* Cabeçalho da Tabela */}
      <div className="border-t border-b border-black py-1 font-black text-[10px] uppercase flex justify-between tracking-wider">
        <span className="w-[18px]">#</span>
        <span className="flex-1 px-1">PRODUTO / CAT.</span>
        <span className="text-right w-[42px]">QTD</span>
        <span className="text-right w-[54px]">TOTAL</span>
      </div>

      {/* Lista de Itens */}
      <div className="divide-y divide-gray-300">
        {items.length === 0 ? (
          <div className="py-4 text-center text-[11px] text-gray-600 font-bold uppercase">
            Nenhum produto encontrado no período
          </div>
        ) : (
          items.map((item, index) => {
            const hasSales = item.value > 0;
            return (
              <div
                key={`${item.name}-${index}`}
                className={`py-1 print-avoid-break ${!hasSales ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-black text-[11px] w-[18px] text-left shrink-0">
                    {hasSales ? `${index + 1}` : '-'}
                  </span>
                  <div className="flex-1 px-1 min-w-0">
                    <span className="font-black uppercase text-[11px] block leading-tight break-words">
                      {item.name}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-gray-600 block">
                      {item.category}
                    </span>
                  </div>
                  <span className="font-black text-[11px] text-right w-[42px] shrink-0">
                    {item.value} un
                  </span>
                  <span className="font-black text-[11px] text-right w-[54px] shrink-0">
                    {fmtCurrency(item.revenue)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rodapé / Totais */}
      <div className="border-t-2 border-black pt-1.5 mt-2 space-y-0.5 print-avoid-break">
        <div className="flex justify-between font-black text-[12px]">
          <span>TOTAL ITENS VENDIDOS:</span>
          <span>{totalVolume} un.</span>
        </div>
        <div className="flex justify-between font-black text-[13px] border-b border-black pb-1">
          <span>FATURAMENTO TOTAL:</span>
          <span>{fmtCurrency(totalRevenue)}</span>
        </div>
      </div>

      <div className="text-center mt-2 pt-1 pb-3 print-avoid-break">
        <p className="font-black uppercase text-[10px] tracking-wider text-black">
          PASTELARIA DO JOEL • GESTÃO & PDV
        </p>
        <p className="text-[9px] font-bold text-gray-600 uppercase mt-0.5">
          Relatório emitido para controle interno
        </p>
      </div>
    </div>
  );

  return portalRoot ? createPortal(content, portalRoot) : null;
};

export default ProductRankingReceipt;
