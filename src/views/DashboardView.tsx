import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { PrimaryButton, Stack, DefaultButton } from '@fluentui/react';
import { useNavigation } from '../NavigationContext';
import './DashboardView.css';

interface Processo {
  id: string;
  nome: string;
  status: string;
  weight: number;
  sprints: any[];
  formula: any;
}

export default function DashboardView() {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSprintFor, setCreatingSprintFor] = useState<string | null>(null);
  const { navigate } = useNavigation();

  useEffect(() => {
    loadProcessos();
  }, []);

  const loadProcessos = async () => {
    try {
      setLoading(true);
      const data = await invoke<Processo[]>('list_processos', { page: 0, pageSize: 100 });
      // Filtrar apenas processos ativos
      const ativos = data.filter(p => p.status.toLowerCase() !== 'terminado' && p.status.toLowerCase() !== 'finalizado');
      setProcessos(ativos);
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularErroAcumulado = (processo: Processo): number => {
    let erro = 0;
    for (const sprint of processo.sprints) {
      for (const item of sprint.itens) {
        // Encontra peso base do item na fórmula
        const itemFormula = processo.formula?.itens?.find((fi: any) => fi.item.id === item.item.id);
        const baseWeight = itemFormula?.peso || 0;
        // Erro = actual - base_weight (NÃO usar target!)
        const erro_item = (item.actual || 0) - baseWeight;
        erro += erro_item;
      }
    }
    return erro;
  };

  const handleIniciarSprint = async (processo: Processo) => {
    try {
      setCreatingSprintFor(processo.id);
      // Criar sprint automaticamente (sprints infinitos, sempre 1 remaining)
      const sprint = await invoke<any>('create_sprint_for_processo', {
        processoId: processo.id,
        remainingSprints: 1,
        operadorUsername: 'admin'
      });
      
      // Navegar direto para execução com payload do sprint criado
      navigate('execucao-sprint', {
        processoId: processo.id,
        processoNome: processo.nome,
        sprint: sprint,
        sprintItems: sprint.itens
      });
    } catch (error) {
      console.error('Erro ao criar sprint:', error);
      alert('Erro ao criar sprint: ' + error);
      setCreatingSprintFor(null);
    }
  };

  if (loading) {
    return (
      <div className="view-container">
        <h2>Dashboard do Operador</h2>
        <p>Carregando processos...</p>
      </div>
    );
  }

  return (
    <div className="view-container dashboard-container">
      <div className="dashboard-header">
        <h2>🏭 Dashboard do Operador</h2>
        <p className="dashboard-subtitle">Processos prontos para pesagem</p>
      </div>

      {processos.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum processo ativo no momento.</p>
          <DefaultButton text="Ver todos os processos" onClick={() => navigate('processos')} />
        </div>
      ) : (
        <div className="processos-grid">
          {processos.map(processo => {
            const erroAcumulado = calcularErroAcumulado(processo);
            const proximoSprint = processo.sprints.length + 1;
            const totalItens = processo.formula?.itens?.length || 0;

            return (
              <div key={processo.id} className="processo-card">
                <div className="processo-card-header">
                  <h3>📦 {processo.nome}</h3>
                  <span className={`status-badge ${processo.status.toLowerCase()}`}>
                    {processo.status}
                  </span>
                </div>

                <div className="processo-card-body">
                  <div className="info-row">
                    <span className="label">Sprints executados:</span>
                    <span className="value">{processo.sprints.length}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Itens na fórmula:</span>
                    <span className="value">{totalItens} itens</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Peso total processo:</span>
                    <span className="value">{processo.weight.toFixed(2)} kg</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Erro acumulado:</span>
                    <span className={`value erro ${erroAcumulado >= 0 ? 'positivo' : 'negativo'}`}>
                      {erroAcumulado >= 0 ? '+' : ''}{erroAcumulado.toFixed(2)} kg
                    </span>
                  </div>
                </div>

                <div className="processo-card-footer">
                  <PrimaryButton
                    text={creatingSprintFor === processo.id ? '⏳ Criando sprint...' : `▶️ Iniciar Sprint #${proximoSprint}`}
                    onClick={() => handleIniciarSprint(processo)}
                    disabled={creatingSprintFor === processo.id}
                    styles={{
                      root: {
                        width: '100%',
                        height: '48px',
                        fontSize: '16px',
                        fontWeight: 600
                      }
                    }}
                  />
                  {processo.sprints.length > 0 && (
                    <DefaultButton
                      text="📊 Ver Dashboard"
                      onClick={() => navigate('processo-dashboard', { processoId: processo.id })}
                      styles={{
                        root: {
                          width: '100%',
                          height: '36px',
                          marginTop: '8px'
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Stack horizontal tokens={{ childrenGap: 12 }} styles={{ root: { marginTop: 32 } }}>
        <DefaultButton
          text="Ver todos os processos"
          onClick={() => navigate('processos')}
          styles={{ root: { height: '40px' } }}
        />
        <DefaultButton
          text="Histórico de sprints"
          onClick={() => navigate('sprints')}
          styles={{ root: { height: '40px' } }}
        />
      </Stack>
    </div>
  );
}
