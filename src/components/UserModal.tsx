import { useState } from 'react';
import { Dialog, DialogType, DialogFooter, PrimaryButton, DefaultButton, TextField, ComboBox, Stack } from '@fluentui/react';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  hidden: boolean;
  onDismiss: () => void;
  onSaved: () => void;
}

export default function UserModal({ hidden, onDismiss, onSaved }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!username.trim() || !password) { alert('Preencha usuário e senha'); return; }
    try {
      setSaving(true);
      await invoke('create_user', { username, password, role });
      onSaved();
      setUsername(''); setPassword(''); setRole('User');
      onDismiss();
    } catch (e) { console.error(e); alert('Erro ao criar usuário'); } finally { setSaving(false); }
  };

  return (
    <Dialog hidden={hidden} onDismiss={onDismiss} dialogContentProps={{ type: DialogType.normal, title: 'Novo Usuário' }} modalProps={{ isBlocking: true, topOffsetFixed: true, styles: { main: { maxWidth: 700, top: '6%' } } }}>
      <Stack tokens={{ childrenGap: 12 }}>
        <Stack horizontal tokens={{ childrenGap: 12 }} styles={{ root: { alignItems: 'flex-end' } }}>
          <TextField label="Usuário" value={username} onChange={(_, v) => setUsername(v || '')} styles={{ root: { minWidth: 420 } }} />
          <TextField label="Senha" value={password} onChange={(_, v) => setPassword(v || '')} type="password" styles={{ root: { minWidth: 240 } }} />
        </Stack>
        <ComboBox label="Role" options={[{key:'Admin', text:'Admin'},{key:'User', text:'User'}]} selectedKey={role} onChange={(_, o) => setRole(o?.key as string || 'User')} allowFreeform={false} />
      </Stack>
      <DialogFooter>
        <PrimaryButton text="Salvar" onClick={handleSave} disabled={saving} />
        <DefaultButton text="Cancelar" onClick={onDismiss} />
      </DialogFooter>
    </Dialog>
  );
}
