"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { PaymentMethod } from '@/types';

interface DailyReportReceiptProps {
  date: string;
  totals: {
    [key in PaymentMethod]?: number;
  } & {
    total: number;
    discount: number;
    count: number;
  };
  sellerName?: string;
}

const DailyReportReceipt: React.FC<DailyReportReceiptProps> = ({ date, totals, sellerName }) => {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const portalRoot = typeof document !== 'undefined' ? document.getElementById('print-portal') : null;

  const content = (
    <div 
      id="print-daily-report" 
      className="hidden print:block bg-white text-black w-[72mm] max-w-[72mm] mx-auto p-0 pb-1 font-mono text-[12px] leading-tight box-border"
    >
      <div className="text-center border-b border-dashed border-black pb-1.5 mb-1.5">
        <h1 className="text-xl font-black uppercase tracking-wider">PASTELARIA DO JOEL</h1>
        <h2 className="text-sm font-bold uppercase mt-0.5">RESUMO DE VENDAS / CAIXA</h2>
        <p className="text-[11px] font-bold mt-1">DATA: {date}</p>
        {sellerName && <p className="text-[11px] uppercase font-bold">RESPONSÁVEL: {sellerName}</p>}
      </div>

      <div className="space-y-1 mb-2">
        <div className="flex justify-between font-black border-b border-black pb-1 mb-1 text-[12px]">
          <span>FORMA DE PAGAMENTO</span>
          <span>VALOR</span>
        </div>
        
        <div className="flex justify-between text-[12px]">
          <span>Dinheiro:</span>
          <span className="font-bold">{fmt(totals[PaymentMethod.CASH] || 0)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span>PIX:</span>
          <span className="font-bold">{fmt(totals[PaymentMethod.PIX] || 0)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span>Cartão Débito:</span>
          <span className="font-bold">{fmt(totals[PaymentMethod.DEBIT] || 0)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span>Cartão Crédito:</span>
          <span className="font-bold">{fmt(totals[PaymentMethod.CREDIT] || 0)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span>Fiado / Mensalista:</span>
          <span className="font-bold">{fmt(totals[PaymentMethod.FIADO] || 0)}</span>
        </div>
        
        <div className="border-t border-dashed border-black pt-1.5 mt-1.5 font-bold space-y-0.5">
          <div className="flex justify-between text-[12px]">
            <span>TOTAL BRUTO:</span>
            <span>{fmt(totals.total + totals.discount)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-[12px]">
              <span>TOTAL DESCONTOS:</span>
              <span>- {fmt(totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black border-t-2 border-b border-black py-1 mt-1">
            <span>TOTAL LÍQUIDO:</span>
            <span>{fmt(totals.total)}</span>
          </div>
        </div>
      </div>

      <div className="text-center border-t border-dashed border-black pt-2 mt-2">
        <p className="text-[11px] uppercase font-black">Total de Comandas: {totals.count}</p>
        <p className="text-[9px] mt-1 text-gray-800">
          Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );

  return portalRoot ? createPortal(content, portalRoot) : null;
};

export default DailyReportReceipt;
