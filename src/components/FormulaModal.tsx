import { useState, useEffect } from 'react';
import { Dialog, DialogType, DialogFooter, PrimaryButton, DefaultButton, TextField, ComboBox, Stack } from '@fluentui/react';
import { invoke } from '@tauri-apps/api/core';

interface ItemOption { id: string; nome: string }

interface Props {
  hidden: boolean;
  onDismiss: () => void;
  onSaved: () => void;
}

export default function FormulaModal({ hidden, onDismiss, onSaved }: Props) {
  const [nome, setNome] = useState('');
  const [items, setItems] = useState<ItemOption[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [peso, setPeso] = useState('0');
  const [rows, setRows] = useState<Array<{itemId:string,peso:number,nome:string}>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!hidden) loadItems(); }, [hidden]);

  const loadItems = async () => {
    try {
      const it = await invoke<any[]>('list_itens', { page: 0, pageSize: 100 });
      const opts = it.map(i => ({ id: i.id, nome: i.nome }));
      setItems(opts);
      if (opts.length > 0) setSelectedItemId(opts[0].id);
    } catch (e) { console.error(e); }
  };

  const addRow = () => {
    if (!selectedItemId) return;
    const it = items.find(i => i.id === selectedItemId);
    if (!it) return;
    setRows([...rows, { itemId: selectedItemId, peso: parseFloat(peso) || 0, nome: it.nome }]);
  };

  const handleSave = async () => {
    if (!nome.trim()) { alert('Nome é obrigatório'); return; }
    if (rows.length === 0) { alert('Adicione ao menos 1 item com peso'); return; }
    try {
      setSaving(true);
      const itensPayload = rows.map(r => [r.itemId, r.peso]);
      await invoke('create_formula', { nome, itens: itensPayload });
      onSaved();
      setNome(''); setRows([]);
      onDismiss();
    } catch (e) { console.error(e); alert('Erro ao salvar fórmula'); } finally { setSaving(false); }
  };

  return (
    <Dialog hidden={hidden} onDismiss={onDismiss} dialogContentProps={{ type: DialogType.normal, title: 'Nova Fórmula' }} modalProps={{ isBlocking: true, topOffsetFixed: true, styles: { main: { maxWidth: 900, top: '6%' } } }}>
      <Stack tokens={{ childrenGap: 12 }}>
        <TextField label="Nome" value={nome} onChange={(_, v) => setNome(v || '')} />
        <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="end" styles={{ root: { flexWrap: 'wrap' } }}>
          <ComboBox label="Item" options={items.map(i => ({ key: i.id, text: i.nome }))} selectedKey={selectedItemId} onChange={(_, o) => setSelectedItemId(o?.key as string || '')} allowFreeform autoComplete="on" styles={{ root: { minWidth: 260 } }} />
          <TextField label="Peso (kg por sprint)" value={peso} onChange={(_, v) => setPeso(v || '0')} styles={{ root: { minWidth: 180 } }} />
          <PrimaryButton text="Adicionar" onClick={addRow} />
        </Stack>
        <div style={{ marginTop: 12 }}>
          {rows.map((r, i) => (<div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>{r.nome} — <strong>{r.peso} kg</strong></div>))}
        </div>
      </Stack>
      <DialogFooter>
        <PrimaryButton text="Salvar" onClick={handleSave} disabled={saving} />
        <DefaultButton text="Cancelar" onClick={onDismiss} />
      </DialogFooter>
    </Dialog>
  );
}
