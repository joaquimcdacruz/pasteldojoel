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
    <div id="print-receipt" className="hidden print:block bg-white text-black p-4 font-mono text-[12px] w-[80mm]">
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <h2 className="text-lg font-bold uppercase">Resumo de Vendas</h2>
        <p className="text-[10px] uppercase">Pastelaria do Joel</p>
        <p className="text-[10px]">{date}</p>
        {sellerName && <p className="text-[10px] uppercase">Vendedor: {sellerName}</p>}
      </div>

      <div className="space-y-1 mb-4">
        <div className="flex justify-between font-bold border-b border-black pb-1 mb-1">
          <span>MÉTODO</span>
          <span>VALOR</span>
        </div>
        
        <div className="flex justify-between">
          <span>Dinheiro:</span>
          <span>{fmt(totals[PaymentMethod.CASH] || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>PIX:</span>
          <span>{fmt(totals[PaymentMethod.PIX] || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Débito:</span>
          <span>{fmt(totals[PaymentMethod.DEBIT] || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Crédito:</span>
          <span>{fmt(totals[PaymentMethod.CREDIT] || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Fiado:</span>
          <span>{fmt(totals[PaymentMethod.FIADO] || 0)}</span>
        </div>
        
        <div className="border-t border-dashed border-black pt-1 mt-1 font-bold">
          <div className="flex justify-between text-sm">
            <span>TOTAL BRUTO:</span>
            <span>{fmt(totals.total + totals.discount)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>TOTAL DESCONTOS:</span>
            <span>- {fmt(totals.discount)}</span>
          </div>
          <div className="flex justify-between text-lg border-t border-black mt-1 pt-1">
            <span>TOTAL LÍQUIDO:</span>
            <span>{fmt(totals.total)}</span>
          </div>
        </div>
      </div>

      <div className="text-center border-t border-dashed border-black pt-2 mt-4">
        <p className="text-[10px] uppercase font-bold">Total de Comandas: {totals.count}</p>
        <p className="text-[9px] mt-2 italic text-gray-500">Relatório gerado em {new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );

  return portalRoot ? createPortal(content, portalRoot) : null;
};

export default DailyReportReceipt;
