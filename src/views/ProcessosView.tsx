import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DetailsList, IColumn, PrimaryButton, DefaultButton, Stack } from '@fluentui/react';
import SprintExecutionView from './SprintExecutionView';
import { useNavigation } from '../NavigationContext';

interface Processo {
  id: string;
  nome: string;
  status: string;
  weight: number;
  sprints: any[];
}

interface Sprint {
  id: string;
  processo_id: string;
  numero: number;
  itens: SprintItem[];
  operador_id: any;
  comentario: string | null;
}

interface SprintItem {
  item: {
    id: string;
    nome: string;
  };
  target: number;
  actual: number | null;
}

type ViewMode = 'list' | 'executing';

export default function ProcessosView() {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Modal state
  const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(null);
  const { navigate } = useNavigation();
  
  // Execution state
  const [currentSprint, setCurrentSprint] = useState<Sprint | null>(null);

  useEffect(() => {
    loadProcessos();
  }, []);

  const loadProcessos = async () => {
    try {
      setLoading(true);
      const data = await invoke<Processo[]>('list_processos', { page: 0, pageSize: 100 });
      setProcessos(data);
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
    } finally {
      setLoading(false);
    }
  };

  const isProcessoTerminado = (status: string) => {
    return status.toLowerCase() === 'terminado' || status.toLowerCase() === 'finalizado';
  };

  const handleAddSprint = async (processo: Processo) => {
    try {
      const sprint = await invoke<any>('create_sprint_for_processo', {
        processoId: processo.id,
        remainingSprints: 1,
        operadorUsername: 'admin'
      });
      navigate('execucao-sprint', {
        processoId: processo.id,
        processoNome: processo.nome,
        sprint: sprint,
        sprintItems: sprint.itens
      });
    } catch (error) {
      console.error('Erro ao criar sprint:', error);
      alert('Erro ao criar sprint: ' + error);
    }
  };



  const handleSprintComplete = async () => {
    if (!currentSprint || !selectedProcesso) return;

    try {
      // Salva sprint no processo
      await invoke('save_sprint_to_processo', {
        processoId: selectedProcesso.id,
        sprint: currentSprint
      });

      // Retorna à lista e recarrega processos
      setViewMode('list');
      setCurrentSprint(null);
      setSelectedProcesso(null);
      await loadProcessos();
    } catch (error) {
      console.error('Erro ao salvar sprint:', error);
      alert('Erro ao salvar sprint: ' + error);
    }
  };

  const handleSprintCancel = () => {
    setViewMode('list');
    setCurrentSprint(null);
    setSelectedProcesso(null);
  };

  const handleFinalizeProcesso = async (processo: Processo) => {
    if (!confirm(`Deseja finalizar o processo "${processo.nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await invoke('finalize_processo', { processoId: processo.id });
      await loadProcessos();
    } catch (error) {
      console.error('Erro ao finalizar processo:', error);
      alert('Erro ao finalizar processo: ' + error);
    }
  };

  const handleDeleteProcesso = async (processo: Processo) => {
    if (!confirm(`⚠️ ATENÇÃO: Deseja DELETAR permanentemente o processo "${processo.nome}"?\n\nTodos os sprints serão perdidos!\n\nEsta ação NÃO pode ser desfeita!`)) {
      return;
    }

    try {
      await invoke('delete_processo', { processoId: processo.id });
      await loadProcessos();
    } catch (error) {
      console.error('Erro ao deletar processo:', error);
      alert('Erro ao deletar processo: ' + error);
    }
  };

  const handleViewDashboard = (processo: Processo) => {
    navigate('processo-dashboard', { processoId: processo.id });
  };

  const columns: IColumn[] = [
    {
      key: 'nome',
      name: 'Nome',
      fieldName: 'nome',
      minWidth: 150,
      maxWidth: 250,
      isResizable: true,
    },
    {
      key: 'status',
      name: 'Status',
      fieldName: 'status',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
    },
    {
      key: 'weight',
      name: 'Peso Total (kg)',
      fieldName: 'weight',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: Processo) => <span>{item.weight.toFixed(2)}</span>
    },
    {
      key: 'sprints',
      name: 'Sprints',
      fieldName: 'sprints',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      onRender: (item: Processo) => <span>{item.sprints.length}</span>
    },
    {
      key: 'actions',
      name: 'Ações',
      minWidth: 400,
      maxWidth: 500,
      onRender: (item: Processo) => (
        <Stack horizontal tokens={{ childrenGap: 8 }} wrap>
          <PrimaryButton
            text="➕ Sprint"
            disabled={isProcessoTerminado(item.status)}
            styles={{
              root: {
                backgroundColor: isProcessoTerminado(item.status) ? '#ccc' : '#0078d4',
                border: 'none',
                height: '32px'
              },
              rootHovered: {
                backgroundColor: isProcessoTerminado(item.status) ? '#ccc' : '#106ebe',
              }
            }}
            onClick={() => handleAddSprint(item)}
          />
          {!isProcessoTerminado(item.status) && (
            <>
              <DefaultButton
                text="✅ Finalizar"
                onClick={() => handleFinalizeProcesso(item)}
                styles={{ root: { height: '32px' } }}
              />
              {item.sprints.length > 0 && (
                <DefaultButton
                  text="📊 Dashboard"
                  onClick={() => handleViewDashboard(item)}
                  styles={{ root: { height: '32px' } }}
                />
              )}
            </>
          )}
          <DefaultButton
            text="🗑️ Deletar"
            onClick={() => handleDeleteProcesso(item)}
            styles={{ 
              root: { 
                backgroundColor: '#d13438',
                color: 'white',
                border: 'none',
                height: '32px'
              },
              rootHovered: {
                backgroundColor: '#a80000'
              }
            }}
          />
        </Stack>
      )
    }
  ];

  if (viewMode === 'executing' && currentSprint && selectedProcesso) {
    return (
      <SprintExecutionView
        processoId={selectedProcesso.id}
        processoNome={selectedProcesso.nome}
        sprintItems={currentSprint.itens}
        sprint={currentSprint}
        onComplete={handleSprintComplete}
        onCancel={handleSprintCancel}
      />
    );
  }

  if (loading) {
    return (
      <div className="view-container">
        <h2>Processos</h2>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="view-container">
      <h2>Processos</h2>
      <Stack tokens={{ childrenGap: 16 }}>
        <PrimaryButton text="Novo Processo" onClick={() => navigate('novo-processo')} />
        <DetailsList
          items={processos}
          columns={columns}
          setKey="set"
          layoutMode={1}
          selectionMode={0}
        />
      </Stack>


    </div>
  );
}
