import { useState, useEffect } from 'react';
import { TextField, PrimaryButton, DefaultButton, Stack, ComboBox } from '@fluentui/react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigation } from '../NavigationContext';

export default function NewProcessView() {
  const [nome, setNome] = useState('');
  const [formulas, setFormulas] = useState<any[]>([]);
  const [formulaId, setFormulaId] = useState('');
  const [saving, setSaving] = useState(false);
  const { navigate } = useNavigation();

  useEffect(() => { loadFormulas(); }, []);

  const loadFormulas = async () => {
    try {
      const res = await invoke<any[]>('list_formulas', { page: 0, pageSize: 200 });
      setFormulas(res);
      if (res.length > 0) setFormulaId(res[0].id);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    if (!nome.trim()) { alert('Nome é obrigatório'); return; }
    if (!formulaId) { alert('Selecione uma fórmula'); return; }
    try {
      setSaving(true);
      await invoke('create_processo', { nome, formulaId });
      navigate('processos');
    } catch (e) { console.error(e); alert('Erro ao criar processo'); } finally { setSaving(false); }
  };

  return (
    <div className="view-container">
      <h2>Novo Processo</h2>
      <Stack tokens={{ childrenGap: 12 }}>
        <Stack horizontal tokens={{ childrenGap: 12 }} styles={{ root: { alignItems: 'flex-end' } }}>
          <TextField label="Nome do Processo" value={nome} onChange={(_, v) => setNome(v || '')} styles={{ root: { minWidth: 420 } }} />
          <ComboBox label="Fórmula" options={formulas.map(f => ({ key: f.id, text: f.nome }))} selectedKey={formulaId} onChange={(_, o) => setFormulaId(o?.key as string || '')} allowFreeform={false} styles={{ root: { minWidth: 320 } }} />
        </Stack>
        <div style={{ color: '#605e5c', fontSize: 13 }}>
          Preencha o nome e escolha a fórmula. O peso total do processo será calculado automaticamente a partir dos itens da fórmula.
        </div>
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <PrimaryButton text="Criar Processo" onClick={handleSave} disabled={saving} />
          <DefaultButton text="Cancelar" onClick={() => navigate('processos')} />
        </Stack>
      </Stack>
    </div>
  );
}
