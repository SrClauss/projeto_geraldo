import { useState } from 'react';
import { Dialog, DialogType, DialogFooter, PrimaryButton, DefaultButton, TextField, Stack } from '@fluentui/react';

interface Props {
  hidden: boolean;
  processoNome: string;
  sprintsExecutados: number;
  pesoTotal: number;
  onConfirm: (remainingSprints: number) => void;
  onDismiss: () => void;
}

export default function SprintCreationModal({ hidden, processoNome, sprintsExecutados, pesoTotal, onConfirm, onDismiss }: Props) {
  const [remainingSprints, setRemainingSprints] = useState('1');

  const handleConfirm = () => {
    const value = parseInt(remainingSprints);
    if (isNaN(value) || value <= 0) {
      alert('Digite um número válido de sprints restantes (mínimo 1)');
      return;
    }
    onConfirm(value);
  };

  return (
    <Dialog
      hidden={hidden}
      onDismiss={onDismiss}
      dialogContentProps={{
        type: DialogType.normal,
        title: 'Criar Novo Sprint',
        subText: `Processo: ${processoNome}`
      }}
      modalProps={{
        isBlocking: true,
        styles: { main: { maxWidth: 800, top: '6%' } }
      }}
    >
      <Stack tokens={{ childrenGap: 16 }}>
        <div>
          <strong>Sprints já executados:</strong> {sprintsExecutados}
        </div>
        <div>
          <strong>Peso total do processo:</strong> {pesoTotal.toFixed(2)} kg
        </div>
        <TextField
          label="Quantos sprints ainda faltam executar?"
          description="Usado para calcular sugestões de peso com correção de erros"
          value={remainingSprints}
          onChange={(_, newValue) => setRemainingSprints(newValue || '1')}
          type="number"
          min={1}
        />
        <div style={{ fontSize: '13px', color: '#605e5c', fontStyle: 'italic' }}>
          <p>💡 <strong>Nota:</strong> O sistema calculará automaticamente os pesos sugeridos para cada item, corrigindo divergências dos sprints anteriores.</p>
          <p>📝 <strong>Alternativa futura:</strong> Caso o cliente queira, podemos implementar um sistema onde o número total de sprints é definido no início do processo, permitindo planejamento mais detalhado.</p>
        </div>
      </Stack>
      <DialogFooter>
        <PrimaryButton onClick={handleConfirm} text="Iniciar Sprint" />
        <DefaultButton onClick={onDismiss} text="Cancelar" />
      </DialogFooter>
    </Dialog>
  );
}
