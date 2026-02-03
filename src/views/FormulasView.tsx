import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TextField, PrimaryButton, DetailsList, IColumn, Stack, DefaultButton } from '@fluentui/react';
import { useNavigation } from '../NavigationContext';

export default function FormulasView() {
  const [query, setQuery] = useState('');
  const [formulas, setFormulas] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const { navigate } = useNavigation();

  useEffect(() => { load(); }, [page]);

  const load = async () => {
    try {
      if (query.trim()) {
        const res = await invoke<any[]>('search_formulas', { name: query, page, pageSize: 10 });
        setFormulas(res);
      } else {
        const res = await invoke<any[]>('list_formulas', { page, pageSize: 10 });
        setFormulas(res);
      }
    } catch (e) { console.error(e); }
  };

  const columns: IColumn[] = [
    { key: 'nome', name: 'Nome', fieldName: 'nome', minWidth: 200, isResizable: true },
    { key: 'itens', name: 'Itens', fieldName: 'itens', minWidth: 300, onRender: (f:any) => f.itens.map((it:any)=>`${it.item.nome}(${it.peso}kg)`).join(', ') }
  ];

  return (
    <div className="view-container">
      <h2>Fórmulas</h2>
      <Stack tokens={{ childrenGap: 12 }}>
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <TextField placeholder="Pesquisar" value={query} onChange={(_, v) => setQuery(v || '')} />
          <PrimaryButton text="Buscar" onClick={() => { setPage(0); load(); }} />
          <DefaultButton text="Nova Fórmula" onClick={() => navigate('nova-formula')} />
        </Stack>
        <DetailsList items={formulas} columns={columns} selectionMode={0} />
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <DefaultButton text="Anterior" onClick={() => { if (page>0) setPage(page-1); }} />
          <DefaultButton text="Próxima" onClick={() => setPage(page+1)} />
        </Stack>
      </Stack>
    </div>
  );
}
