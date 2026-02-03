import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TextField, PrimaryButton, DetailsList, IColumn, Stack, DefaultButton } from '@fluentui/react';
import { useNavigation } from '../NavigationContext';

export default function UsersView() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const { navigate } = useNavigation();

  useEffect(() => { load(); }, [page]);

  const load = async () => {
    try {
      if (query.trim()) {
        const res = await invoke<any[]>('search_users', { name: query, page, pageSize: 10 });
        setUsers(res);
      } else {
        const res = await invoke<any[]>('list_users', { page, pageSize: 10 });
        setUsers(res);
      }
    } catch (e) { console.error(e); }
  };

  const columns: IColumn[] = [
    { key: 'username', name: 'Usuário', fieldName: 'username', minWidth: 150, isResizable: true },
    { key: 'role', name: 'Role', fieldName: 'role', minWidth: 100, isResizable: true, onRender: (u:any) => u.role }
  ];

  return (
    <div className="view-container">
      <h2>Usuários</h2>
      <p><strong>⚠️ Acesso restrito a administradores</strong></p>
      <Stack tokens={{ childrenGap: 12 }}>
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <TextField placeholder="Pesquisar" value={query} onChange={(_, v) => setQuery(v || '')} />
          <PrimaryButton text="Buscar" onClick={() => { setPage(0); load(); }} />
          <DefaultButton text="Novo Usuário" onClick={() => navigate('novo-usuario')} />
        </Stack>
        <DetailsList items={users} columns={columns} selectionMode={0} />
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <DefaultButton text="Anterior" onClick={() => { if (page>0) setPage(page-1); }} />
          <DefaultButton text="Próxima" onClick={() => setPage(page+1)} />
        </Stack>
      </Stack>
    </div>
  );
}
