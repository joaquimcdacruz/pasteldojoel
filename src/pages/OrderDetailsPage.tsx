"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Receipt as ReceiptIcon, Trash2 } from 'lucide-react';
import { Order, OrderStatus, OrderItem, MenuItem, Addon, Filling, MenuItemFilling, PaymentMethod, CategoryItem, OrderType, Payment, DEFAULT_CATEGORIES } from '@/types';
import { StorageService } from '@/services/storageService';
import { subscribeToCollection } from '@/integrations/firebase/config';
import OrderItemsList from '@/components/orders/OrderItemsList';
import OrderSummaryAndActions from '@/components/orders/OrderSummaryAndActions';
import ItemEditModal from '@/components/modals/ItemEditModal';
import MenuSelection from '@/components/orders/MenuSelection';
import PaymentModal from '@/components/modals/PaymentModal';
import Receipt from '@/components/orders/Receipt';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Item States
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState('');
  const [itemExtra, setItemExtra] = useState(0);
  const [itemOrderType, setItemOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [selectedFillingId, setSelectedFillingId] = useState<string | null>(null);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [logo, setLogo] = useState<string>('');
  const [fillings, setFillings] = useState<Filling[]>([]);
  const [menuFillings, setMenuFillings] = useState<MenuItemFilling[]>([]);

  useEffect(() => { 
    if (id) {
      loadOrder(id);

      // Subscribe to changes in Firebase Firestore
      const unsubOrders = subscribeToCollection('orders', () => loadOrder(id));
      const unsubMenu = subscribeToCollection('menu_items', (docs) => {
        StorageService.syncMenuFromSnapshot(docs);
        loadMenuData();
      });
      const unsubFillings = subscribeToCollection('fillings', (docs) => {
        StorageService.syncFillingsFromSnapshot(docs);
        loadMenuData();
      });

      const handleMenuChanged = () => loadMenuData();
      window.addEventListener('menu-changed', handleMenuChanged);

      loadMenuData();
      setLogo(StorageService.getLogo() || '');

      return () => {
        window.removeEventListener('menu-changed', handleMenuChanged);
        unsubOrders();
        unsubMenu();
        unsubFillings();
      };

    } else {
      const handleMenuChanged = () => loadMenuData();
      window.addEventListener('menu-changed', handleMenuChanged);
      loadMenuData();
      setLogo(StorageService.getLogo() || '');

      return () => {
        window.removeEventListener('menu-changed', handleMenuChanged);
      };
    }
  }, [id]);

  const loadMenuData = async () => {
    try {
        const [m, c, a, f, mf] = await Promise.all([
            StorageService.getProducts(),
            StorageService.getCategories(),
            StorageService.getAddons(),
            StorageService.getFillings(),
            StorageService.getMenuFillings()
        ]);
        
        const sortedCats = (c || []).sort((x, y) => {
            const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const indexX = DEFAULT_CATEGORIES.findIndex(cat => normalize(cat) === normalize(x.name));
            const indexY = DEFAULT_CATEGORIES.findIndex(cat => normalize(cat) === normalize(y.name));
            const sortX = indexX === -1 ? 999 : indexX;
            const sortY = indexY === -1 ? 999 : indexY;
            if (sortX !== sortY) return sortX - sortY;
            return (x.order || 0) - (y.order || 0) || x.name.localeCompare(y.name);
        });
        const sortedItems = (m || []).sort((x, y) => {
            const catX = sortedCats.find(c => c.id === x.category || c.name === x.category);
            const catY = sortedCats.find(c => c.id === y.category || c.name === y.category);
            const catOrderX = catX?.order ?? 999;
            const catOrderY = catY?.order ?? 999;
            if (catOrderX !== catOrderY) return catOrderX - catOrderY;
            if ((x.order ?? 999) !== (y.order ?? 999)) return (x.order ?? 999) - (y.order ?? 999);
            return x.name.localeCompare(y.name);
        });
        
        setMenuItems(sortedItems);
        setCategories(sortedCats);
        setAddons(a || []);
        setFillings(f || []);
        setMenuFillings(mf || []);
        if (sortedCats.length > 0) setSelectedCategory(sortedCats[0].name);
    } catch (e) {
        console.error("Erro ao carregar menu:", e);
    }
  };

  const updateOrder = async (newItems: OrderItem[], discount: number, newOrderType?: OrderType) => {
    if (!order) return;
    
    // Recalcular subtotal de forma robusta a partir dos itens originais
    const subtotal = newItems.reduce((acc, item) => {
      const unitPrice = Number(item.price) || 0;
      const extra = Number(item.extra) || 0;
      const qty = Number(item.quantity) || 0;
      return acc + ((unitPrice + extra) * qty);
    }, 0);

    const sortedItems = [...newItems].sort((a, b) => {
        const itemA = menuItems.find(m => m.id === a.menuItemId);
        const itemB = menuItems.find(m => m.id === b.menuItemId);
        const catA = categories.find(c => c.id === itemA?.category || c.name === itemA?.category);
        const catB = categories.find(c => c.id === itemB?.category || c.name === itemB?.category);
        const getPriority = (catName: string = '', itemName: string = '') => {
            const cat = catName.toLowerCase();
            const item = itemName.toLowerCase();
            if (cat.includes('pastel')) return 0;
            if (cat.includes('bebida') || cat.includes('suco') || cat.includes('refri') || 
                item.includes('ml') || item.includes('lata') || item.includes('litro') || item.includes('suco')) return 1000;
            return 500;
        };

        const prioA = getPriority(itemA?.category || a.category, a.name);
        const prioB = getPriority(itemB?.category || b.category, b.name);

        if (prioA !== prioB) return prioA - prioB;

        const catOrderA = catA?.order ?? 999;
        const catOrderB = catB?.order ?? 999;
        if (catOrderA !== catOrderB) return catOrderA - catOrderB;
        
        const itemOrderA = itemA?.order ?? 999;
        const itemOrderB = itemB?.order ?? 999;
        if (itemOrderA !== itemOrderB) return itemOrderA - itemOrderB;
        
        return (a.name || '').localeCompare(b.name || '');
    });

    const updatedOrder: Order = { 
        ...order, 
        items: sortedItems, 
        subtotal: Number(subtotal.toFixed(2)), 
        discount: Number(Number(discount || 0).toFixed(2)), 
        total: Number(Math.max(0, subtotal - (discount || 0)).toFixed(2)),
        orderType: newOrderType || order.orderType
    };
    await StorageService.saveOrder(updatedOrder);
    setOrder(updatedOrder);
  };

  const loadOrder = async (orderId: string) => {
    setIsLoading(true);
    try {
        // FAST PATH: Get the order from local storage immediately
        const quickOrder = await StorageService.getOrderById(orderId);
        if (quickOrder) {
          setOrder(quickOrder);
          // If we have it locally, we can stop the main loading spinner early
          setIsLoading(false); 
        }

        // SLOW PATH: Load metadata and sync (parallel)
        const [products, cats] = await Promise.all([
            StorageService.getProducts(),
            StorageService.getCategories()
        ]);
        
        // If we didn't have it locally or need to refresh from DB
        const ordersList = await StorageService.getOrders();
        const found = ordersList.find(o => o && o.id === orderId);
        
        if (found) {
            if (!Array.isArray(found.items)) found.items = [];
            try {
                found.items.sort((a, b) => {
                    const itemA = products.find(m => m.id === a?.menuItemId);
                    const itemB = products.find(m => m.id === b?.menuItemId);
                    const catA = cats.find(c => c.id === itemA?.category || c.name === itemA?.category);
                    const catB = cats.find(c => c.id === itemB?.category || c.name === itemB?.category);
                    const getPriority = (catName: string = '', itemName: string = '') => {
                        const cat = catName.toLowerCase();
                        const item = itemName.toLowerCase();
                        if (cat.includes('pastel')) return 0;
                        if (cat.includes('bebida') || cat.includes('suco') || cat.includes('refri') || 
                            item.includes('ml') || item.includes('lata') || item.includes('litro')) return 1000;
                        return 500;
                    };

                    const prioA = getPriority(itemA?.category || a?.category, a?.name);
                    const prioB = getPriority(itemB?.category || b?.category, b?.name);

                    if (prioA !== prioB) return prioA - prioB;

                    const catOrderA = catA?.order ?? 999;
                    const catOrderB = catB?.order ?? 999;
                    if (catOrderA !== catOrderB) return catOrderA - catOrderB;
                    const itemOrderA = itemA?.order ?? 999;
                    const itemOrderB = itemB?.order ?? 999;
                    if (itemOrderA !== itemOrderB) return itemOrderA - itemOrderB;
                    return (a?.name || '').localeCompare(b?.name || '');
                });
            } catch (e) {}
            setOrder(found);
        }
    } catch (e) {
        console.error("Erro ao carregar pedido:", e);
    } finally {
        setIsLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, delta: number) => {
    if (!order || order.status === OrderStatus.CLOSED) return;
    const newItems = order.items.map(item => {
      if (item.id === itemId) {
        let maxStock: number | null = null;
        if (item.fillingId) {
          const filling = fillings.find(f => f.id === item.fillingId);
          maxStock = filling?.stockQuantity ?? null;
        } else {
          const product = menuItems.find(p => p.id === item.menuItemId);
          maxStock = product?.stockQuantity ?? null;
        }

        const newQty = item.quantity + delta;
        if (delta > 0 && maxStock !== null && newQty > maxStock) return item;
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    });
    updateOrder(newItems, order.discount);
  };


  const handleDeleteItem = async (itemId: string) => {
    if (!order || order.status === OrderStatus.CLOSED) return;
    const newItems = order.items.filter(item => item.id !== itemId);
    updateOrder(newItems, order.discount);
  };

  const handleEditItem = (item: OrderItem) => {
    if (order?.status === OrderStatus.CLOSED) return;
    setEditingItem(item);
    setSelectedMenuItem(null);
    setItemQuantity(item.quantity);
    setItemNotes(item.notes || '');
    const totalAddonsPrice = (item.addons || []).reduce((sum, a) => sum + a.price, 0);
    const fillingPrice = item.fillingId ? (fillings.find(f => f.id === item.fillingId)?.price || 0) : 0;
    setItemExtra((item.extra || 0) - totalAddonsPrice - fillingPrice);
    setItemOrderType(item.orderType || order?.orderType || OrderType.DINE_IN);
    setSelectedAddons(item.addons || []);
    setSelectedFillingId(item.fillingId || null);
    setIsItemModalOpen(true);
  };



  const addItemFromMenu = async (menuItem: MenuItem) => {
    if (order?.status === OrderStatus.CLOSED) return;
    setEditingItem(null);
    setSelectedMenuItem(menuItem);
    setItemQuantity(1);
    setItemNotes('');
    setItemExtra(0);
    setItemOrderType(order?.orderType || OrderType.DINE_IN);
    setSelectedAddons([]);
    setSelectedFillingId(null);
    setIsItemModalOpen(true);
  };


  const toggleAddon = (addon: Addon) => {
    const isSelected = selectedAddons.find(a => a.id === addon.id);
    if (isSelected) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleSaveItem = async () => {
    if (!order) return;
    let newItems = [...order.items];
    const totalAddonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const selectedFilling = selectedFillingId ? fillings.find(f => f.id === selectedFillingId) : null;
    const fillingPrice = selectedFilling?.price || 0;
    
    const itemData = {
      quantity: itemQuantity || 1,
      notes: itemNotes,
      category: editingItem?.category || selectedMenuItem?.category || '',
      orderType: itemOrderType,
      extra: (itemExtra || 0) + totalAddonsPrice + fillingPrice,
      addons: selectedAddons,
      fillingId: selectedFillingId || undefined
    };

    if (editingItem) {
      newItems = newItems.map(i => i.id === editingItem.id ? { ...i, ...itemData } : i);
    } else if (selectedMenuItem) {
      newItems.push({
        id: StorageService.generateId(),
        menuItemId: selectedMenuItem.id,
        name: selectedMenuItem.name,
        price: selectedMenuItem.price || 0,
        ...itemData
      });
    }
    updateOrder(newItems, order.discount, itemData.orderType);
    setIsItemModalOpen(false);
  };

  const handleCloseOrder = async (payments: Payment[]) => {
    if (!order) return;
    const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
    const cashEntry = payments.find(p => p.method === PaymentMethod.CASH);
    const primaryMethod = payments.length === 1
      ? payments[0].method
      : PaymentMethod.MIXED;
    const updatedOrder: Order = {
        ...order,
        status: OrderStatus.CLOSED,
        closedAt: Date.now(),
        payments,
        paymentMethod: primaryMethod,
        paymentAmountReceived: totalReceived,
        change: cashEntry ? Math.max(0, totalReceived - order.total) : 0
    };
    await StorageService.saveOrder(updatedOrder);
    setOrder(updatedOrder);
    setIsPaymentModalOpen(false);
    
    // Auto-print and quick redirect
    // Damos um tempo menor para renderizar o estado 'FECHADO' no recibo antes de imprimir
    setTimeout(() => { 
        window.print(); 
        // Navegar de volta e abrir modal de nova comanda
        navigate('/', { state: { openNewOrder: true } });
    }, 300);
  };

  const handleDeleteOrder = async () => {
    if (!order || isDeleting) return;
    try {
      setIsDeleting(true);
      await StorageService.deleteOrder(order.id);
      setIsDeleteModalOpen(false);
      navigate('/', { replace: true });
    } catch (e) {
      console.error("Erro ao excluir comanda:", e);
      setIsDeleting(false);
      alert("Erro ao excluir comanda. Tente novamente.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-1rem)] w-full flex flex-col items-center justify-center bg-slate-50 backdrop-blur-sm rounded-[2.5rem] border border-black/[0.05] animate-in fade-in duration-200">
        <Loader2 className="animate-spin w-12 h-12 text-brand-500 mb-4" />
        <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Carregando Comanda...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="h-[calc(100vh-1rem)] w-full flex flex-col items-center justify-center bg-black/5 backdrop-blur-sm rounded-[2.5rem] border border-black/[0.05] gap-8">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
          <ReceiptIcon size={40} className="text-red-500/50" />
        </div>
        <div className="text-center">
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight mb-2">Comanda não encontrada</h3>
            <p className="text-slate-600 font-medium max-w-xs mx-auto">Esta comanda pode ter sido removida ou você está tentando acessar uma comanda inexistente.</p>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="px-10 py-5 bg-brand-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-900/10 hover:bg-brand-500 transition-all active:scale-[0.98]"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  const isOpen = order.status === OrderStatus.OPEN;

  return (
    <div className="min-h-0 lg:h-[calc(100vh-1rem)] print:h-auto print:block print:overflow-visible flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Receipt order={order} logo={logo} fillings={fillings} />


      <div className="flex justify-between items-center bg-slate-100 backdrop-blur-xl px-4 py-3 rounded-[1.5rem] border border-black/[0.05] mb-3 shadow-sm print:hidden shrink-0">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 font-black hover:text-slate-900 transition-all duration-300 text-[10px] uppercase tracking-[0.2em] group">
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform"/> Painel 
        </button>
        <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-black font-display text-slate-900 flex items-center gap-3 uppercase italic tracking-tight">
                {(order.customerName || '').replace(/^X\s*/i, '')}
            </h2>
        </div>
        <div className="flex items-center gap-3">
            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border transition-all duration-500 ${isOpen ? 'bg-green-600/10 text-green-600 border-green-500/20 shadow-sm' : 'bg-slate-200 text-slate-600 border-black/5 uppercase'}`}>
                {isOpen ? 'Comanda Ativa' : 'Comanda Encerrada'}
            </span>
            {order.orderType && (
              <span className={`flex px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border items-center gap-1.5 ${
                order.orderType === OrderType.TAKEAWAY
                  ? 'bg-blue-600/10 text-blue-400 border-blue-500/20 shadow-lg shadow-blue-500/10'
                  : 'bg-brand-600/10 text-brand-500 border-brand-600/20'
              }`}>
                {order.orderType}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100/50 rounded-xl transition-all"
              title="Excluir comanda"
            >
              <Trash2 size={18} />
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:overflow-hidden print:hidden">
        <div className="w-full lg:w-[320px] flex flex-col gap-3 lg:overflow-hidden text-slate-900 shrink-0">
          <div className="max-h-[40vh] lg:max-h-none lg:flex-1 lg:overflow-hidden">
            <OrderItemsList 
              order={order} 
              onUpdateQuantity={handleUpdateQuantity} 
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              fillings={fillings}
            />

          </div>

          <div className="bg-white backdrop-blur-xl rounded-[2.5rem] p-3 border border-black/[0.05] shadow-sm border-t-2 border-t-brand-600">
            <OrderSummaryAndActions 
                order={order}
                onUpdateStatus={async (status: OrderStatus) => {
                    if (status === OrderStatus.CLOSED) {
                        setIsPaymentModalOpen(true);
                    } else {
                        const updated = { ...order, status, closedAt: undefined };
                        await StorageService.saveOrder(updated);
                        setOrder(updated);
                    }
                }}
                onSave={() => alert('Alterações registradas com sucesso!')}
                onDelete={() => setIsDeleteModalOpen(true)}
                onUpdateDiscount={(amount) => updateOrder(order.items, amount)}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:overflow-hidden min-h-[500px] lg:min-h-0">
          {isOpen ? (
            <MenuSelection 
                menuItems={menuItems}
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                addItemToOrder={addItemFromMenu}
                fillings={fillings}
                menuFillings={menuFillings}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-10 text-center bg-slate-50 backdrop-blur-xl rounded-[2.5rem] border border-black/[0.05] shadow-sm">
                <ReceiptIcon size={64} className="mb-6 opacity-10 text-slate-900 animate-pulse"/>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-[0.2em] mb-2">Comanda Finalizada</h3>
                <p className="text-xs text-slate-600 max-w-xs font-medium">Este pedido já foi processado e encerrado. Reative a comanda se precisar realizar alterações.</p>
            </div>
          )}
        </div>
      </div>

      <ItemEditModal 
        isItemModalOpen={isItemModalOpen}
        setIsItemModalOpen={setIsItemModalOpen}
        editingItem={editingItem}
        selectedMenuItem={selectedMenuItem}
        itemQuantity={itemQuantity}
        setItemQuantity={setItemQuantity}
        itemNotes={itemNotes}
        setItemNotes={setItemNotes}
        itemExtra={itemExtra}
        setItemExtra={setItemExtra}
        addons={addons}
        selectedAddons={selectedAddons}
        onToggleAddon={toggleAddon}
        handleSaveItem={handleSaveItem}
        itemOrderType={itemOrderType}
        setItemOrderType={setItemOrderType}
        fillings={fillings}
        productFillings={menuFillings}
        selectedFillingId={selectedFillingId}
        setSelectedFillingId={setSelectedFillingId}
      />


      <PaymentModal 
        isPaymentModalOpen={isPaymentModalOpen}
        setIsPaymentModalOpen={setIsPaymentModalOpen}
        order={order}
        onConfirm={handleCloseOrder}
      />

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        title="Excluir Comanda"
        message="Tem certeza que deseja excluir esta comanda permanentemente? Esta ação não pode ser desfeita."
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteOrder}
        onCancel={() => !isDeleting && setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

export default OrderDetailsPage;