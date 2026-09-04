"use client";

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Order } from '@/types'; // Updated import path

interface OrderHeaderProps {
  order: Order;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({ order }) => {
  const navigate = useNavigate();

  return (
    <div className="p-5 bg-gray-900 text-white flex items-center justify-between shadow-md z-10 print-hidden">
      <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors p-1 -ml-1">
        <ArrowLeft size={20} />
      </button>
      <div className="text-center flex-1 pr-5">
        <div className="flex items-center justify-center gap-2">
          <span className="font-bold text-lg truncate">{order.customerName}</span>
        </div>
        <p className="text-[10px] text-gray-400 font-mono opacity-80">
          #{order.id.slice(0, 8).toUpperCase()} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default OrderHeader;