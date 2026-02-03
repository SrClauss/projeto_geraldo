import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TextField, PrimaryButton, DetailsList, IColumn, Stack, DefaultButton } from '@fluentui/react';
import { useNavigation } from '../NavigationContext';

export default function ItensView() {
  const [query, setQuery] = useState('');
  const [itens, setItens] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const { navigate } = useNavigation();

  useEffect(() => { load(); }, [page]);

  const load = async () => {
    try {
      if (query.trim()) {
        const res = await invoke<any[]>('search_itens', { name: query, page, pageSize: 10 });
        setItens(res);
      } else {
        const res = await invoke<any[]>('list_itens', { page, pageSize: 10 });
        setItens(res);
      }
    } catch (e) { console.error(e); }
  };

  const columns: IColumn[] = [
    { key: 'nome', name: 'Nome', fieldName: 'nome', minWidth: 150, isResizable: true },
    { key: 'fornecedor', name: 'Fornecedor', fieldName: 'fornecedor', minWidth: 150, isResizable: true, onRender: (i: any) => i.fornecedor.nome }
  ];

  return (
    <div className="view-container">
      <h2>Itens</h2>
      <Stack tokens={{ childrenGap: 12 }}>
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <TextField placeholder="Pesquisar" value={query} onChange={(_, v) => setQuery(v || '')} />
          <PrimaryButton text="Buscar" onClick={() => { setPage(0); load(); }} />
          <DefaultButton text="Novo Item" onClick={() => navigate('novo-item')} />
        </Stack>
        <DetailsList items={itens} columns={columns} selectionMode={0} />
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <DefaultButton text="Anterior" onClick={() => { if (page>0) setPage(page-1); }} />
          <DefaultButton text="Próxima" onClick={() => setPage(page+1)} />
        </Stack>
      </Stack>
    </div>
  );
}
