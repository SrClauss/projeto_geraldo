import { useState, useEffect } from 'react';
import { TextField, PrimaryButton, DefaultButton, Stack, ComboBox, IComboBoxOption } from '@fluentui/react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigation } from '../NavigationContext';

export default function NewItemView() {
  const [nome, setNome] = useState('');
  const [fornecedores, setFornecedores] = useState<IComboBoxOption[]>([]);
  const [fornecedorId, setFornecedorId] = useState('');
  const [saving, setSaving] = useState(false);
  const { navigate } = useNavigation();

  useEffect(() => { loadFornecedores(); }, []);

  const loadFornecedores = async () => {
    try {
      const res = await invoke<any[]>('list_fornecedores', { page: 0, pageSize: 200 });
      const opts = res.map(f => ({ key: f.id, text: f.nome }));
      setFornecedores(opts);
      if (opts.length > 0) setFornecedorId(opts[0].key as string);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    if (!nome.trim()) { alert('Nome é obrigatório'); return; }
    if (!fornecedorId) { alert('Selecione um fornecedor'); return; }
    try {
      setSaving(true);
      await invoke('create_item', { nome, fornecedorId });
      navigate('cadastros-itens');
    } catch (e) { console.error(e); alert('Erro ao criar item'); } finally { setSaving(false); }
  };

  return (
    <div className="view-container">
      <h2>Novo Item</h2>
      <Stack tokens={{ childrenGap: 12 }}>
        <Stack horizontal tokens={{ childrenGap: 12 }} styles={{ root: { alignItems: 'flex-end' } }}>
          <TextField label="Nome" value={nome} onChange={(_, v) => setNome(v || '')} styles={{ root: { minWidth: 420 } }} />
          <ComboBox label="Fornecedor" options={fornecedores} selectedKey={fornecedorId} onChange={(_, o) => setFornecedorId(o?.key as string || '')} allowFreeform autoComplete="on" styles={{ root: { minWidth: 320 } }} />
        </Stack>
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <PrimaryButton text="Criar" onClick={handleSave} disabled={saving} />
          <DefaultButton text="Cancelar" onClick={() => navigate('cadastros-itens')} />
        </Stack>
      </Stack>
    </div>
  );
}
