import { useState } from 'react';
import { Dialog, DialogType, DialogFooter, PrimaryButton, DefaultButton, TextField, Stack } from '@fluentui/react';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  hidden: boolean;
  onDismiss: () => void;
  onSaved: () => void;
}

export default function FornecedorModal({ hidden, onDismiss, onSaved }: Props) {
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nome.trim()) {
      alert('Nome é obrigatório');
      return;
    }
    try {
      setSaving(true);
      await invoke('create_fornecedor', { nome });
      onSaved();
      setNome('');
      onDismiss();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar fornecedor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog hidden={hidden} onDismiss={onDismiss} dialogContentProps={{ type: DialogType.normal, title: 'Novo Fornecedor' }} modalProps={{ isBlocking: true, topOffsetFixed: true, styles: { main: { maxWidth: 700, top: '6%' } } }}>
      <Stack tokens={{ childrenGap: 12 }}>
        <TextField label="Nome" value={nome} onChange={(_, v) => setNome(v || '')} styles={{ root: { width: '100%' } }} />
        <div style={{ color: '#605e5c', fontSize: 13 }}>Dica: nomes curtos funcionam melhor em tabelas.</div>
      </Stack>
      <DialogFooter>
        <PrimaryButton text="Salvar" onClick={handleSave} disabled={saving} />
        <DefaultButton text="Cancelar" onClick={onDismiss} />
      </DialogFooter>
    </Dialog>
  );
}
