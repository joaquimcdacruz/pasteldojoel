"use client";

import React from 'react';
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

  return (
    <div id="print-customer-receipt" className="hidden print:block bg-white text-black w-full text-[13px] font-mono leading-tight p-2">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold uppercase tracking-wider">Pastelaria do Joel</h2>
        <p className="text-xs text-gray-700">Controle de Mensalistas / Fiado</p>
        <p className="text-xs font-bold mt-1">
          {type === 'PAYMENT_RECEIPT' 
            ? 'COMPROVANTE DE PAGAMENTO' 
            : type === 'FIADO_ORDER_RECEIPT'
            ? 'COMPROVANTE DE COMANDA FIADO'
            : 'EXTRATO DE CONTA CORRENTE'}
        </p>
      </div>

      <div className="border-t border-b border-dashed border-black py-1.5 my-1.5 text-xs space-y-0.5">
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
        <div className="my-2 py-1 space-y-2">
          <div className="bg-gray-100 p-1.5 rounded text-xs space-y-1">
            <div className="flex justify-between font-bold">
              <span>COMANDA:</span>
              <span>#{('orderId' in selectedFiadoOrder ? selectedFiadoOrder.orderId : selectedFiadoOrder.id).slice(0, 6).toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>DATA DO PEDIDO:</span>
              <span>
                {new Date(selectedFiadoOrder.createdAt).toLocaleDateString('pt-BR')} às {new Date(selectedFiadoOrder.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {selectedFiadoOrder.sellerName && (
              <div className="flex justify-between text-[11px]">
                <span>ATENDENTE:</span>
                <span>{selectedFiadoOrder.sellerName}</span>
              </div>
            )}
            {selectedFiadoOrder.orderType && (
              <div className="flex justify-between text-[11px]">
                <span>TIPO:</span>
                <span>{selectedFiadoOrder.orderType === OrderType.TAKEAWAY ? 'PARA VIAGEM' : 'NO LOCAL'}</span>
              </div>
            )}
          </div>

          <div className="my-2 border-t border-b border-dotted border-black py-1">
            <div className="font-bold text-xs uppercase mb-1 flex justify-between">
              <span>ITENS CONSUMIDOS</span>
              <span>VALOR</span>
            </div>
            <div className="space-y-1.5">
              {(selectedFiadoOrder.items || []).map((item, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex justify-between font-bold">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{fmt(item.price * item.quantity)}</span>
                  </div>
                  {item.addons && item.addons.length > 0 && (
                    <div className="text-[11px] text-gray-700 pl-3">
                      + {item.addons.map(a => `${a.name} (${fmt(a.price)})`).join(', ')}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-[10px] text-gray-600 italic pl-3">
                      Obs: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between font-bold">
              <span>TOTAL DA COMANDA:</span>
              <span>{fmt(selectedFiadoOrder.total)}</span>
            </div>
            <div className="flex justify-between font-black text-sm bg-black text-white p-1 rounded">
              <span>VALOR LANÇADO EM FIADO:</span>
              <span>{fmt('fiadoAmount' in selectedFiadoOrder ? selectedFiadoOrder.fiadoAmount : selectedFiadoOrder.total)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-dotted border-black">
              <span>SALDO DEVEDOR ATUAL DO CLIENTE:</span>
              <span>{fmt(customer.balance)}</span>
            </div>
          </div>
        </div>
      ) : type === 'PAYMENT_RECEIPT' && latestPayment ? (
        <div className="my-2 py-2 border-b border-dashed border-black space-y-1">
          <div className="text-center font-bold text-sm">PAGAMENTO RECEBIDO</div>
          <div className="flex justify-between font-black text-base my-1">
            <span>VALOR PAGO:</span>
            <span>{fmt(latestPayment.amount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>FORMA DE PAGAMENTO:</span>
            <span className="font-bold">{latestPayment.method}</span>
          </div>
          {latestPayment.notes && (
            <div className="text-xs italic text-gray-700">
              Obs: {latestPayment.notes}
            </div>
          )}
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-dotted border-black">
            <span>SALDO RESTANTE:</span>
            <span>{fmt(customer.balance)}</span>
          </div>
        </div>
      ) : (
        <>
          {/* Recent Orders List */}
          <div className="my-2">
            <div className="font-bold text-xs uppercase mb-1 flex justify-between border-b border-dotted border-black pb-0.5">
              <span>CONSUMO / COMANDAS</span>
              <span>VALOR</span>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-gray-500 py-1">Nenhum consumo registrado.</p>
            ) : (
              <div className="space-y-1">
                {orders.slice(0, 25).map(o => (
                  <div key={o.id} className="text-xs">
                    <div className="flex justify-between font-bold">
                      <span>
                        {new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - Comanda #{o.id.slice(0, 5).toUpperCase()}
                      </span>
                      <span>{fmt(o.total)}</span>
                    </div>
                    {o.items && o.items.length > 0 && (
                      <div className="text-[11px] text-gray-700 pl-2">
                        {o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between font-bold text-xs pt-1 mt-1 border-t border-dotted border-black">
              <span>TOTAL CONSUMIDO:</span>
              <span>{fmt(totalConsumed)}</span>
            </div>
          </div>

          {/* Payments History */}
          {payments.length > 0 && (
            <div className="my-2 border-t border-dashed border-black pt-2">
              <div className="font-bold text-xs uppercase mb-1 flex justify-between border-b border-dotted border-black pb-0.5">
                <span>PAGAMENTOS EFETUADOS</span>
                <span>VALOR</span>
              </div>
              <div className="space-y-1">
                {payments.slice(0, 15).map(p => (
                  <div key={p.id} className="flex justify-between text-xs">
                    <span>
                      {new Date(p.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ({p.method})
                    </span>
                    <span className="font-bold text-green-700">-{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 mt-1 border-t border-dotted border-black">
                <span>TOTAL PAGO:</span>
                <span className="text-green-800">-{fmt(totalPaid)}</span>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="border-t-2 border-black my-2 pt-1.5 space-y-1">
            <div className="flex justify-between text-sm font-black">
              <span>SALDO DEVEDOR ATUAL:</span>
              <span className={customer.balance > 0 ? 'text-black' : 'text-green-800'}>
                {fmt(customer.balance)}
              </span>
            </div>
            {customer.creditLimit !== undefined && customer.creditLimit > 0 && (
              <div className="flex justify-between text-[11px] text-gray-600">
                <span>Limite Autorizado:</span>
                <span>{fmt(customer.creditLimit)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Signature slip */}
      <div className="mt-6 pt-4 border-t border-dashed border-black text-center text-xs">
        <div className="w-48 mx-auto border-b border-black mb-1" />
        <p className="font-bold uppercase text-[10px]">Assinatura do Cliente</p>
        <p className="text-[9px] text-gray-500 mt-1">Obrigado pela preferência!</p>
      </div>
    </div>
  );
};

export default CustomerStatementReceipt;
