const listeners = {};

function on(event, handler) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(handler);
}

function emit(event, data) {
  if (listeners[event]) {
    listeners[event].forEach((handler) => handler(data));
  }
}

module.exports = { on, emit };
