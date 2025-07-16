import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { toast } from 'react-hot-toast';

// State synchronization context for real-time data consistency
const StateSyncContext = createContext();

// Action types
const ACTIONS = {
  UPDATE_TRANSACTION: 'UPDATE_TRANSACTION',
  UPDATE_BALANCE: 'UPDATE_BALANCE',
  UPDATE_P2P_ORDER: 'UPDATE_P2P_ORDER',
  UPDATE_NOTIFICATION: 'UPDATE_NOTIFICATION',
  CLEAR_TENANT_DATA: 'CLEAR_TENANT_DATA',
  SYNC_REQUIRED: 'SYNC_REQUIRED'
};

// Initial state
const initialState = {
  transactions: new Map(),
  balances: new Map(),
  p2pOrders: new Map(),
  notifications: [],
  lastSync: null,
  isSyncing: false,
  syncErrors: []
};

// Reducer for state management
const stateSyncReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.UPDATE_TRANSACTION:
      return {
        ...state,
        transactions: new Map(state.transactions).set(action.payload.id, {
          ...state.transactions.get(action.payload.id),
          ...action.payload,
          lastUpdated: new Date().toISOString()
        })
      };

    case ACTIONS.UPDATE_BALANCE:
      return {
        ...state,
        balances: new Map(state.balances).set(action.payload.currency, {
          ...state.balances.get(action.payload.currency),
          ...action.payload,
          lastUpdated: new Date().toISOString()
        })
      };

    case ACTIONS.UPDATE_P2P_ORDER:
      return {
        ...state,
        p2pOrders: new Map(state.p2pOrders).set(action.payload.id, {
          ...state.p2pOrders.get(action.payload.id),
          ...action.payload,
          lastUpdated: new Date().toISOString()
        })
      };

    case ACTIONS.UPDATE_NOTIFICATION:
      return {
        ...state,
        notifications: [
          action.payload,
          ...state.notifications.filter(n => n.id !== action.payload.id)
        ].slice(0, 50) // Keep only last 50 notifications
      };

    case ACTIONS.CLEAR_TENANT_DATA:
      return {
        ...initialState,
        lastSync: null
      };

    case ACTIONS.SYNC_REQUIRED:
      return {
        ...state,
        isSyncing: action.payload.isSyncing,
        syncErrors: action.payload.errors || state.syncErrors
      };

    default:
      return state;
  }
};

export const StateSyncProvider = ({ children }) => {
  const [state, dispatch] = useReducer(stateSyncReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const { tenant } = useTenant();
  const { socket, isConnected } = useWebSocket();

  // Sync data when user/tenant changes
  useEffect(() => {
    if (isAuthenticated && user && tenant) {
      syncAllData();
    } else {
      dispatch({ type: ACTIONS.CLEAR_TENANT_DATA });
    }
  }, [isAuthenticated, user?.id, tenant?.id]);

  // Handle WebSocket real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleTransactionUpdate = (data) => {
      dispatch({
        type: ACTIONS.UPDATE_TRANSACTION,
        payload: data.transaction
      });

      // Show notification for important updates
      if (data.transaction.status === 'completed') {
        toast.success('تراکنش با موفقیت تکمیل شد');
      } else if (data.transaction.status === 'failed') {
        toast.error('تراکنش ناموفق بود');
      }
    };

    const handleBalanceUpdate = (data) => {
      dispatch({
        type: ACTIONS.UPDATE_BALANCE,
        payload: data.balance
      });

      // Show notification for significant balance changes
      if (Math.abs(data.balance.change) > 1000) {
        toast.info(`موجودی ${data.balance.currency} به‌روزرسانی شد`);
      }
    };

    const handleP2PUpdate = (data) => {
      dispatch({
        type: ACTIONS.UPDATE_P2P_ORDER,
        payload: data.order
      });

      // Show notification for P2P updates
      if (data.type === 'new_order') {
        toast.info('سفارش جدید P2P اضافه شد');
      } else if (data.type === 'order_matched') {
        toast.success('سفارش P2P شما تطبیق یافت');
      }
    };

    const handleNotification = (data) => {
      dispatch({
        type: ACTIONS.UPDATE_NOTIFICATION,
        payload: {
          id: Date.now(),
          ...data,
          timestamp: new Date().toISOString()
        }
      });

      // Show toast notification
      if (data.type === 'success') {
        toast.success(data.message);
      } else if (data.type === 'error') {
        toast.error(data.message);
      } else {
        toast.info(data.message);
      }
    };

    // Listen for real-time updates
    socket.on('transaction_update', handleTransactionUpdate);
    socket.on('balance_update', handleBalanceUpdate);
    socket.on('p2p_update', handleP2PUpdate);
    socket.on('notification', handleNotification);

    return () => {
      socket.off('transaction_update', handleTransactionUpdate);
      socket.off('balance_update', handleBalanceUpdate);
      socket.off('p2p_update', handleP2PUpdate);
      socket.off('notification', handleNotification);
    };
  }, [socket, isConnected]);

  // Sync all data from server
  const syncAllData = useCallback(async () => {
    if (!isAuthenticated || !user || !tenant) return;

    dispatch({ type: ACTIONS.SYNC_REQUIRED, payload: { isSyncing: true } });

    try {
      const api = (await import('../services/api')).default;

      // Sync transactions
      const transactionsResponse = await api.get('/api/transactions?limit=100');
      const transactions = new Map();
      transactionsResponse.data.transactions.forEach(t => {
        transactions.set(t.id, { ...t, lastUpdated: new Date().toISOString() });
      });

      // Sync balances
      const balancesResponse = await api.get('/api/accounts/balances');
      const balances = new Map();
      balancesResponse.data.balances.forEach(b => {
        balances.set(b.currency, { ...b, lastUpdated: new Date().toISOString() });
      });

      // Sync P2P orders
      const p2pResponse = await api.get('/api/p2p/orders');
      const p2pOrders = new Map();
      p2pResponse.data.orders.forEach(o => {
        p2pOrders.set(o.id, { ...o, lastUpdated: new Date().toISOString() });
      });

      // Update state with synced data
      dispatch({
        type: ACTIONS.SYNC_REQUIRED,
        payload: { 
          isSyncing: false,
          errors: []
        }
      });

      // Update individual data
      transactions.forEach(t => {
        dispatch({ type: ACTIONS.UPDATE_TRANSACTION, payload: t });
      });

      balances.forEach(b => {
        dispatch({ type: ACTIONS.UPDATE_BALANCE, payload: b });
      });

      p2pOrders.forEach(o => {
        dispatch({ type: ACTIONS.UPDATE_P2P_ORDER, payload: o });
      });

    } catch (error) {
      console.error('Data sync failed:', error);
      dispatch({
        type: ACTIONS.SYNC_REQUIRED,
        payload: { 
          isSyncing: false,
          errors: [error.message]
        }
      });
      toast.error('خطا در همگام‌سازی داده‌ها');
    }
  }, [isAuthenticated, user, tenant]);

  // Manual sync function
  const manualSync = useCallback(() => {
    syncAllData();
  }, [syncAllData]);

  // Get data with automatic sync
  const getTransaction = useCallback((id) => {
    return state.transactions.get(id);
  }, [state.transactions]);

  const getBalance = useCallback((currency) => {
    return state.balances.get(currency);
  }, [state.balances]);

  const getP2POrder = useCallback((id) => {
    return state.p2pOrders.get(id);
  }, [state.p2pOrders]);

  const getAllTransactions = useCallback(() => {
    return Array.from(state.transactions.values());
  }, [state.transactions]);

  const getAllBalances = useCallback(() => {
    return Array.from(state.balances.values());
  }, [state.balances]);

  const getAllP2POrders = useCallback(() => {
    return Array.from(state.p2pOrders.values());
  }, [state.p2pOrders]);

  const getNotifications = useCallback(() => {
    return state.notifications;
  }, [state.notifications]);

  const value = {
    // State
    isSyncing: state.isSyncing,
    lastSync: state.lastSync,
    syncErrors: state.syncErrors,

    // Actions
    manualSync,
    syncAllData,

    // Data getters
    getTransaction,
    getBalance,
    getP2POrder,
    getAllTransactions,
    getAllBalances,
    getAllP2POrders,
    getNotifications,

    // Direct state access (for performance)
    transactions: state.transactions,
    balances: state.balances,
    p2pOrders: state.p2pOrders,
    notifications: state.notifications
  };

  return (
    <StateSyncContext.Provider value={value}>
      {children}
    </StateSyncContext.Provider>
  );
};

export const useStateSync = () => {
  const context = useContext(StateSyncContext);
  if (!context) {
    throw new Error('useStateSync must be used within a StateSyncProvider');
  }
  return context;
}; 