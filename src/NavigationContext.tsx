import React, { createContext, useContext, useState } from 'react';

export type RouteKey =
  | 'home'
  | 'processos'
  | 'sprints'
  | 'cadastros-formulas'
  | 'cadastros-fornecedores'
  | 'cadastros-itens'
  | 'cadastros-users'
  | 'novo-fornecedor'
  | 'novo-item'
  | 'nova-formula'
  | 'novo-usuario'
  | 'novo-processo'
  | 'novo-sprint'
  | 'execucao-sprint'
  | string;

interface NavContext { selected: RouteKey; navigate: (k: RouteKey, payload?: any) => void; payload?: any }

const NavigationContext = createContext<NavContext | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selected, setSelected] = useState<RouteKey>('home');
  const [payload, setPayload] = useState<any>(undefined);
  const navigate = (k: RouteKey, p?: any) => { setPayload(p); setSelected(k); };
  return <NavigationContext.Provider value={{ selected, navigate, payload }}>{children}</NavigationContext.Provider>;
};

export const useNavigation = () => {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used inside NavigationProvider');
  return ctx;
};
