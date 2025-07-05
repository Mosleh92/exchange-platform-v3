import React, { createContext, useContext } from 'react';
import { SnackbarProvider, useSnackbar } from 'notistack';

const AlertContext = createContext();

export function AlertProvider({ children }) {
  const { enqueueSnackbar } = useSnackbar();

  const showAlert = (message, variant = 'default') => {
    enqueueSnackbar(message, { variant });
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  return useContext(AlertContext);
}

// Usage: Wrap your App with <SnackbarProvider><AlertProvider>...</AlertProvider></SnackbarProvider>
// Then use useAlert() in any component to showAlert('پیام', 'success'|'error'|'info'|'warning') 