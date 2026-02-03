import { Nav } from '@fluentui/react';

export type SidebarSelect = 'home' | 'processos' | 'sprints' | 'cadastros-formulas' | 'cadastros-fornecedores' | 'cadastros-itens' | 'cadastros-users' | 'novo-fornecedor' | 'novo-item' | 'nova-formula' | 'novo-usuario' | 'novo-processo' | 'novo-sprint';

import { useNavigation } from '../NavigationContext';

export default function Sidebar() {
  const nav = useNavigation();

  return (
    <nav className="app-sidebar">
      <Nav
        groups={[
          {
            name: 'Principal',
            links: [
              { name: '🏠 Dashboard', url: '#', key: 'home', onClick: () => nav.navigate('home') },
              { name: '📦 Processos', url: '#', key: 'processos', onClick: () => nav.navigate('processos') },
              { name: '📊 Histórico', url: '#', key: 'sprints', onClick: () => nav.navigate('sprints') },
            ],
          },
          {
            name: 'Configurações',
            links: [
              { name: '⚗️ Fórmulas', url: '#', key: 'cadastros-formulas', onClick: () => nav.navigate('cadastros-formulas') },
              { name: '🏭 Fornecedores', url: '#', key: 'cadastros-fornecedores', onClick: () => nav.navigate('cadastros-fornecedores') },
              { name: '📦 Itens', url: '#', key: 'cadastros-itens', onClick: () => nav.navigate('cadastros-itens') },
              { name: '👤 Usuários', url: '#', key: 'cadastros-users', onClick: () => nav.navigate('cadastros-users') },
            ],
          },
        ]}
        selectedKey={nav.selected}
      />
    </nav>
  );
}
