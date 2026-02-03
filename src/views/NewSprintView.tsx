import { useState } from 'react';
import { TextField, PrimaryButton, DefaultButton, Stack } from '@fluentui/react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigation } from '../NavigationContext';

export default function NewSprintView() {
  const { payload } = useNavigation();
  const processoId = payload?.processoId as string | undefined;
  const processoNome = payload?.processoNome as string | undefined;
  const [remaining, setRemaining] = useState('1');
  const [saving, setSaving] = useState(false);
  const { navigate } = useNavigation();

  const handleCreate = async () => {
    const value = parseInt(remaining);
    if (isNaN(value) || value <= 0) { alert('Digite um número válido de sprints restantes (mínimo 1)'); return; }
    try {
      setSaving(true);
      if (!processoId) {
        // no processo selecionado: só informa e volta
        alert('Selecione um processo antes de criar um sprint. Voltando para a lista de processos.');
        navigate('processos');
        return;
      }

      // Cria sprint via comando `create_sprint_for_processo` e redireciona para execução
      const sprint = await invoke<any>('create_sprint_for_processo', { processoId, remainingSprints: value, operadorUsername: 'admin' });
      // armazena sprint no payload e navega para execução (navegar para processos para poder iniciar execução nesse fluxo)
      navigate('processos');
      alert(`Sprint #${sprint.numero} gerado para processo ${processoNome || processoId}. Inicie execução a partir do processo.`);
    } catch (e) { console.error(e); alert('Erro ao criar sprint: ' + e); } finally { setSaving(false); }
  };

  return (
    <div className="view-container">
      <h2>Novo Sprint</h2>
      <Stack tokens={{ childrenGap: 12 }}>
        <TextField label="Quantos sprints ainda faltam executar?" value={remaining} onChange={(_, v) => setRemaining(v || '1')} type="number" />
        <div style={{ fontSize: 13, color: '#605e5c' }}>O sistema calculará as sugestões de peso com base nos sprints anteriores.</div>
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <PrimaryButton text="Criar Sprint" onClick={handleCreate} disabled={saving} />
          <DefaultButton text="Cancelar" onClick={() => navigate('processos')} />
        </Stack>
      </Stack>
    </div>
  );
}
