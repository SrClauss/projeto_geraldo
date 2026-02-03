import { useState } from 'react';
import { TextField, PrimaryButton, DefaultButton, Stack } from '@fluentui/react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigation } from '../NavigationContext';

export default function NewFornecedorView() {
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);
  const { navigate } = useNavigation();

  const handleSave = async () => {
    if (!nome.trim()) { alert('Nome é obrigatório'); return; }
    try {
      setSaving(true);
      await invoke('create_fornecedor', { nome });
      // fallback: voltar para lista de fornecedores
      navigate('cadastros-fornecedores');
    } catch (e) { console.error(e); alert('Erro ao criar fornecedor'); } finally { setSaving(false); }
  };

  return (
    <div className="view-container">
      <h2>Novo Fornecedor</h2>
      <Stack tokens={{ childrenGap: 12 }}>
        <TextField label="Nome" value={nome} onChange={(_, v) => setNome(v || '')} />
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <PrimaryButton text="Criar" onClick={handleSave} disabled={saving} />
          <DefaultButton text="Cancelar" onClick={() => navigate('cadastros-fornecedores')} />
        </Stack>
      </Stack>
    </div>
  );
}
