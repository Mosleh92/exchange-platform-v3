import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export const useWebSocket = () => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(WS_URL, {
      auth: {
        token: token,
      },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
      
      // Clear any existing reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
      
      // Attempt to reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (newSocket.connected === false) {
          newSocket.connect();
        }
      }, 5000);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      toast.error('Connection error. Retrying...');
    });

    newSocket.on('notification', (notification) => {
      toast.success(notification.message);
    });

    newSocket.on('tenant_notification', (notification) => {
      toast.info(notification.message);
    });

    newSocket.on('trading_update', (update) => {
      // Handle trading updates
      console.log('Trading update:', update);
    });

    newSocket.on('p2p_update', (update) => {
      // Handle P2P updates
      console.log('P2P update:', update);
    });

    setSocket(newSocket);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.close();
    };
  }, [isAuthenticated, user]);

  const joinTradingRoom = (pair) => {
    if (socket && isConnected) {
      socket.emit('join_trading_room', { pair });
    }
  };

  const leaveTradingRoom = (pair) => {
    if (socket && isConnected) {
      socket.emit('leave_trading_room', { pair });
    }
  };

  const joinP2PRoom = () => {
    if (socket && isConnected) {
      socket.emit('join_p2p_room');
    }
  };

  const markNotificationAsRead = (notificationId) => {
    if (socket && isConnected) {
      socket.emit('mark_notification_read', notificationId);
    }
  };

  return {
    socket,
    isConnected,
    joinTradingRoom,
    leaveTradingRoom,
    joinP2PRoom,
    markNotificationAsRead,
  };
};
