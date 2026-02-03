import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DetailsList, IColumn, Dropdown, IDropdownOption, IconButton } from '@fluentui/react';

interface Processo {
  id: string;
  nome: string;
  sprints: Sprint[];
  formula: {
    itens: Array<{ item: { id: string }; peso: number }>;
  };
}

interface Sprint {
  id: string;
  processo_id: string;
  numero: number;
  itens: SprintItem[];
  created_at: string;
}

interface SprintItem {
  item: { id: string; nome: string };
  target: number;
  actual: number | null;
}

interface SprintRow {
  sprintId: string;
  processoId: string;
  processoNome: string;
  sprintNumero: number;
  totalItens: number;
  pesoAlvo: number;
  pesoReal: number;
  divergencia: number;
  data: string;
  expanded?: boolean;
  sprint?: Sprint;
  processo?: Processo;
}

export default function SprintsView() {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [sprintRows, setSprintRows] = useState<SprintRow[]>([]);
  const [selectedProcesso, setSelectedProcesso] = useState<string>('todos');
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterSprints();
  }, [selectedProcesso, processos]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await invoke<Processo[]>('list_processos', { page: 0, pageSize: 1000 });
      setProcessos(data);
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (sprintId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(sprintId)) {
      newExpanded.delete(sprintId);
    } else {
      newExpanded.add(sprintId);
    }
    setExpandedRows(newExpanded);
  };

  const filterSprints = () => {
    const rows: SprintRow[] = [];
    
    for (const processo of processos) {
      if (selectedProcesso !== 'todos' && processo.id !== selectedProcesso) {
        continue;
      }

      for (const sprint of processo.sprints) {
        const pesoAlvo = sprint.itens.reduce((sum, item) => sum + item.target, 0);
        const pesoReal = sprint.itens.reduce((sum, item) => sum + (item.actual || 0), 0);
        const divergencia = pesoReal - pesoAlvo;

        rows.push({
          sprintId: sprint.id,
          processoId: processo.id,
          processoNome: processo.nome,
          sprintNumero: sprint.numero,
          totalItens: sprint.itens.length,
          pesoAlvo,
          pesoReal,
          divergencia,
          data: new Date(sprint.created_at).toLocaleString('pt-BR'),
          sprint,
          processo
        });
      }
    }

    // Ordenar por data (mais recente primeiro)
    rows.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    setSprintRows(rows);
  };

  const processoOptions: IDropdownOption[] = [
    { key: 'todos', text: 'Todos os Processos' },
    ...processos.map(p => ({ key: p.id, text: p.nome }))
  ];

  const columns: IColumn[] = [
    {
      key: 'expand',
      name: '',
      minWidth: 40,
      maxWidth: 40,
      onRender: (item: SprintRow) => (
        <IconButton
          iconProps={{ iconName: expandedRows.has(item.sprintId) ? 'ChevronDown' : 'ChevronRight' }}
          onClick={() => toggleExpand(item.sprintId)}
          title="Expandir detalhes"
        />
      )
    },
    {
      key: 'processoNome',
      name: 'Processo',
      fieldName: 'processoNome',
      minWidth: 150,
      maxWidth: 250,
      isResizable: true,
    },
    {
      key: 'sprintNumero',
      name: 'Sprint #',
      fieldName: 'sprintNumero',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
    },
    {
      key: 'totalItens',
      name: 'Itens',
      fieldName: 'totalItens',
      minWidth: 60,
      maxWidth: 80,
      isResizable: true,
    },
    {
      key: 'pesoAlvo',
      name: 'Peso Alvo (kg)',
      fieldName: 'pesoAlvo',
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: SprintRow) => <span>{item.pesoAlvo.toFixed(2)}</span>
    },
    {
      key: 'pesoReal',
      name: 'Peso Real (kg)',
      fieldName: 'pesoReal',
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: SprintRow) => <span>{item.pesoReal.toFixed(2)}</span>
    },
    {
      key: 'divergencia',
      name: 'Divergência (kg)',
      fieldName: 'divergencia',
      minWidth: 130,
      maxWidth: 160,
      isResizable: true,
      onRender: (item: SprintRow) => (
        <span style={{ 
          color: item.divergencia >= 0 ? '#d13438' : '#107c10',
          fontWeight: 600
        }}>
          {item.divergencia >= 0 ? '+' : ''}{item.divergencia.toFixed(2)}
        </span>
      )
    },
    {
      key: 'data',
      name: 'Data/Hora',
      fieldName: 'data',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
    }
  ];

  if (loading) {
    return (
      <div className="view-container">
        <h2>📊 Histórico de Sprints</h2>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h2 style={{ margin: 0 }}>📊 Histórico de Sprints</h2>
      </div>

      <div style={{ marginBottom: 20, maxWidth: 400 }}>
        <Dropdown
          label="Filtrar por Processo"
          options={processoOptions}
          selectedKey={selectedProcesso}
          onChange={(_, option) => setSelectedProcesso(option?.key as string)}
        />
      </div>

      {sprintRows.length === 0 ? (
        <p>Nenhum sprint encontrado.</p>
      ) : (
        <>
          <p style={{ marginBottom: 16, color: '#605e5c' }}>
            Total: {sprintRows.length} sprint{sprintRows.length !== 1 ? 's' : ''}
          </p>
          <div>
            {sprintRows.map(row => (
              <div key={row.sprintId} style={{ marginBottom: 2 }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '40px 150px 80px 60px 120px 120px 130px 150px',
                  padding: '12px',
                  backgroundColor: '#f3f2f1',
                  borderBottom: '1px solid #edebe9',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => toggleExpand(row.sprintId)}
                >
                  <IconButton
                    iconProps={{ iconName: expandedRows.has(row.sprintId) ? 'ChevronDown' : 'ChevronRight' }}
                    styles={{ root: { height: 24 } }}
                  />
                  <span>{row.processoNome}</span>
                  <span>{row.sprintNumero}</span>
                  <span>{row.totalItens}</span>
                  <span>{row.pesoAlvo.toFixed(2)}</span>
                  <span>{row.pesoReal.toFixed(2)}</span>
                  <span style={{ 
                    color: row.divergencia >= 0 ? '#d13438' : '#107c10',
                    fontWeight: 600
                  }}>
                    {row.divergencia >= 0 ? '+' : ''}{row.divergencia.toFixed(2)}
                  </span>
                  <span>{row.data}</span>
                </div>

                {expandedRows.has(row.sprintId) && row.sprint && row.processo && (
                  <div style={{ 
                    padding: '20px',
                    backgroundColor: '#faf9f8',
                    borderBottom: '2px solid #edebe9'
                  }}>
                    <h4 style={{ marginTop: 0, marginBottom: 16 }}>📋 Detalhes por Item</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#e1dfdd' }}>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #c8c6c4' }}>Item</th>
                          <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #c8c6c4' }}>Base Fórmula (kg)</th>
                          <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #c8c6c4' }}>Alvo Sprint (kg)</th>
                          <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #c8c6c4' }}>Real (kg)</th>
                          <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #c8c6c4' }}>Erro vs Base (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.sprint.itens.map((sprintItem, idx) => {
                          const formulaItem = row.processo?.formula?.itens?.find(fi => fi.item.id === sprintItem.item.id);
                          const baseWeight = formulaItem?.peso || 0;
                          const actual = sprintItem.actual || 0;
                          const errorVsBase = actual - baseWeight;
                          
                          return (
                            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f3f2f1' }}>
                              <td style={{ padding: '8px', border: '1px solid #edebe9' }}>{sprintItem.item.nome}</td>
                              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #edebe9', fontWeight: 600 }}>
                                {baseWeight.toFixed(2)}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #edebe9' }}>
                                {sprintItem.target.toFixed(2)}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #edebe9' }}>
                                {actual.toFixed(2)}
                              </td>
                              <td style={{ 
                                padding: '8px', 
                                textAlign: 'right', 
                                border: '1px solid #edebe9',
                                color: errorVsBase >= 0 ? '#d13438' : '#107c10',
                                fontWeight: 600
                              }}>
                                {errorVsBase >= 0 ? '+' : ''}{errorVsBase.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
