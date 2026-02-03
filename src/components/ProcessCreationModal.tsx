import { useState, useEffect } from 'react';
import { Dialog, DialogType, DialogFooter, PrimaryButton, DefaultButton, TextField, ComboBox, IComboBoxOption, Stack } from '@fluentui/react';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  hidden: boolean;
  onDismiss: () => void;
  onSaved: () => void;
}

export default function ProcessCreationModal({ hidden, onDismiss, onSaved }: Props) {
  const [nome, setNome] = useState('');
  const [formulas, setFormulas] = useState<IComboBoxOption[]>([]);
  const [formulaId, setFormulaId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hidden) loadFormulas();
  }, [hidden]);

  const loadFormulas = async () => {
    try {
      const f = await invoke<any[]>('list_formulas', { page: 0, pageSize: 200 });
      const opts = f.map(ff => ({ key: ff.id, text: ff.nome }));
      setFormulas(opts);
      if (opts.length > 0) setFormulaId(opts[0].key as string);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) { alert('Nome é obrigatório'); return; }
    if (!formulaId) { alert('Selecione uma fórmula'); return; }
    try {
      setSaving(true);
      await invoke('create_processo', { nome, formulaId });
      onSaved();
      setNome('');
      onDismiss();
    } catch (e) {
      console.error(e);
      alert('Erro ao criar processo: ' + e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      hidden={hidden}
      onDismiss={onDismiss}
      dialogContentProps={{ type: DialogType.normal, title: 'Novo Processo' }}
      modalProps={{ isBlocking: true, styles: { main: { maxWidth: 900, top: '6%' } } }}
    >
      <Stack tokens={{ childrenGap: 12 }}>
        <Stack horizontal tokens={{ childrenGap: 12 }} styles={{ root: { alignItems: 'flex-end' } }}>
          <TextField label="Nome do Processo" value={nome} onChange={(_, v) => setNome(v || '')} styles={{ root: { minWidth: 420 } }} />
          <ComboBox label="Fórmula" options={formulas} selectedKey={formulaId} onChange={(_, o) => setFormulaId(o?.key as string || '')} allowFreeform autoComplete="on" styles={{ root: { minWidth: 320 } }} />
        </Stack>
        <div style={{ color: '#605e5c', fontSize: 13 }}>
          Preencha o nome e escolha a fórmula. O peso total do processo será calculado automaticamente a partir dos itens da fórmula.
        </div>
      </Stack>

      <DialogFooter>
        <PrimaryButton text="Criar Processo" onClick={handleSave} disabled={saving} />
        <DefaultButton text="Cancelar" onClick={onDismiss} />
      </DialogFooter>
    </Dialog>
  );
}
