import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }

  connect(tenantId = null) {
    if (this.socket && this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:6001'}/ws`;
    
    this.socket = io(wsUrl, {
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      if (tenantId) {
        this.socket.emit('join-tenant', { tenantId });
        console.log(`Client ${this.socket.id} joined tenant ${tenantId}`);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => {
          this.connect(tenantId);
        }, this.reconnectDelay * this.reconnectAttempts);
      } else {
        toast.error('اتصال WebSocket ناموفق بود');
      }
    });

    // Handle incoming messages
    this.socket.on('message', (data) => {
      this.handleMessage(data);
    });

    // Handle specific events
    this.socket.on('transaction:created', (data) => {
      this.emit('transaction:created', data);
    });

    this.socket.on('transaction:updated', (data) => {
      this.emit('transaction:updated', data);
    });

    this.socket.on('remittance:created', (data) => {
      this.emit('remittance:created', data);
    });

    this.socket.on('remittance:updated', (data) => {
      this.emit('remittance:updated', data);
    });

    this.socket.on('p2p:new_order', (data) => {
      this.emit('p2p:new_order', data);
    });

    this.socket.on('p2p:order_updated', (data) => {
      this.emit('p2p:order_updated', data);
    });

    this.socket.on('chat:new_message', (data) => {
      this.emit('chat:new_message', data);
    });

    this.socket.on('payment:status_changed', (data) => {
      this.emit('payment:status_changed', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  handleMessage(data) {
    const event = data.type || 'message';
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }
  }

  // Join specific room
  joinRoom(room) {
    this.emit('join-room', { room });
  }

  // Leave specific room
  leaveRoom(room) {
    this.emit('leave-room', { room });
  }

  // Send message to specific room
  sendToRoom(room, message) {
    this.emit('room-message', { room, message });
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService; 