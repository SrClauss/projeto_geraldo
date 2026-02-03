import { useState, useEffect } from 'react';
import { Dialog, DialogType, DialogFooter, PrimaryButton, DefaultButton, TextField, ComboBox, IComboBoxOption, Stack } from '@fluentui/react';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  hidden: boolean;
  onDismiss: () => void;
  onSaved: () => void;
}

export default function ItemModal({ hidden, onDismiss, onSaved }: Props) {
  const [nome, setNome] = useState('');
  const [fornecedores, setFornecedores] = useState<IComboBoxOption[]>([]);
  const [fornecedorId, setFornecedorId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hidden) loadFornecedores();
  }, [hidden]);

  const loadFornecedores = async () => {
    try {
      const f = await invoke<any[]>('list_fornecedores', { page: 0, pageSize: 100 });
      const opts = f.map(ff => ({ key: ff.id, text: ff.nome }));
      setFornecedores(opts);
      if (opts.length > 0) setFornecedorId(opts[0].key as string);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) { alert('Nome é obrigatório'); return; }
    if (!fornecedorId) { alert('Selecione um fornecedor'); return; }
    try {
      setSaving(true);
      await invoke('create_item', { nome, fornecedorId });
      onSaved();
      setNome('');
      onDismiss();
    } catch (e) { console.error(e); alert('Erro ao salvar item'); } finally { setSaving(false); }
  };

  return (
    <Dialog hidden={hidden} onDismiss={onDismiss} dialogContentProps={{ type: DialogType.normal, title: 'Novo Item' }} modalProps={{ isBlocking: true, topOffsetFixed: true, styles: { main: { maxWidth: 800, top: '6%' } } }}>
      <Stack tokens={{ childrenGap: 12 }}>
        <Stack horizontal tokens={{ childrenGap: 12 }} styles={{ root: { alignItems: 'flex-end' } }}>
          <TextField label="Nome" value={nome} onChange={(_, v) => setNome(v || '')} styles={{ root: { minWidth: 420 } }} />
          <ComboBox label="Fornecedor" options={fornecedores} selectedKey={fornecedorId} onChange={(_, o) => setFornecedorId(o?.key as string || '')} allowFreeform autoComplete="on" styles={{ root: { minWidth: 320 } }} />
        </Stack>
        <div style={{ color: '#605e5c', fontSize: 13 }}>Escolha o fornecedor existente ou busque por nome.</div>
      </Stack>
      <DialogFooter>
        <PrimaryButton text="Salvar" onClick={handleSave} disabled={saving} />
        <DefaultButton text="Cancelar" onClick={onDismiss} />
      </DialogFooter>
    </Dialog>
  );
}
