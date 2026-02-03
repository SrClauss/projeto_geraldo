import { useState } from 'react';
import { TextField, PrimaryButton, DefaultButton, ComboBox, Stack } from '@fluentui/react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigation } from '../NavigationContext';

export default function NewUserView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [saving, setSaving] = useState(false);
  const { navigate } = useNavigation();

  const handleSave = async () => {
    if (!username.trim() || !password) { alert('Preencha usuário e senha'); return; }
    try {
      setSaving(true);
      await invoke('create_user', { username, password, role });
      navigate('cadastros-users');
    } catch (e) { console.error(e); alert('Erro ao criar usuário'); } finally { setSaving(false); }
  };

  return (
    <div className="view-container">
      <h2>Novo Usuário</h2>
      <Stack tokens={{ childrenGap: 12 }}>
        <Stack horizontal tokens={{ childrenGap: 12 }} styles={{ root: { alignItems: 'flex-end' } }}>
          <TextField label="Usuário" value={username} onChange={(_, v) => setUsername(v || '')} styles={{ root: { minWidth: 420 } }} />
          <TextField label="Senha" value={password} onChange={(_, v) => setPassword(v || '')} type="password" styles={{ root: { minWidth: 240 } }} />
        </Stack>
        <ComboBox label="Role" options={[{key:'Admin', text:'Admin'},{key:'User', text:'User'}]} selectedKey={role} onChange={(_, o) => setRole(o?.key as string || 'User')} allowFreeform={false} />
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <PrimaryButton text="Criar" onClick={handleSave} disabled={saving} />
          <DefaultButton text="Cancelar" onClick={() => navigate('cadastros-users')} />
        </Stack>
      </Stack>
    </div>
  );
}
