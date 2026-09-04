"use client";

import { db, isFirebaseConfigured, subscribeToCollection } from '@/integrations/firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  writeBatch,
  onSnapshot 
} from 'firebase/firestore';
import { 
  Order, MenuItem, CategoryItem, Addon, Filling, MenuItemFilling, CashRegisterSession, 
  DEFAULT_CATEGORIES, OrderStatus, PaymentMethod, CashTransaction, CashTransactionType, OrderType, CashBreakdown,
  UserProfile, MonthlyCustomer, CustomerFiadoOrder
} from '@/types';
import { 
  DEFAULT_INITIAL_PRODUCTS, 
  DEFAULT_INITIAL_FILLINGS, 
  DEFAULT_INITIAL_ADDONS,
  DEFAULT_INITIAL_CATEGORIES,
  DEFAULT_INITIAL_MENU_FILLINGS 
} from '@/data/initialData';

const LS_KEYS = {
  ORDERS: 'pastelaria_orders',
  MENU: 'pastelaria_menu',
  CATEGORIES: 'pastelaria_categories',
  ADDONS: 'pastelaria_addons',
  FILLINGS: 'pastelaria_fillings',
  MENU_FILLINGS: 'pastelaria_menu_fillings',
  CASH_SESSIONS: 'pastelaria_cash_sessions',
  LOGO: 'pastelaria_logo',
  REPORT_PASSWORD: 'pastelaria_report_password',
  PROFILE: 'pastelaria_user_profile',
  CUSTOMERS: 'pastelaria_customers'
};

let globalSyncInitialized = false;
let globalSyncUnsubscribers: (() => void)[] = [];

export const StorageService = {
  isFirebaseConfigured: () => isFirebaseConfigured(),

  generateId: () => {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  },

  // ─── Real-time Snapshot Processors ─────────────────────────────────────

  syncOrdersFromSnapshot: (docs: any[]): Order[] => {
    const deletedIds = StorageService.getDeletedOrderIds();
    const firestoreOrders: Order[] = [];
    (docs || []).forEach(data => {
      if (!data || !data.id || deletedIds.has(data.id)) return;
      firestoreOrders.push({
        id: data.id,
        customerName: data.customerName || 'Cliente',
        status: data.status || OrderStatus.OPEN,
        createdAt: data.createdAt || Date.now(),
        closedAt: data.closedAt || null,
        discount: Number(data.discount || 0),
        subtotal: Number(data.subtotal || 0),
        total: Number(data.total || 0),
        paymentMethod: data.paymentMethod || null,
        paymentAmountReceived: data.paymentAmountReceived ? Number(data.paymentAmountReceived) : null,
        change: data.change ? Number(data.change) : null,
        orderType: data.orderType as OrderType | undefined,
        createdBy: data.createdBy || null,
        sellerName: data.sellerName || null,
        stockDecremented: !!data.stockDecremented,
        fiadoAccounted: !!data.fiadoAccounted,
        payments: data.payments || [],
        items: Array.isArray(data.items) ? data.items : [],
        syncStatus: 'synced',
        updatedAt: data.updatedAt || Date.now()
      });
    });

    const syncedMap = new Map<string, Order>();
    firestoreOrders.forEach(o => syncedMap.set(o.id, o));
    try {
      const currentLocal: Order[] = JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || '[]');
      currentLocal.forEach(o => {
        if (o && o.id && !deletedIds.has(o.id) && o.syncStatus === 'pending' && !syncedMap.has(o.id)) {
          syncedMap.set(o.id, o);
        }
      });
    } catch {}

    const mergedOrders = Array.from(syncedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(mergedOrders));
    window.dispatchEvent(new CustomEvent('orders-changed', { detail: mergedOrders }));
    return mergedOrders;
  },

  syncMenuFromSnapshot: (docs: any[]): MenuItem[] => {
    let remoteItems: MenuItem[] = (docs || []).map(data => ({
      id: data.id,
      name: data.name || '',
      price: Number(data.price || 0),
      category: data.category || 'Geral',
      description: data.description || '',
      imageUrl: data.imageUrl || '',
      inStock: data.inStock !== false,
      stockQuantity: data.stockQuantity !== undefined ? Number(data.stockQuantity) : undefined,
      order: Number(data.order ?? 999),
      syncStatus: 'synced' as const,
      updatedAt: data.updatedAt || Date.now()
    }));

    // If Firestore has only partial items (< 10), merge with DEFAULT_INITIAL_PRODUCTS
    if (remoteItems.length < 10) {
      const existingIds = new Set(remoteItems.map(i => i.id));
      const existingNames = new Set(remoteItems.map(i => i.name.trim().toLowerCase()));
      let missingAdded = 0;
      DEFAULT_INITIAL_PRODUCTS.forEach(defItem => {
        if (!existingIds.has(defItem.id) && !existingNames.has(defItem.name.trim().toLowerCase())) {
          remoteItems.push({ ...defItem, syncStatus: 'synced' });
          missingAdded++;
        }
      });
      // Push missing to Firebase in background so Firestore gets the full menu
      if (missingAdded > 0 && isFirebaseConfigured() && db && navigator.onLine) {
        try {
          const batch = writeBatch(db);
          let count = 0;
          DEFAULT_INITIAL_PRODUCTS.forEach(p => {
            if (!existingIds.has(p.id) && !existingNames.has(p.name.trim().toLowerCase()) && count < 400) {
              batch.set(doc(db, 'menu_items', p.id), { ...p, updatedAt: Date.now() }, { merge: true });
              count++;
            }
          });
          if (count > 0) batch.commit().catch(() => {});
        } catch (e) {}
      }
    }

    remoteItems.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    localStorage.setItem(LS_KEYS.MENU, JSON.stringify(remoteItems));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: remoteItems }));
    return remoteItems;
  },

  syncCategoriesFromSnapshot: (docs: any[]): CategoryItem[] => {
    let remoteCats: CategoryItem[] = (docs || []).map(data => ({
      id: data.id,
      name: data.name || '',
      order: Number(data.order ?? 0),
      syncStatus: 'synced' as const,
      updatedAt: data.updatedAt || Date.now()
    }));

    if (remoteCats.length < 7) {
      const existingIds = new Set(remoteCats.map(c => c.id));
      const existingNames = new Set(remoteCats.map(c => c.name.trim().toUpperCase()));
      let missingAdded = 0;
      DEFAULT_INITIAL_CATEGORIES.forEach(defCat => {
        if (!existingIds.has(defCat.id) && !existingNames.has(defCat.name.trim().toUpperCase())) {
          remoteCats.push({ ...defCat, syncStatus: 'synced' });
          missingAdded++;
        }
      });
      if (missingAdded > 0 && isFirebaseConfigured() && db && navigator.onLine) {
        try {
          const batch = writeBatch(db);
          DEFAULT_INITIAL_CATEGORIES.forEach(c => {
            if (!existingIds.has(c.id) && !existingNames.has(c.name.trim().toUpperCase())) {
              batch.set(doc(db, 'categories', c.id), { ...c, updatedAt: Date.now() }, { merge: true });
            }
          });
          batch.commit().catch(() => {});
        } catch (e) {}
      }
    }

    remoteCats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(remoteCats));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: remoteCats }));
    return remoteCats;
  },

  syncFillingsFromSnapshot: (docs: any[]): Filling[] => {
    let remoteFillings: Filling[] = (docs || []).map(data => ({
      id: data.id,
      name: data.name || '',
      price: Number(data.price || 0),
      inStock: data.inStock !== false,
      stockQuantity: data.stockQuantity !== undefined ? Number(data.stockQuantity) : undefined,
      syncStatus: 'synced' as const,
      updatedAt: data.updatedAt || Date.now()
    }));

    if (remoteFillings.length < 5) {
      const existingIds = new Set(remoteFillings.map(f => f.id));
      const existingNames = new Set(remoteFillings.map(f => f.name.trim().toLowerCase()));
      let missingAdded = 0;
      DEFAULT_INITIAL_FILLINGS.forEach(defFilling => {
        if (!existingIds.has(defFilling.id) && !existingNames.has(defFilling.name.trim().toLowerCase())) {
          remoteFillings.push({ ...defFilling, syncStatus: 'synced' });
          missingAdded++;
        }
      });
      if (missingAdded > 0 && isFirebaseConfigured() && db && navigator.onLine) {
        try {
          const batch = writeBatch(db);
          DEFAULT_INITIAL_FILLINGS.forEach(f => {
            if (!existingIds.has(f.id) && !existingNames.has(f.name.trim().toLowerCase())) {
              batch.set(doc(db, 'fillings', f.id), { ...f, updatedAt: Date.now() }, { merge: true });
            }
          });
          batch.commit().catch(() => {});
        } catch (e) {}
      }
    }

    localStorage.setItem(LS_KEYS.FILLINGS, JSON.stringify(remoteFillings));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: remoteFillings }));
    return remoteFillings;
  },

  syncAddonsFromSnapshot: (docs: any[]): Addon[] => {
    let remoteAddons: Addon[] = (docs || []).map(data => ({
      id: data.id,
      name: data.name || '',
      price: Number(data.price || 0),
      order: Number(data.order ?? 999),
      syncStatus: 'synced' as const,
      updatedAt: data.updatedAt || Date.now()
    }));

    if (remoteAddons.length < 5) {
      const existingIds = new Set(remoteAddons.map(a => a.id));
      const existingNames = new Set(remoteAddons.map(a => a.name.trim().toLowerCase()));
      let missingAdded = 0;
      DEFAULT_INITIAL_ADDONS.forEach(defAddon => {
        if (!existingIds.has(defAddon.id) && !existingNames.has(defAddon.name.trim().toLowerCase())) {
          remoteAddons.push({ ...defAddon, syncStatus: 'synced' });
          missingAdded++;
        }
      });
      if (missingAdded > 0 && isFirebaseConfigured() && db && navigator.onLine) {
        try {
          const batch = writeBatch(db);
          DEFAULT_INITIAL_ADDONS.forEach(a => {
            if (!existingIds.has(a.id) && !existingNames.has(a.name.trim().toLowerCase())) {
              batch.set(doc(db, 'addons', a.id), { ...a, updatedAt: Date.now() }, { merge: true });
            }
          });
          batch.commit().catch(() => {});
        } catch (e) {}
      }
    }

    remoteAddons.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    localStorage.setItem(LS_KEYS.ADDONS, JSON.stringify(remoteAddons));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: remoteAddons }));
    return remoteAddons;
  },

  syncMenuFillingsFromSnapshot: (docs: any[]): MenuItemFilling[] => {
    let remote: MenuItemFilling[] = (docs || []).map(data => ({
      id: data.id,
      menuItemId: data.menuItemId,
      fillingId: data.fillingId
    }));

    if (remote.length < 5) {
      const existingIds = new Set(remote.map(r => r.id));
      DEFAULT_INITIAL_MENU_FILLINGS.forEach(defMf => {
        if (!existingIds.has(defMf.id)) {
          remote.push(defMf);
        }
      });
    }

    localStorage.setItem(LS_KEYS.MENU_FILLINGS, JSON.stringify(remote));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: remote }));
    return remote;
  },

  syncCashSessionsFromSnapshot: (docs: any[]): CashRegisterSession[] => {
    const remoteSessions: CashRegisterSession[] = (docs || []).map(data => ({
      id: data.id,
      openedAt: Number(data.openedAt || Date.now()),
      openingBalance: Number(data.openingBalance || 0),
      openingBreakdown: data.openingBreakdown || undefined,
      closingBreakdown: data.closingBreakdown || undefined,
      status: (data.status === 'CLOSED' ? 'CLOSED' : 'OPEN') as 'OPEN' | 'CLOSED',
      closedAt: data.closedAt ? Number(data.closedAt) : undefined,
      closingBalance: data.closingBalance !== undefined ? Number(data.closingBalance) : undefined,
      calculatedBalance: data.calculatedBalance !== undefined ? Number(data.calculatedBalance) : undefined,
      salesTotals: data.salesTotals || undefined,
      syncStatus: 'synced' as const,
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      updatedAt: data.updatedAt || Date.now()
    })).sort((a, b) => b.openedAt - a.openedAt);

    localStorage.setItem(LS_KEYS.CASH_SESSIONS, JSON.stringify(remoteSessions));
    window.dispatchEvent(new CustomEvent('cash-session-changed', { detail: remoteSessions }));
    return remoteSessions;
  },

  syncCustomersFromSnapshot: (docs: any[]): MonthlyCustomer[] => {
    const remote: MonthlyCustomer[] = (docs || []).map(data => ({
      id: data.id,
      name: data.name || '',
      phone: data.phone || '',
      company: data.company || '',
      notes: data.notes || '',
      creditLimit: typeof data.creditLimit === 'number' ? data.creditLimit : undefined,
      balance: Number(data.balance || 0),
      payments: Array.isArray(data.payments) ? data.payments : [],
      fiadoOrders: Array.isArray(data.fiadoOrders) ? data.fiadoOrders : [],
      createdAt: data.createdAt || Date.now(),
      syncStatus: 'synced' as const,
      updatedAt: data.updatedAt || Date.now()
    }));

    localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify(remote));
    window.dispatchEvent(new CustomEvent('customers-changed', { detail: remote }));
    return remote;
  },

  // ─── Global Real-time Sync Initializer ──────────────────────────────────
  initGlobalSync: (): (() => void) => {
    if (globalSyncInitialized) return () => {};
    if (!isFirebaseConfigured() || !db) return () => {};

    globalSyncInitialized = true;
    globalSyncUnsubscribers = [];

    try {
      // 1. Orders listener (latest 150 orders)
      globalSyncUnsubscribers.push(
        subscribeToCollection('orders', (docs) => {
          StorageService.syncOrdersFromSnapshot(docs);
        }, [orderBy('createdAt', 'desc'), limit(150)])
      );

      // 2. Menu items listener
      globalSyncUnsubscribers.push(
        subscribeToCollection('menu_items', (docs) => {
          StorageService.syncMenuFromSnapshot(docs);
        })
      );

      // 3. Categories listener
      globalSyncUnsubscribers.push(
        subscribeToCollection('categories', (docs) => {
          StorageService.syncCategoriesFromSnapshot(docs);
        })
      );

      // 4. Fillings listener
      globalSyncUnsubscribers.push(
        subscribeToCollection('fillings', (docs) => {
          StorageService.syncFillingsFromSnapshot(docs);
        })
      );

      // 5. Addons listener
      globalSyncUnsubscribers.push(
        subscribeToCollection('addons', (docs) => {
          StorageService.syncAddonsFromSnapshot(docs);
        })
      );

      // 6. Menu item fillings listener
      globalSyncUnsubscribers.push(
        subscribeToCollection('menu_item_fillings', (docs) => {
          StorageService.syncMenuFillingsFromSnapshot(docs);
        })
      );

      // 7. Cash register sessions listener
      globalSyncUnsubscribers.push(
        subscribeToCollection('cash_sessions', (docs) => {
          StorageService.syncCashSessionsFromSnapshot(docs);
        }, [orderBy('openedAt', 'desc'), limit(20)])
      );

      // 8. Monthly customers listener
      globalSyncUnsubscribers.push(
        subscribeToCollection('monthly_customers', (docs) => {
          StorageService.syncCustomersFromSnapshot(docs);
        })
      );

      // 9. System settings listener (doc snapshot)
      try {
        const settingsRef = doc(db, 'system_settings', 'global');
        const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.logoUrl) {
              localStorage.setItem(LS_KEYS.LOGO, data.logoUrl);
              window.dispatchEvent(new CustomEvent('logo-updated'));
            } else if (data.logoUrl === null) {
              localStorage.removeItem(LS_KEYS.LOGO);
              window.dispatchEvent(new CustomEvent('logo-updated'));
            }
            if (data.reportPassword) {
              localStorage.setItem(LS_KEYS.REPORT_PASSWORD, data.reportPassword);
            }
            window.dispatchEvent(new CustomEvent('settings-changed'));
          }
        });
        globalSyncUnsubscribers.push(unsubSettings);
      } catch (e) {
        console.warn("Erro ao escutar system_settings no Firebase:", e);
      }

      // Online event handler
      const handleOnline = () => {
        StorageService.syncPendingData().catch(() => {});
        StorageService.syncGlobalSettings().catch(() => {});
      };
      window.addEventListener('online', handleOnline);
      globalSyncUnsubscribers.push(() => window.removeEventListener('online', handleOnline));

    } catch (e) {
      console.warn("Erro ao configurar listeners de sincronização global:", e);
    }

    return () => {
      globalSyncUnsubscribers.forEach(fn => {
        try { fn(); } catch {}
      });
      globalSyncUnsubscribers = [];
      globalSyncInitialized = false;
    };
  },

  // ─── Orders ──────────────────────────────────────────────────────────

  getDeletedOrderIds: (): Set<string> => {
    try {
      const list = JSON.parse(localStorage.getItem('pastelaria_deleted_orders') || '[]');
      return new Set(Array.isArray(list) ? list : []);
    } catch {
      return new Set();
    }
  },

  getOrders: async (): Promise<Order[]> => {
    let localOrders: Order[] = [];
    const deletedIds = StorageService.getDeletedOrderIds();

    try {
      const stored = localStorage.getItem(LS_KEYS.ORDERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localOrders = parsed.filter(o => o && typeof o === 'object' && o.id && !deletedIds.has(o.id));
        }
      }
    } catch (e) {
      console.warn("LocalStorage orders corrupted, resetting local list.");
      localStorage.setItem(LS_KEYS.ORDERS, '[]');
    }

    if (!isFirebaseConfigured() || !db || !navigator.onLine) {
      return localOrders;
    }

    const fetchFirestoreOrders = async (): Promise<Order[]> => {
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(150));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const firestoreOrders: Order[] = [];
          querySnapshot.forEach(docSnap => {
            if (deletedIds.has(docSnap.id)) return;
            const data = docSnap.data() as any;
            firestoreOrders.push({
              id: docSnap.id,
              customerName: data.customerName || 'Cliente',
              status: data.status || OrderStatus.OPEN,
              createdAt: data.createdAt || Date.now(),
              closedAt: data.closedAt || null,
              discount: Number(data.discount || 0),
              subtotal: Number(data.subtotal || 0),
              total: Number(data.total || 0),
              paymentMethod: data.paymentMethod || null,
              paymentAmountReceived: data.paymentAmountReceived ? Number(data.paymentAmountReceived) : null,
              change: data.change ? Number(data.change) : null,
              orderType: data.orderType as OrderType | undefined,
              createdBy: data.createdBy || null,
              sellerName: data.sellerName || null,
              stockDecremented: !!data.stockDecremented,
              fiadoAccounted: !!data.fiadoAccounted,
              payments: data.payments || [],
              items: Array.isArray(data.items) ? data.items : [],
              syncStatus: 'synced',
              updatedAt: data.updatedAt || Date.now()
            });
          });

          // Merge com pedidos pendentes locais
          const syncedMap = new Map<string, Order>();
          firestoreOrders.forEach(o => syncedMap.set(o.id, o));
          const currentLocal: Order[] = JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || '[]');
          currentLocal.forEach(o => {
            if (o && o.id && !deletedIds.has(o.id) && o.syncStatus === 'pending' && !syncedMap.has(o.id)) {
              syncedMap.set(o.id, o);
            }
          });

          const mergedOrders = Array.from(syncedMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(mergedOrders));
          return mergedOrders;
        }
      } catch (e) {
        console.warn("Firebase getOrders fallback/background error:", e);
      }
      return localOrders;
    };

    // Stale-While-Revalidate: Se já temos pedidos no cache local, retorna na hora (0ms)
    // e executa a sincronização com o Firestore em segundo plano
    if (localOrders.length > 0) {
      fetchFirestoreOrders().catch(() => {});
      return localOrders;
    }

    // Se não há pedidos locais, tenta buscar com timeout curto (1.2s) para nunca congelar a tela
    try {
      const timeoutPromise = new Promise<Order[]>((resolve) => setTimeout(() => resolve(localOrders), 1200));
      return await Promise.race([fetchFirestoreOrders(), timeoutPromise]);
    } catch {
      return localOrders;
    }
  },

  getOrderById: async (id: string): Promise<Order | null> => {
    const deletedIds = StorageService.getDeletedOrderIds();
    if (deletedIds.has(id)) return null;

    const orders = await StorageService.getOrders();
    const found = orders.find(o => o.id === id && !deletedIds.has(o.id));
    if (found) return found;

    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'orders', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            customerName: data.customerName || 'Cliente',
            status: data.status || OrderStatus.OPEN,
            createdAt: data.createdAt || Date.now(),
            closedAt: data.closedAt || null,
            discount: Number(data.discount || 0),
            subtotal: Number(data.subtotal || 0),
            total: Number(data.total || 0),
            paymentMethod: data.paymentMethod || null,
            paymentAmountReceived: data.paymentAmountReceived ? Number(data.paymentAmountReceived) : null,
            change: data.change ? Number(data.change) : null,
            orderType: data.orderType as OrderType | undefined,
            createdBy: data.createdBy || null,
            sellerName: data.sellerName || null,
            stockDecremented: !!data.stockDecremented,
            fiadoAccounted: !!data.fiadoAccounted,
            payments: data.payments || [],
            items: Array.isArray(data.items) ? data.items : [],
            syncStatus: 'synced',
            updatedAt: data.updatedAt || Date.now()
          };
        }
      } catch (e) {
        console.warn("Firebase getOrderById error:", e);
      }
    }

    return null;
  },

  saveOrder: async (order: Order): Promise<Order> => {
    const updatedOrder: Order = {
      ...order,
      syncStatus: 'pending',
      updatedAt: Date.now()
    };

    // 1. Estoque
    if (updatedOrder.status === OrderStatus.CLOSED && !updatedOrder.stockDecremented) {
      await StorageService.decrementStock(updatedOrder);
      updatedOrder.stockDecremented = true;
    } else if (updatedOrder.status === OrderStatus.CANCELLED && updatedOrder.stockDecremented) {
      await StorageService.restoreOrderStock(updatedOrder);
      updatedOrder.stockDecremented = false;
    }

    // 2. Fiado (Mensalista) - Guarda a comanda com itens junto ao registro do cliente
    let fiadoAmount = 0;
    if (updatedOrder.payments && updatedOrder.payments.length > 0) {
      fiadoAmount = updatedOrder.payments
        .filter(p => p.method === PaymentMethod.FIADO)
        .reduce((sum, p) => sum + p.amount, 0);
    } else if (updatedOrder.paymentMethod === PaymentMethod.FIADO) {
      fiadoAmount = updatedOrder.total;
    }

    if (updatedOrder.status === OrderStatus.CLOSED && fiadoAmount > 0) {
      const customers = await StorageService.getCustomers();
      const customer = customers.find(c => 
        (updatedOrder.customerId && c.id === updatedOrder.customerId) ||
        c.name.toLowerCase().trim() === updatedOrder.customerName.toLowerCase().trim()
      );

      if (customer) {
        // Monta o registro completo da comanda para futuro conferimento e controle
        const fiadoRecord: CustomerFiadoOrder = {
          orderId: updatedOrder.id,
          customerName: updatedOrder.customerName,
          createdAt: updatedOrder.createdAt,
          closedAt: updatedOrder.closedAt || Date.now(),
          total: updatedOrder.total,
          fiadoAmount: fiadoAmount,
          paymentMethod: updatedOrder.paymentMethod,
          payments: updatedOrder.payments || [],
          sellerName: updatedOrder.sellerName,
          orderType: updatedOrder.orderType,
          items: (updatedOrder.items || []).map(i => ({
            id: i.id,
            menuItemId: i.menuItemId,
            name: i.name,
            category: i.category,
            price: i.price,
            quantity: i.quantity,
            notes: i.notes || '',
            extra: i.extra || 0,
            discount: i.discount || 0,
            fillingId: i.fillingId,
            addons: i.addons || []
          }))
        };

        const existingFiadoOrders = Array.isArray(customer.fiadoOrders) ? [...customer.fiadoOrders] : [];
        const orderIdx = existingFiadoOrders.findIndex(fo => fo.orderId === updatedOrder.id);
        if (orderIdx >= 0) {
          existingFiadoOrders[orderIdx] = fiadoRecord;
        } else {
          existingFiadoOrders.unshift(fiadoRecord);
        }
        customer.fiadoOrders = existingFiadoOrders;

        if (!updatedOrder.fiadoAccounted) {
          customer.balance = (customer.balance || 0) + fiadoAmount;
          updatedOrder.fiadoAccounted = true;
        }

        if (!updatedOrder.customerId) {
          updatedOrder.customerId = customer.id;
        }

        await StorageService.saveCustomer(customer);
      }
    }

    // 3. Salva no LocalStorage imediatamente
    const orders: Order[] = JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || '[]');
    const index = orders.findIndex(o => o.id === order.id);
    if (index >= 0) orders[index] = updatedOrder;
    else orders.unshift(updatedOrder);
    localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('orders-changed', { detail: updatedOrder }));

    // 4. Salva no Firestore em segundo plano
    if (isFirebaseConfigured() && db && navigator.onLine) {
      StorageService.pushOrderToFirebase(updatedOrder).then(() => {
        const currentOrders: Order[] = JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || '[]');
        const idx = currentOrders.findIndex(o => o.id === order.id);
        if (idx >= 0) {
          currentOrders[idx].syncStatus = 'synced';
          localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(currentOrders));
        }
      }).catch(e => {
        console.warn("Background Firebase sync failed:", e);
      });
    }

    return updatedOrder;
  },

  pushOrderToFirebase: async (order: Order) => {
    if (!db) return;
    const docRef = doc(db, 'orders', order.id);
    const orderData = {
      id: order.id,
      customerName: order.customerName || 'Cliente',
      status: order.status || OrderStatus.OPEN,
      createdAt: order.createdAt || Date.now(),
      closedAt: order.closedAt || null,
      discount: Number(order.discount || 0),
      subtotal: Number(order.subtotal || 0),
      total: Number(order.total || 0),
      paymentMethod: order.paymentMethod || null,
      paymentAmountReceived: order.paymentAmountReceived ? Number(order.paymentAmountReceived) : null,
      change: order.change ? Number(order.change) : null,
      orderType: order.orderType || null,
      createdBy: order.createdBy || null,
      sellerName: order.sellerName || null,
      stockDecremented: !!order.stockDecremented,
      fiadoAccounted: !!order.fiadoAccounted,
      payments: order.payments || [],
      items: (order.items || []).map(i => ({
        id: i.id || StorageService.generateId(),
        menuItemId: i.menuItemId,
        name: i.name || 'Item',
        price: Number(i.price || 0),
        quantity: Number(i.quantity || 1),
        notes: i.notes || '',
        extra: Number(i.extra || 0),
        discount: Number(i.discount || 0),
        orderType: i.orderType || null,
        fillingId: i.fillingId || null,
        addons: i.addons || []
      })),
      updatedAt: Date.now()
    };

    await setDoc(docRef, orderData, { merge: true });
  },

  deleteOrder: async (id: string): Promise<void> => {
    let orders: Order[] = [];
    try {
      orders = JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || '[]');
    } catch {
      orders = [];
    }
    const targetOrder = orders.find(o => o && o.id === id);

    // 1. Se o pedido decrementou estoque e não estava cancelado, restaura estoque
    if (targetOrder && targetOrder.status !== OrderStatus.CANCELLED && targetOrder.stockDecremented) {
      try {
        await StorageService.restoreOrderStock(targetOrder);
      } catch (err) {
        console.warn("Erro ao restaurar estoque ao excluir pedido:", err);
      }
    }

    // 2. Se o pedido tinha fiado contabilizado no cliente mensalista, estorna o saldo
    if (targetOrder && targetOrder.fiadoAccounted) {
      try {
        let fiadoAmount = 0;
        if (targetOrder.payments && targetOrder.payments.length > 0) {
          fiadoAmount = targetOrder.payments
            .filter(p => p.method === PaymentMethod.FIADO)
            .reduce((sum, p) => sum + p.amount, 0);
        } else if (targetOrder.paymentMethod === PaymentMethod.FIADO) {
          fiadoAmount = targetOrder.total || 0;
        }

        if (fiadoAmount > 0) {
          const customers = await StorageService.getCustomers();
          const customer = customers.find(c => 
            (targetOrder.customerId && c.id === targetOrder.customerId) ||
            c.name.toLowerCase().trim() === (targetOrder.customerName || '').toLowerCase().trim()
          );
          if (customer) {
            customer.balance = Math.max(0, (customer.balance || 0) - fiadoAmount);
            if (customer.fiadoOrders) {
              customer.fiadoOrders = customer.fiadoOrders.filter(fo => fo.orderId !== id);
            }
            await StorageService.saveCustomer(customer);
          }
        }
      } catch (err) {
        console.warn("Erro ao estornar fiado do cliente mensalista ao excluir:", err);
      }
    }

    // 3. Remove do LocalStorage
    const filtered = orders.filter(o => o && o.id !== id);
    localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(filtered));

    // 4. Grava na lista de IDs excluídos (tombstone) para evitar ressurreição em snapshots do Firestore
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('pastelaria_deleted_orders') || '[]');
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        if (deletedIds.length > 500) deletedIds.shift();
        localStorage.setItem('pastelaria_deleted_orders', JSON.stringify(deletedIds));
      }
    } catch {}

    // 5. Exclui do Firestore se configurado
    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch (e) {
        console.warn("Falha ao deletar pedido no Firebase:", e);
      }
    }

    // 6. Notifica todas as páginas e abas abertas
    try {
      window.dispatchEvent(new CustomEvent('orders-changed'));
      window.dispatchEvent(new CustomEvent('order-deleted', { detail: { id } }));
    } catch {}
  },

  // ─── Menu & Products ──────────────────────────────────────────────────

  getProducts: async (): Promise<MenuItem[]> => {
    const stored = localStorage.getItem(LS_KEYS.MENU);
    let localProducts = stored ? JSON.parse(stored) : [];

    // If local products has less than 10 items, merge with all official default items
    if (!Array.isArray(localProducts) || localProducts.length < 10) {
      const existingIds = new Set((localProducts || []).map((p: any) => p.id));
      const existingNames = new Set((localProducts || []).map((p: any) => (p.name || '').trim().toLowerCase()));
      DEFAULT_INITIAL_PRODUCTS.forEach(dp => {
        if (!existingIds.has(dp.id) && !existingNames.has(dp.name.trim().toLowerCase())) {
          localProducts.push(dp);
        }
      });
      localProducts.sort((a: MenuItem, b: MenuItem) => (a.order ?? 999) - (b.order ?? 999));
      localStorage.setItem(LS_KEYS.MENU, JSON.stringify(localProducts));
    }

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        const snapshot = await getDocs(collection(db, 'menu_items'));
        if (!snapshot.empty) {
          const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
          return StorageService.syncMenuFromSnapshot(docs);
        } else {
          localProducts = DEFAULT_INITIAL_PRODUCTS;
          localStorage.setItem(LS_KEYS.MENU, JSON.stringify(localProducts));
          const batch = writeBatch(db);
          let count = 0;
          for (const item of DEFAULT_INITIAL_PRODUCTS) {
            if (count < 400) {
              batch.set(doc(db, 'menu_items', item.id), { ...item, updatedAt: Date.now() }, { merge: true });
              count++;
            }
          }
          await batch.commit().catch(() => {});
          return localProducts;
        }
      } catch (e) {
        console.warn("Erro ao carregar produtos do Firestore:", e);
      }
    }

    return localProducts;
  },

  saveProduct: async (product: MenuItem): Promise<MenuItem> => {
    const updated: MenuItem = {
      ...product,
      syncStatus: 'pending',
      updatedAt: Date.now()
    };

    const items: MenuItem[] = JSON.parse(localStorage.getItem(LS_KEYS.MENU) || '[]');
    const index = items.findIndex(i => i.id === product.id);
    if (index >= 0) items[index] = updated;
    else items.push(updated);
    localStorage.setItem(LS_KEYS.MENU, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: items }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await setDoc(doc(db, 'menu_items', product.id), {
          id: product.id,
          name: product.name,
          price: Number(product.price || 0),
          category: product.category || 'Geral',
          description: product.description || '',
          imageUrl: product.imageUrl || '',
          inStock: product.inStock !== false,
          stockQuantity: product.stockQuantity !== undefined ? Number(product.stockQuantity) : null,
          order: Number(product.order ?? 999),
          updatedAt: Date.now()
        }, { merge: true });

        updated.syncStatus = 'synced';
        const current: MenuItem[] = JSON.parse(localStorage.getItem(LS_KEYS.MENU) || '[]');
        const idx = current.findIndex(i => i.id === product.id);
        if (idx >= 0) {
          current[idx].syncStatus = 'synced';
          localStorage.setItem(LS_KEYS.MENU, JSON.stringify(current));
        }
      } catch (e) {
        console.warn("Erro ao salvar produto no Firebase:", e);
      }
    }

    return updated;
  },

  deleteProduct: async (id: string): Promise<void> => {
    const items: MenuItem[] = JSON.parse(localStorage.getItem(LS_KEYS.MENU) || '[]');
    const filtered = items.filter(i => i.id !== id);
    localStorage.setItem(LS_KEYS.MENU, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: filtered }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await deleteDoc(doc(db, 'menu_items', id));
      } catch (e) {
        console.warn("Erro ao deletar produto no Firebase:", e);
      }
    }
  },

  toggleProductStock: async (productId: string, inStock: boolean) => {
    const items: MenuItem[] = JSON.parse(localStorage.getItem(LS_KEYS.MENU) || '[]');
    const index = items.findIndex(i => i.id === productId);
    if (index >= 0) {
      items[index].inStock = inStock;
      items[index].syncStatus = 'pending';
      items[index].updatedAt = Date.now();
      localStorage.setItem(LS_KEYS.MENU, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('menu-changed', { detail: items }));
    }

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await updateDoc(doc(db, 'menu_items', productId), {
          inStock: inStock,
          updatedAt: Date.now()
        });
        if (index >= 0) {
          items[index].syncStatus = 'synced';
          localStorage.setItem(LS_KEYS.MENU, JSON.stringify(items));
        }
      } catch (e) {
        console.warn("Erro ao alternar estoque no Firebase:", e);
      }
    }
  },

  // ─── Categories ───────────────────────────────────────────────────────

  getCategories: async (): Promise<CategoryItem[]> => {
    const stored = localStorage.getItem(LS_KEYS.CATEGORIES);
    let localCategories: CategoryItem[] = stored ? JSON.parse(stored) : [];

    // Ensure all 7 official categories exist
    if (!Array.isArray(localCategories) || localCategories.length < 7) {
      const existingIds = new Set((localCategories || []).map((c: any) => c.id));
      const existingNames = new Set((localCategories || []).map((c: any) => (c.name || '').trim().toUpperCase()));
      DEFAULT_INITIAL_CATEGORIES.forEach(dc => {
        if (!existingIds.has(dc.id) && !existingNames.has(dc.name.trim().toUpperCase())) {
          localCategories.push(dc);
        }
      });
      localCategories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(localCategories));
    }

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        const snapshot = await getDocs(collection(db, 'categories'));
        if (!snapshot.empty) {
          const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
          return StorageService.syncCategoriesFromSnapshot(docs);
        } else {
          localCategories = DEFAULT_INITIAL_CATEGORIES;
          localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(localCategories));
          const batch = writeBatch(db);
          for (const cat of DEFAULT_INITIAL_CATEGORIES) {
            batch.set(doc(db, 'categories', cat.id), { ...cat, updatedAt: Date.now() }, { merge: true });
          }
          await batch.commit().catch(() => {});
          return localCategories;
        }
      } catch (e) {}
    }

    return localCategories;
  },

  saveCategory: async (category: CategoryItem): Promise<CategoryItem> => {
    const updated: CategoryItem = {
      ...category,
      syncStatus: 'pending',
      updatedAt: Date.now()
    };
    const cats: CategoryItem[] = JSON.parse(localStorage.getItem(LS_KEYS.CATEGORIES) || '[]');
    const idx = cats.findIndex(c => c.id === category.id);
    if (idx >= 0) cats[idx] = updated;
    else cats.push(updated);
    localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(cats));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: cats }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await setDoc(doc(db, 'categories', category.id), {
          id: category.id,
          name: category.name,
          order: Number(category.order ?? 0),
          updatedAt: Date.now()
        }, { merge: true });
        updated.syncStatus = 'synced';
      } catch (e) {
        console.warn("Erro ao salvar categoria no Firebase:", e);
      }
    }
    return updated;
  },

  deleteCategory: async (id: string): Promise<void> => {
    const cats: CategoryItem[] = JSON.parse(localStorage.getItem(LS_KEYS.CATEGORIES) || '[]');
    const filtered = cats.filter(c => c.id !== id);
    localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: filtered }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (e) {
        console.warn("Erro ao deletar categoria no Firebase:", e);
      }
    }
  },

  // ─── Addons (Adicionais) ──────────────────────────────────────────────

  getAddons: async (): Promise<Addon[]> => {
    const stored = localStorage.getItem(LS_KEYS.ADDONS);
    let localAddons = stored ? JSON.parse(stored) : [];

    if (Array.isArray(localAddons) && localAddons.length > 0) {
      return localAddons.sort((a: Addon, b: Addon) => (a.order ?? 999) - (b.order ?? 999));
    }

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        const snapshot = await getDocs(collection(db, 'addons'));
        if (!snapshot.empty) {
          const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
          return StorageService.syncAddonsFromSnapshot(docs);
        } else {
          localAddons = DEFAULT_INITIAL_ADDONS;
          localStorage.setItem(LS_KEYS.ADDONS, JSON.stringify(localAddons));
          for (const addon of DEFAULT_INITIAL_ADDONS) {
            setDoc(doc(db, 'addons', addon.id), addon, { merge: true }).catch(() => {});
          }
          return localAddons;
        }
      } catch (e) {}
    }

    localAddons = DEFAULT_INITIAL_ADDONS;
    localStorage.setItem(LS_KEYS.ADDONS, JSON.stringify(localAddons));
    return localAddons;
  },

  saveAddon: async (addon: Addon): Promise<Addon> => {
    const updated: Addon = { ...addon, syncStatus: 'pending', updatedAt: Date.now() };
    const addons: Addon[] = JSON.parse(localStorage.getItem(LS_KEYS.ADDONS) || '[]');
    const idx = addons.findIndex(a => a.id === addon.id);
    if (idx >= 0) addons[idx] = updated;
    else addons.push(updated);
    localStorage.setItem(LS_KEYS.ADDONS, JSON.stringify(addons));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: addons }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await setDoc(doc(db, 'addons', addon.id), {
          id: addon.id,
          name: addon.name,
          price: Number(addon.price || 0),
          order: Number(addon.order ?? 999),
          updatedAt: Date.now()
        }, { merge: true });
        updated.syncStatus = 'synced';
      } catch (e) {}
    }
    return updated;
  },

  deleteAddon: async (id: string): Promise<void> => {
    const addons: Addon[] = JSON.parse(localStorage.getItem(LS_KEYS.ADDONS) || '[]');
    const filtered = addons.filter(a => a.id !== id);
    localStorage.setItem(LS_KEYS.ADDONS, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: filtered }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await deleteDoc(doc(db, 'addons', id));
      } catch (e) {}
    }
  },

  // ─── Fillings (Recheios) ──────────────────────────────────────────────

  getFillings: async (): Promise<Filling[]> => {
    const stored = localStorage.getItem(LS_KEYS.FILLINGS);
    let localFillings = stored ? JSON.parse(stored) : [];

    if (Array.isArray(localFillings) && localFillings.length > 0) {
      return localFillings;
    }

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        const snapshot = await getDocs(collection(db, 'fillings'));
        if (!snapshot.empty) {
          const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
          return StorageService.syncFillingsFromSnapshot(docs);
        } else {
          localFillings = DEFAULT_INITIAL_FILLINGS;
          localStorage.setItem(LS_KEYS.FILLINGS, JSON.stringify(localFillings));
          for (const filling of DEFAULT_INITIAL_FILLINGS) {
            setDoc(doc(db, 'fillings', filling.id), filling, { merge: true }).catch(() => {});
          }
          return localFillings;
        }
      } catch (e) {}
    }

    localFillings = DEFAULT_INITIAL_FILLINGS;
    localStorage.setItem(LS_KEYS.FILLINGS, JSON.stringify(localFillings));
    return localFillings;
  },

  saveFilling: async (filling: Filling): Promise<Filling> => {
    const updated: Filling = { ...filling, syncStatus: 'pending', updatedAt: Date.now() };
    const fillings: Filling[] = JSON.parse(localStorage.getItem(LS_KEYS.FILLINGS) || '[]');
    const idx = fillings.findIndex(f => f.id === filling.id);
    if (idx >= 0) fillings[idx] = updated;
    else fillings.push(updated);
    localStorage.setItem(LS_KEYS.FILLINGS, JSON.stringify(fillings));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: fillings }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await setDoc(doc(db, 'fillings', filling.id), {
          id: filling.id,
          name: filling.name,
          price: Number(filling.price || 0),
          inStock: filling.inStock !== false,
          stockQuantity: filling.stockQuantity !== undefined ? Number(filling.stockQuantity) : null,
          updatedAt: Date.now()
        }, { merge: true });
        updated.syncStatus = 'synced';
      } catch (e) {}
    }
    return updated;
  },

  deleteFilling: async (id: string): Promise<void> => {
    const fillings: Filling[] = JSON.parse(localStorage.getItem(LS_KEYS.FILLINGS) || '[]');
    const filtered = fillings.filter(f => f.id !== id);
    localStorage.setItem(LS_KEYS.FILLINGS, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: filtered }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await deleteDoc(doc(db, 'fillings', id));
      } catch (e) {}
    }
  },

  // ─── Menu Item Fillings ───────────────────────────────────────────────

  getMenuFillings: async (): Promise<MenuItemFilling[]> => {
    const stored = localStorage.getItem(LS_KEYS.MENU_FILLINGS);
    let localMf = stored ? JSON.parse(stored) : [];

    if (Array.isArray(localMf) && localMf.length > 0) {
      return localMf;
    }

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        const snapshot = await getDocs(collection(db, 'menu_item_fillings'));
        if (!snapshot.empty) {
          const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
          return StorageService.syncMenuFillingsFromSnapshot(docs);
        } else {
          localMf = DEFAULT_INITIAL_MENU_FILLINGS;
          localStorage.setItem(LS_KEYS.MENU_FILLINGS, JSON.stringify(localMf));
          for (const mf of DEFAULT_INITIAL_MENU_FILLINGS) {
            setDoc(doc(db, 'menu_item_fillings', mf.id), mf, { merge: true }).catch(() => {});
          }
          return localMf;
        }
      } catch (e) {}
    }

    localMf = DEFAULT_INITIAL_MENU_FILLINGS;
    localStorage.setItem(LS_KEYS.MENU_FILLINGS, JSON.stringify(localMf));
    return localMf;
  },

  resetToDefaultMenu: async (): Promise<void> => {
    localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(DEFAULT_INITIAL_CATEGORIES));
    localStorage.setItem(LS_KEYS.MENU, JSON.stringify(DEFAULT_INITIAL_PRODUCTS));
    localStorage.setItem(LS_KEYS.FILLINGS, JSON.stringify(DEFAULT_INITIAL_FILLINGS));
    localStorage.setItem(LS_KEYS.ADDONS, JSON.stringify(DEFAULT_INITIAL_ADDONS));
    localStorage.setItem(LS_KEYS.MENU_FILLINGS, JSON.stringify(DEFAULT_INITIAL_MENU_FILLINGS));
    window.dispatchEvent(new CustomEvent('menu-changed'));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        const batch = writeBatch(db);
        DEFAULT_INITIAL_CATEGORIES.forEach(c => {
          batch.set(doc(db, 'categories', c.id), { ...c, updatedAt: Date.now() }, { merge: true });
        });
        DEFAULT_INITIAL_PRODUCTS.forEach(p => {
          batch.set(doc(db, 'menu_items', p.id), { ...p, updatedAt: Date.now() }, { merge: true });
        });
        DEFAULT_INITIAL_FILLINGS.forEach(f => {
          batch.set(doc(db, 'fillings', f.id), { ...f, updatedAt: Date.now() }, { merge: true });
        });
        DEFAULT_INITIAL_ADDONS.forEach(a => {
          batch.set(doc(db, 'addons', a.id), { ...a, updatedAt: Date.now() }, { merge: true });
        });
        DEFAULT_INITIAL_MENU_FILLINGS.forEach(mf => {
          batch.set(doc(db, 'menu_item_fillings', mf.id), { ...mf, updatedAt: Date.now() }, { merge: true });
        });
        await batch.commit();
      } catch (e) {
        console.warn("Erro ao salvar cardápio padrão no Firebase:", e);
      }
    }
  },

  saveMenuFillings: async (menuItemId: string, fillingIds: string[]): Promise<void> => {
    let current: MenuItemFilling[] = JSON.parse(localStorage.getItem(LS_KEYS.MENU_FILLINGS) || '[]');
    current = current.filter(mf => mf.menuItemId !== menuItemId);
    fillingIds.forEach(fId => {
      current.push({
        id: `${menuItemId}_${fId}`,
        menuItemId,
        fillingId: fId
      });
    });
    localStorage.setItem(LS_KEYS.MENU_FILLINGS, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('menu-changed', { detail: current }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        const batch = writeBatch(db);
        fillingIds.forEach(fId => {
          const docId = `${menuItemId}_${fId}`;
          const ref = doc(db, 'menu_item_fillings', docId);
          batch.set(ref, { id: docId, menuItemId, fillingId: fId, updatedAt: Date.now() });
        });
        await batch.commit();
      } catch (e) {
        console.warn("Erro ao salvar vínculos de recheio no Firebase:", e);
      }
    }
  },

  // ─── Monthly Customers (Mensalistas) ──────────────────────────────────

  getCustomers: async (): Promise<MonthlyCustomer[]> => {
    const stored = localStorage.getItem(LS_KEYS.CUSTOMERS);
    let localCustomers: MonthlyCustomer[] = stored ? JSON.parse(stored) : [];

    if (isFirebaseConfigured() && db && navigator.onLine) {
      getDocs(collection(db, 'monthly_customers')).then(snapshot => {
        if (!snapshot.empty) {
          const remote: MonthlyCustomer[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as any;
            remote.push({
              id: docSnap.id,
              name: data.name,
              phone: data.phone || '',
              company: data.company || '',
              notes: data.notes || '',
              creditLimit: typeof data.creditLimit === 'number' ? data.creditLimit : undefined,
              balance: Number(data.balance || 0),
              payments: Array.isArray(data.payments) ? data.payments : [],
              fiadoOrders: Array.isArray(data.fiadoOrders) ? data.fiadoOrders : [],
              createdAt: data.createdAt || Date.now(),
              syncStatus: 'synced',
              updatedAt: data.updatedAt || Date.now()
            });
          });
          localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify(remote));
          window.dispatchEvent(new CustomEvent('customers-changed'));
        }
      }).catch(() => {});
    }

    return localCustomers;
  },

  saveCustomer: async (customer: MonthlyCustomer): Promise<MonthlyCustomer> => {
    const updated: MonthlyCustomer = { 
      ...customer, 
      fiadoOrders: Array.isArray(customer.fiadoOrders) ? customer.fiadoOrders : [],
      createdAt: customer.createdAt || Date.now(),
      syncStatus: 'pending', 
      updatedAt: Date.now() 
    };
    const customers: MonthlyCustomer[] = JSON.parse(localStorage.getItem(LS_KEYS.CUSTOMERS) || '[]');
    const idx = customers.findIndex(c => c.id === customer.id);
    if (idx >= 0) customers[idx] = updated;
    else customers.push(updated);
    localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new CustomEvent('customers-changed', { detail: updated }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      const sanitizedFiadoOrders = (updated.fiadoOrders || []).map(fo => ({
        orderId: fo.orderId,
        customerName: fo.customerName || '',
        createdAt: fo.createdAt || Date.now(),
        closedAt: fo.closedAt || null,
        total: Number(fo.total || 0),
        fiadoAmount: Number(fo.fiadoAmount || 0),
        paymentMethod: fo.paymentMethod || null,
        sellerName: fo.sellerName || null,
        orderType: fo.orderType || null,
        items: (fo.items || []).map(i => ({
          id: i.id,
          menuItemId: i.menuItemId,
          name: i.name,
          category: i.category || '',
          price: Number(i.price || 0),
          quantity: Number(i.quantity || 1),
          notes: i.notes || '',
          extra: Number(i.extra || 0),
          discount: Number(i.discount || 0),
          fillingId: i.fillingId || null,
          addons: i.addons || []
        }))
      }));

      setDoc(doc(db, 'monthly_customers', customer.id), {
        id: customer.id,
        name: customer.name,
        phone: customer.phone || '',
        company: customer.company || '',
        notes: customer.notes || '',
        creditLimit: customer.creditLimit !== undefined ? customer.creditLimit : null,
        balance: Number(customer.balance || 0),
        payments: customer.payments || [],
        fiadoOrders: sanitizedFiadoOrders,
        createdAt: updated.createdAt,
        updatedAt: Date.now()
      }, { merge: true })
      .then(() => {
        updated.syncStatus = 'synced';
      })
      .catch((e) => {
        console.warn("Erro ao sincronizar mensalista com Firebase:", e);
      });
    }
    return updated;
  },

  syncAllFiadoOrdersToCustomers: async (): Promise<void> => {
    try {
      const orders: Order[] = JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || '[]');
      const customers = await StorageService.getCustomers();
      if (customers.length === 0 || orders.length === 0) return;

      let hasChanges = false;

      for (const order of orders) {
        let fiadoAmount = 0;
        if (order.payments && order.payments.length > 0) {
          fiadoAmount = order.payments
            .filter(p => p.method === PaymentMethod.FIADO)
            .reduce((sum, p) => sum + p.amount, 0);
        } else if (order.paymentMethod === PaymentMethod.FIADO) {
          fiadoAmount = order.total || 0;
        }

        if (fiadoAmount > 0 && order.status === OrderStatus.CLOSED) {
          const customer = customers.find(c =>
            (order.customerId && c.id === order.customerId) ||
            c.name.toLowerCase().trim() === (order.customerName || '').toLowerCase().trim()
          );

          if (customer) {
            customer.fiadoOrders = customer.fiadoOrders || [];
            const exists = customer.fiadoOrders.some(fo => fo.orderId === order.id);
            if (!exists) {
              customer.fiadoOrders.unshift({
                orderId: order.id,
                customerName: order.customerName,
                createdAt: order.createdAt,
                closedAt: order.closedAt || Date.now(),
                total: order.total,
                fiadoAmount: fiadoAmount,
                paymentMethod: order.paymentMethod,
                payments: order.payments || [],
                sellerName: order.sellerName,
                orderType: order.orderType,
                items: (order.items || []).map(i => ({
                  id: i.id,
                  menuItemId: i.menuItemId,
                  name: i.name,
                  category: i.category,
                  price: i.price,
                  quantity: i.quantity,
                  notes: i.notes || '',
                  extra: i.extra || 0,
                  discount: i.discount || 0,
                  fillingId: i.fillingId,
                  addons: i.addons || []
                }))
              });
              await StorageService.saveCustomer(customer);
              hasChanges = true;
            }
          }
        }
      }

      if (hasChanges) {
        window.dispatchEvent(new CustomEvent('customers-changed'));
      }
    } catch (err) {
      console.warn("Erro ao sincronizar comandas de fiado com mensalistas:", err);
    }
  },

  deleteCustomer: async (id: string): Promise<void> => {
    const customers: MonthlyCustomer[] = JSON.parse(localStorage.getItem(LS_KEYS.CUSTOMERS) || '[]');
    const filtered = customers.filter(c => c.id !== id);
    localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('customers-changed', { detail: { id, deleted: true } }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      deleteDoc(doc(db, 'monthly_customers', id)).catch(() => {});
    }
  },

  // ─── Cash Register Sessions & Transactions ────────────────────────────

  getCurrentSession: async (): Promise<CashRegisterSession | null> => {
    const sessions: CashRegisterSession[] = JSON.parse(localStorage.getItem(LS_KEYS.CASH_SESSIONS) || '[]');
    const openSession = sessions.find(s => s.status === 'OPEN');
    if (openSession) return openSession;

    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        const q = query(collection(db, 'cash_sessions'), orderBy('openedAt', 'desc'), limit(5));
        const fetchPromise = getDocs(q).then(snapshot => {
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data() as any;
            if (data.status === 'OPEN') {
              const session: CashRegisterSession = {
                id: docSnap.id,
                openedAt: Number(data.openedAt),
                openingBalance: Number(data.openingBalance || 0),
                openingBreakdown: data.openingBreakdown,
                closingBreakdown: data.closingBreakdown,
                status: 'OPEN',
                syncStatus: 'synced',
                transactions: Array.isArray(data.transactions) ? data.transactions : []
              };
              return session;
            }
          }
          return null;
        });

        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
        return await Promise.race([fetchPromise, timeoutPromise]);
      } catch (e) {}
    }

    return null;
  },

  openSession: async (openingBalance: number, openingBreakdown?: CashBreakdown): Promise<CashRegisterSession> => {
    const session: CashRegisterSession = {
      id: StorageService.generateId(),
      openedAt: Date.now(),
      openingBalance: typeof openingBalance === 'number' && !isNaN(openingBalance) ? openingBalance : 0,
      openingBreakdown,
      status: 'OPEN',
      transactions: [],
      syncStatus: 'pending',
      updatedAt: Date.now()
    };

    const sessions = JSON.parse(localStorage.getItem(LS_KEYS.CASH_SESSIONS) || '[]');
    sessions.push(session);
    localStorage.setItem(LS_KEYS.CASH_SESSIONS, JSON.stringify(sessions));
    window.dispatchEvent(new CustomEvent('cash-session-changed', { detail: session }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      setDoc(doc(db, 'cash_sessions', session.id), {
        id: session.id,
        openedAt: session.openedAt,
        openingBalance: session.openingBalance,
        openingBreakdown: session.openingBreakdown || null,
        status: session.status,
        transactions: [],
        updatedAt: Date.now()
      })
      .then(() => {
        session.syncStatus = 'synced';
      })
      .catch((e) => {
        console.warn("Erro ao abrir sessão de caixa no Firebase:", e);
      });
    }

    return session;
  },

  addTransaction: async (sessionId: string, transaction: Omit<CashTransaction, 'id' | 'timestamp'>): Promise<CashTransaction> => {
    const newTransaction: CashTransaction = {
      ...transaction,
      id: StorageService.generateId(),
      timestamp: Date.now(),
      amount: transaction.amount || 0
    };

    const sessions = JSON.parse(localStorage.getItem(LS_KEYS.CASH_SESSIONS) || '[]');
    const index = sessions.findIndex((s: any) => s.id === sessionId);
    if (index >= 0) {
      if (!sessions[index].transactions) sessions[index].transactions = [];
      sessions[index].transactions.push(newTransaction);
      sessions[index].syncStatus = 'pending';
      sessions[index].updatedAt = Date.now();
      localStorage.setItem(LS_KEYS.CASH_SESSIONS, JSON.stringify(sessions));
    }
    window.dispatchEvent(new CustomEvent('cash-session-changed'));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      (async () => {
        try {
          const sessionRef = doc(db, 'cash_sessions', sessionId);
          const sessionSnap = await getDoc(sessionRef);
          const existingTrans = sessionSnap.exists() && Array.isArray(sessionSnap.data().transactions) 
            ? sessionSnap.data().transactions 
            : [];
          await updateDoc(sessionRef, {
            transactions: [...existingTrans, newTransaction],
            updatedAt: Date.now()
          });
        } catch (e) {
          console.warn("Erro ao registrar transação no Firebase:", e);
        }
      })();
    }

    return newTransaction;
  },

  closeSession: async (
    sessionId: string, 
    closingBalance: number, 
    calculatedBalance: number, 
    closingBreakdown?: CashBreakdown, 
    salesTotals?: { pix: number, debit: number, credit: number }
  ) => {
    const closedAt = Date.now();
    const sessions: any[] = JSON.parse(localStorage.getItem(LS_KEYS.CASH_SESSIONS) || '[]');
    const index = sessions.findIndex((s: any) => s.id === sessionId);

    let sessionData = index >= 0 ? sessions[index] : { id: sessionId, openedAt: closedAt - 3600000, openingBalance: 0 };
    sessionData = {
      ...sessionData,
      status: 'CLOSED',
      closedAt,
      closingBalance,
      calculatedBalance,
      closingBreakdown,
      salesTotals,
      syncStatus: 'pending',
      updatedAt: closedAt
    };

    if (index >= 0) sessions[index] = sessionData;
    else sessions.push(sessionData);
    localStorage.setItem(LS_KEYS.CASH_SESSIONS, JSON.stringify(sessions));
    window.dispatchEvent(new CustomEvent('cash-session-changed', { detail: sessionData }));

    if (isFirebaseConfigured() && db && navigator.onLine) {
      setDoc(doc(db, 'cash_sessions', sessionId), {
        id: sessionId,
        status: 'CLOSED',
        closedAt,
        closingBalance,
        calculatedBalance,
        closingBreakdown: closingBreakdown || null,
        salesTotals: salesTotals || null,
        updatedAt: closedAt
      }, { merge: true })
      .catch((e) => {
        console.warn("Erro ao fechar sessão no Firebase:", e);
      });
    }

    return sessionData;
  },

  getSessionSalesTotals: async (sessionOrTimestamp: CashRegisterSession | number) => {
    const openedAt = typeof sessionOrTimestamp === 'number' 
      ? sessionOrTimestamp 
      : sessionOrTimestamp.openedAt;
    const orders: Order[] = await StorageService.getOrders();
    const sessionOrders = orders.filter(o => 
      o.status === OrderStatus.CLOSED && 
      new Date(o.createdAt).getTime() >= openedAt
    );

    let pix = 0;
    let debit = 0;
    let credit = 0;
    let cash = 0;

    sessionOrders.forEach(o => {
      if (o.payments && o.payments.length > 0) {
        o.payments.forEach(p => {
          if (p.method === PaymentMethod.PIX) pix += p.amount;
          else if (p.method === PaymentMethod.DEBIT) debit += p.amount;
          else if (p.method === PaymentMethod.CREDIT) credit += p.amount;
          else if (p.method === PaymentMethod.CASH) cash += p.amount;
        });
      } else if (o.paymentMethod) {
        if (o.paymentMethod === PaymentMethod.PIX) pix += o.total;
        else if (o.paymentMethod === PaymentMethod.DEBIT) debit += o.total;
        else if (o.paymentMethod === PaymentMethod.CREDIT) credit += o.total;
        else if (o.paymentMethod === PaymentMethod.CASH) cash += o.total;
      }
    });

    return { pix, debit, credit, cash, money: cash };
  },

  // ─── Settings & Global ────────────────────────────────────────────────

  getLogo: (): string | null => {
    return localStorage.getItem(LS_KEYS.LOGO);
  },

  saveLogo: async (base64: string): Promise<void> => {
    localStorage.setItem(LS_KEYS.LOGO, base64);
    window.dispatchEvent(new CustomEvent('logo-updated'));
    window.dispatchEvent(new CustomEvent('settings-changed'));
    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await setDoc(doc(db, 'system_settings', 'global'), {
          logoUrl: base64,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {}
    }
  },

  removeLogo: async (): Promise<void> => {
    localStorage.removeItem(LS_KEYS.LOGO);
    window.dispatchEvent(new CustomEvent('logo-updated'));
    window.dispatchEvent(new CustomEvent('settings-changed'));
    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await setDoc(doc(db, 'system_settings', 'global'), {
          logoUrl: null,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {}
    }
  },

  getReportPassword: (): string => {
    return localStorage.getItem(LS_KEYS.REPORT_PASSWORD) || 'joel123';
  },

  saveReportPassword: async (password: string): Promise<void> => {
    localStorage.setItem(LS_KEYS.REPORT_PASSWORD, password);
    window.dispatchEvent(new CustomEvent('settings-changed'));
    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        await setDoc(doc(db, 'system_settings', 'global'), {
          reportPassword: password,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {}
    }
  },

  syncGlobalSettings: async (): Promise<void> => {
    if (isFirebaseConfigured() && db && navigator.onLine) {
      try {
        const snap = await getDoc(doc(db, 'system_settings', 'global'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.logoUrl) {
            localStorage.setItem(LS_KEYS.LOGO, data.logoUrl);
            window.dispatchEvent(new CustomEvent('logo-updated'));
          } else if (data.logoUrl === null) {
            localStorage.removeItem(LS_KEYS.LOGO);
            window.dispatchEvent(new CustomEvent('logo-updated'));
          }
          if (data.reportPassword) {
            localStorage.setItem(LS_KEYS.REPORT_PASSWORD, data.reportPassword);
          }
          window.dispatchEvent(new CustomEvent('settings-changed'));
        }
      } catch (e) {}
    }
  },

  syncPendingData: async (): Promise<void> => {
    // Sincronização de contingência
    if (!isFirebaseConfigured() || !db || !navigator.onLine) return;
    try {
      const orders: Order[] = JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || '[]');
      const pendingOrders = orders.filter(o => o.syncStatus === 'pending');
      for (const order of pendingOrders) {
        await StorageService.pushOrderToFirebase(order);
        order.syncStatus = 'synced';
      }
      localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.warn("Sync pending orders warning:", e);
    }
  },

  // ─── Stock Control Helpers ────────────────────────────────────────────

  isBeverage: (item: MenuItem | undefined) => {
    if (!item) return false;
    const cat = (item.category || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return cat === 'bebidas' || cat === 'bebida';
  },

  getAutoDisabledProductIds: (fillings: Filling[], menuFillings: MenuItemFilling[], products: MenuItem[] = []): Set<string> => {
    const outOfStockFillingIds = new Set(fillings.filter(f => !f.inStock).map(f => f.id));
    const disabledIds = new Set<string>();

    products.forEach(p => {
      if (p.stockQuantity !== undefined && p.stockQuantity !== null && p.stockQuantity <= 0) {
        disabledIds.add(p.id);
      }
      if (p.inStock === false) {
        disabledIds.add(p.id);
      }
    });

    if (outOfStockFillingIds.size === 0) return disabledIds;

    const fillingsByProduct = new Map<string, string[]>();
    menuFillings.forEach(mf => {
      if (!fillingsByProduct.has(mf.menuItemId)) fillingsByProduct.set(mf.menuItemId, []);
      fillingsByProduct.get(mf.menuItemId)!.push(mf.fillingId);
    });

    fillingsByProduct.forEach((fIds, productId) => {
      const product = products.find(p => p.id === productId);
      const isBev = StorageService.isBeverage(product);
      if (isBev && fIds.length > 0) {
        if (fIds.every(fid => outOfStockFillingIds.has(fid))) {
          disabledIds.add(productId);
        }
      } else if (fIds.some(fid => outOfStockFillingIds.has(fid))) {
        disabledIds.add(productId);
      }
    });

    return disabledIds;
  },

  decrementStock: async (order: Order) => {
    const products: MenuItem[] = JSON.parse(localStorage.getItem(LS_KEYS.MENU) || '[]');
    let changed = false;

    for (const item of order.items) {
      const pIdx = products.findIndex(p => p.id === item.menuItemId);
      if (pIdx >= 0 && products[pIdx].stockQuantity !== undefined && products[pIdx].stockQuantity !== null) {
        if (!StorageService.isBeverage(products[pIdx]) || !item.fillingId) {
          products[pIdx].stockQuantity = Math.max(0, (products[pIdx].stockQuantity || 0) - item.quantity);
          products[pIdx].syncStatus = 'pending';
          products[pIdx].updatedAt = Date.now();
          changed = true;
        }
      }
    }

    if (changed) {
      localStorage.setItem(LS_KEYS.MENU, JSON.stringify(products));
      if (isFirebaseConfigured() && db && navigator.onLine) {
        try {
          for (const p of products) {
            if (p.syncStatus === 'pending') {
              await updateDoc(doc(db, 'menu_items', p.id), {
                stockQuantity: p.stockQuantity,
                updatedAt: Date.now()
              });
            }
          }
        } catch (e) {}
      }
    }

    // Decrement Fillings
    const fillings: Filling[] = JSON.parse(localStorage.getItem(LS_KEYS.FILLINGS) || '[]');
    let fillingsChanged = false;
    for (const item of order.items) {
      if (item.fillingId) {
        const fIdx = fillings.findIndex(f => f.id === item.fillingId);
        if (fIdx >= 0 && fillings[fIdx].stockQuantity !== undefined && fillings[fIdx].stockQuantity !== null) {
          fillings[fIdx].stockQuantity = Math.max(0, (fillings[fIdx].stockQuantity || 0) - item.quantity);
          fillings[fIdx].syncStatus = 'pending';
          fillingsChanged = true;
        }
      }
    }

    if (fillingsChanged) {
      localStorage.setItem(LS_KEYS.FILLINGS, JSON.stringify(fillings));
      if (isFirebaseConfigured() && db && navigator.onLine) {
        try {
          for (const f of fillings) {
            if (f.syncStatus === 'pending') {
              await updateDoc(doc(db, 'fillings', f.id), {
                stockQuantity: f.stockQuantity,
                updatedAt: Date.now()
              });
            }
          }
        } catch (e) {}
      }
    }
  },

  restoreOrderStock: async (order: Order) => {
    const products: MenuItem[] = JSON.parse(localStorage.getItem(LS_KEYS.MENU) || '[]');
    let changed = false;

    for (const item of order.items) {
      const pIdx = products.findIndex(p => p.id === item.menuItemId);
      if (pIdx >= 0 && products[pIdx].stockQuantity !== undefined && products[pIdx].stockQuantity !== null) {
        if (!StorageService.isBeverage(products[pIdx]) || !item.fillingId) {
          products[pIdx].stockQuantity = (products[pIdx].stockQuantity || 0) + item.quantity;
          products[pIdx].syncStatus = 'pending';
          products[pIdx].updatedAt = Date.now();
          changed = true;
        }
      }
    }

    if (changed) {
      localStorage.setItem(LS_KEYS.MENU, JSON.stringify(products));
      if (isFirebaseConfigured() && db && navigator.onLine) {
        try {
          for (const p of products) {
            if (p.syncStatus === 'pending') {
              await updateDoc(doc(db, 'menu_items', p.id), {
                stockQuantity: p.stockQuantity,
                updatedAt: Date.now()
              });
            }
          }
        } catch (e) {}
      }
    }

    const fillings: Filling[] = JSON.parse(localStorage.getItem(LS_KEYS.FILLINGS) || '[]');
    let fillingsChanged = false;
    for (const item of order.items) {
      if (item.fillingId) {
        const fIdx = fillings.findIndex(f => f.id === item.fillingId);
        if (fIdx >= 0 && fillings[fIdx].stockQuantity !== undefined && fillings[fIdx].stockQuantity !== null) {
          fillings[fIdx].stockQuantity = (fillings[fIdx].stockQuantity || 0) + item.quantity;
          fillings[fIdx].syncStatus = 'pending';
          fillingsChanged = true;
        }
      }
    }

    if (fillingsChanged) {
      localStorage.setItem(LS_KEYS.FILLINGS, JSON.stringify(fillings));
      if (isFirebaseConfigured() && db && navigator.onLine) {
        try {
          for (const f of fillings) {
            if (f.syncStatus === 'pending') {
              await updateDoc(doc(db, 'fillings', f.id), {
                stockQuantity: f.stockQuantity,
                updatedAt: Date.now()
              });
            }
          }
        } catch (e) {}
      }
    }
  },

  // ─── Session & Profiles ───────────────────────────────────────────────

  getUserProfile: (): UserProfile | null => {
    try {
      const data = localStorage.getItem(LS_KEYS.PROFILE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setUserProfile: (profile: UserProfile | null) => {
    if (profile) {
      localStorage.setItem(LS_KEYS.PROFILE, JSON.stringify(profile));
    } else {
      localStorage.removeItem(LS_KEYS.PROFILE);
    }
  },

  clearUserProfile: () => {
    localStorage.removeItem(LS_KEYS.PROFILE);
  },

  isSessionUnlocked: (): boolean => {
    return sessionStorage.getItem('session_unlocked') === 'true';
  },

  setSessionUnlocked: (unlocked: boolean) => {
    if (unlocked) {
      sessionStorage.setItem('session_unlocked', 'true');
    } else {
      sessionStorage.removeItem('session_unlocked');
    }
  },

  lockSession: () => {
    sessionStorage.removeItem('session_unlocked');
  }
};
