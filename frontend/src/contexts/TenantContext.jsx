import React, { createContext, useContext, useState } from "react";
import api from '../services/api';
import { toast } from 'react-hot-toast';

// 1. Create the context
const TenantContext = createContext();

// 2. Create the Provider component
export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null); // { id, name, ... }
  const [branch, setBranch] = useState(null); // { id, name, ... }
  const [customer, setCustomer] = useState(null); // { id, name, ... }

  return (
    <TenantContext.Provider value={{ tenant, setTenant, branch, setBranch, customer, setCustomer }}>
      {children}
    </TenantContext.Provider>
  );
};

// 3. Create a custom hook for convenience
export const useTenant = () => useContext(TenantContext); 