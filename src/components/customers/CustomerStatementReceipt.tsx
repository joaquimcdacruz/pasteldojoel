"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { MonthlyCustomer, Order, CustomerPaymentRecord, CustomerFiadoOrder, OrderType } from '@/types';

interface CustomerStatementReceiptProps {
  customer: MonthlyCustomer;
  orders: Order[];
  payments: CustomerPaymentRecord[];
  type?: 'STATEMENT' | 'PAYMENT_RECEIPT' | 'FIADO_ORDER_RECEIPT';
  latestPayment?: CustomerPaymentRecord;
  selectedFiadoOrder?: CustomerFiadoOrder | Order;
}

const CustomerStatementReceipt: React.FC<CustomerStatementReceiptProps> = ({
  customer,
  orders,
  payments,
  type = 'STATEMENT',
  latestPayment,
  selectedFiadoOrder
}) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const fmt = (val: number) => 
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Calculate consumed total
  const totalConsumed = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const portalRoot = typeof document !== 'undefined' ? document.getElementById('print-portal') : null;

  const content = (
    <div 
      id="print-customer-receipt" 
      className="hidden print:block bg-white text-black text-[13px] font-sans leading-tight p-0 pb-3 box-border"
      style={{ width: '78mm', minWidth: '78mm', maxWidth: '78mm' }}
    >
      {/* Header */}
      <div className="text-center mb-1">
        <h1 className="text-xl font-black uppercase tracking-wider">PASTELARIA DO JOEL</h1>
        <p className="text-[10px] uppercase font-bold text-gray-800">Controle de Mensalistas / Fiado</p>
        <p className="text-[11px] font-black mt-0.5 uppercase border-b border-black pb-1">
          {type === 'PAYMENT_RECEIPT' 
            ? 'COMPROVANTE DE PAGAMENTO' 
            : type === 'FIADO_ORDER_RECEIPT'
            ? 'COMPROVANTE DE COMANDA FIADO'
            : 'EXTRATO DE CONTA CORRENTE'}
        </p>
      </div>

      <div className="border-b border-black py-1 my-1 text-[12px] space-y-0.5">
        <div className="flex justify-between">
          <span className="font-bold">CLIENTE:</span>
          <span className="font-black uppercase">{customer.name}</span>
        </div>
        {customer.company && (
          <div className="flex justify-between">
            <span>EMPRESA/REF:</span>
            <span>{customer.company}</span>
          </div>
        )}
        {customer.phone && (
          <div className="flex justify-between">
            <span>TELEFONE:</span>
            <span>{customer.phone}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>EMISSÃO:</span>
          <span>{dateStr} às {timeStr}</span>
        </div>
      </div>

      {type === 'FIADO_ORDER_RECEIPT' && selectedFiadoOrder ? (
        <div className="my-1 py-1 space-y-1.5">
          <div className="bg-gray-100 p-1 border border-black/10 text-[11px] space-y-0.5">
            <div className="flex justify-between font-black">
              <span>COMANDA:</span>
              <span>#{('orderId' in selectedFiadoOrder ? selectedFiadoOrder.orderId : selectedFiadoOrder.id).slice(0, 6).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>DATA DO PEDIDO:</span>
              <span>
                {new Date(selectedFiadoOrder.createdAt).toLocaleDateString('pt-BR')} {new Date(selectedFiadoOrder.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {selectedFiadoOrder.sellerName && (
              <div className="flex justify-between">
                <span>ATENDENTE:</span>
                <span>{selectedFiadoOrder.sellerName}</span>
              </div>
            )}
            {selectedFiadoOrder.orderType && (
              <div className="flex justify-between">
                <span>TIPO:</span>
                <span>{selectedFiadoOrder.orderType === OrderType.TAKEAWAY ? 'PARA VIAGEM' : 'NO LOCAL'}</span>
              </div>
            )}
          </div>

          <div className="my-1 border-t border-b border-black py-1">
            <div className="font-black text-[11px] uppercase mb-1 flex justify-between">
              <span>ITENS CONSUMIDOS</span>
              <span>VALOR</span>
            </div>
            <div className="space-y-1">
              {(selectedFiadoOrder.items || []).map((item, idx) => (
                <div key={idx} className="text-[12px]">
                  <div className="flex justify-between font-bold">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{fmt(item.price * item.quantity)}</span>
                  </div>
                  {item.addons && item.addons.length > 0 && (
                    <div className="text-[10px] pl-3 text-gray-800">
                      + {item.addons.map(a => `${a.name} (${fmt(a.price)})`).join(', ')}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-[10px] pl-3 italic">
                      Obs: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-0.5 text-[12px]">
            <div className="flex justify-between font-bold">
              <span>TOTAL DA COMANDA:</span>
              <span>{fmt(selectedFiadoOrder.total)}</span>
            </div>
            <div className="flex justify-between font-black text-[13px] bg-black text-white p-1 my-0.5">
              <span>VALOR LANÇADO EM FIADO:</span>
              <span>{fmt('fiadoAmount' in selectedFiadoOrder ? selectedFiadoOrder.fiadoAmount : selectedFiadoOrder.total)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-black">
              <span>SALDO DEVEDOR ATUAL:</span>
              <span>{fmt(customer.balance)}</span>
            </div>
          </div>
        </div>
      ) : type === 'PAYMENT_RECEIPT' && latestPayment ? (
        <div className="my-1 py-1 border-b border-black space-y-1">
          <div className="text-center font-black text-sm uppercase">PAGAMENTO RECEBIDO</div>
          <div className="flex justify-between font-black text-base my-0.5">
            <span>VALOR PAGO:</span>
            <span>{fmt(latestPayment.amount)}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span>FORMA DE PAGAMENTO:</span>
            <span className="font-bold uppercase">{latestPayment.method}</span>
          </div>
          {latestPayment.notes && (
            <div className="text-[11px] italic">
              Obs: {latestPayment.notes}
            </div>
          )}
          <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
            <span>SALDO RESTANTE:</span>
            <span>{fmt(customer.balance)}</span>
          </div>
        </div>
      ) : (
        <>
          {/* Recent Orders List */}
          <div className="my-1">
            <div className="font-black text-[11px] uppercase mb-1 flex justify-between border-b border-black pb-0.5">
              <span>HISTÓRICO DE CONSUMO</span>
              <span>VALOR</span>
            </div>

            {orders.length === 0 ? (
              <p className="text-[11px] text-gray-500 py-1 italic">Nenhum consumo registrado.</p>
            ) : (
              <div className="space-y-1">
                {orders.slice(0, 25).map(o => (
                  <div key={o.id} className="text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span>
                        {new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - Comanda #{o.id.slice(0, 5).toUpperCase()}
                      </span>
                      <span>{fmt(o.total)}</span>
                    </div>
                    {o.items && o.items.length > 0 && (
                      <div className="text-[10px] text-gray-700 pl-2">
                        {o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between font-bold text-[12px] pt-1 mt-1 border-t border-black">
              <span>TOTAL CONSUMIDO:</span>
              <span>{fmt(totalConsumed)}</span>
            </div>
          </div>

          {/* Payments History */}
          {payments.length > 0 && (
            <div className="my-1 border-t border-black pt-1.5">
              <div className="font-black text-[11px] uppercase mb-1 flex justify-between border-b border-black pb-0.5">
                <span>PAGAMENTOS EFETUADOS</span>
                <span>VALOR</span>
              </div>
              <div className="space-y-1">
                {payments.slice(0, 15).map(p => (
                  <div key={p.id} className="flex justify-between text-[11px]">
                    <span>
                      {new Date(p.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ({p.method})
                    </span>
                    <span className="font-bold">-{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-[12px] pt-1 mt-1 border-t border-black">
                <span>TOTAL PAGO:</span>
                <span>-{fmt(totalPaid)}</span>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="border-t-2 border-black my-1.5 pt-1 space-y-0.5">
            <div className="flex justify-between text-sm font-black">
              <span>SALDO DEVEDOR ATUAL:</span>
              <span>{fmt(customer.balance)}</span>
            </div>
            {customer.creditLimit !== undefined && customer.creditLimit > 0 && (
              <div className="flex justify-between text-[11px] text-gray-700">
                <span>Limite Autorizado:</span>
                <span>{fmt(customer.creditLimit)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Signature slip */}
      <div className="mt-5 pt-3 border-t border-black text-center text-[11px]">
        <div className="w-48 mx-auto border-b border-black mb-1" />
        <p className="font-bold uppercase text-[10px]">Assinatura do Cliente</p>
        <p className="text-[9px] text-gray-700 mt-1">Obrigado pela preferência!</p>
      </div>
    </div>
  );

  return portalRoot ? createPortal(content, portalRoot) : null;
};

export default CustomerStatementReceipt;
