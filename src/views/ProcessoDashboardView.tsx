import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DefaultButton, Stack } from '@fluentui/react';
import { useNavigation } from '../NavigationContext';

interface Processo {
  id: string;
  nome: string;
  status: string;
  weight: number;
  sprints: Sprint[];
  formula: {
    itens: Array<{ item: { id: string; nome: string }; peso: number }>;
  };
}

interface Sprint {
  id: string;
  numero: number;
  itens: SprintItem[];
  created_at: string;
}

interface SprintItem {
  item: { id: string; nome: string };
  target: number;
  actual: number | null;
}

interface ChartDataPoint {
  sprintNumero: number;
  itemId: string;
  itemNome: string;
  desvio: number;
  color: string;
}

export default function ProcessoDashboardView() {
  const { payload, navigate } = useNavigation();
  const processoId = payload?.processoId as string;
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    if (processoId) {
      loadProcesso();
    }
  }, [processoId]);

  const loadProcesso = async () => {
    try {
      setLoading(true);
      const data = await invoke<Processo>('get_processo', { id: processoId });
      if (data) {
        setProcesso(data);
        calculateChartData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar processo:', error);
      alert('Erro ao carregar processo: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const calculateChartData = (proc: Processo) => {
    const data: ChartDataPoint[] = [];
    const colors = ['#0078d4', '#107c10', '#d13438', '#8764b8', '#ca5010', '#00b7c3', '#8a8886'];
    
    // Mapeia cores por item
    const itemColors: { [key: string]: string } = {};
    proc.formula.itens.forEach((fi, idx) => {
      itemColors[fi.item.id] = colors[idx % colors.length];
    });
    
    for (const sprint of proc.sprints) {
      for (const item of sprint.itens) {
        // Busca peso base na fórmula
        const formulaItem = proc.formula.itens.find(fi => fi.item.id === item.item.id);
        const baseWeight = formulaItem?.peso || 0;
        // Desvio = actual - base_weight
        const actual = item.actual || 0;
        const desvio = actual - baseWeight;
        
        data.push({
          sprintNumero: sprint.numero,
          itemId: item.item.id,
          itemNome: item.item.nome,
          desvio: desvio,
          color: itemColors[item.item.id] || '#8a8886'
        });
      }
    }
    
    setChartData(data);
  };

  const handleNovoSprint = async () => {
    if (!processo) return;
    
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

  const handleFinalizar = async () => {
    if (!processo) return;
    
    if (!confirm(`Deseja finalizar o processo "${processo.nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await invoke('finalize_processo', { processoId: processo.id });
      navigate('processos');
    } catch (error) {
      console.error('Erro ao finalizar processo:', error);
      alert('Erro ao finalizar processo: ' + error);
    }
  };

  const calcularErroAcumulado = (): number => {
    if (!processo) return 0;
    
    let erro = 0;
    for (const sprint of processo.sprints) {
      for (const item of sprint.itens) {
        const formulaItem = processo.formula.itens.find(fi => fi.item.id === item.item.id);
        const baseWeight = formulaItem?.peso || 0;
        const actual = item.actual || 0;
        erro += (actual - baseWeight);
      }
    }
    return erro;
  };

  if (loading) {
    return (
      <div className="view-container">
        <h2>Carregando...</h2>
      </div>
    );
  }

  if (!processo) {
    return (
      <div className="view-container">
        <h2>Processo não encontrado</h2>
        <DefaultButton text="Voltar" onClick={() => navigate('processos')} />
      </div>
    );
  }

  const erroAcumulado = calcularErroAcumulado();
  
  // Agrupa dados por item para desenhar as linhas
  const itemsUnicos = Array.from(new Set(chartData.map(d => d.itemId)));
  const dataByItem: Record<string, ChartDataPoint[]> = {};
  itemsUnicos.forEach(itemId => {
    dataByItem[itemId] = chartData.filter(d => d.itemId === itemId).sort((a, b) => a.sprintNumero - b.sprintNumero);
  });
  
  const maxAbsDesvio = Math.max(...chartData.map(d => Math.abs(d.desvio)), 1);
  const chartHeight = 300;
  const numSprints = processo.sprints.length || 1;
  const chartWidth = Math.max(600, numSprints * 100);

  return (
    <div className="view-container">
      {/* Botão Novo Sprint em Destaque */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        backgroundColor: '#0078d4',
        margin: '-20px -20px 20px -20px',
        padding: '16px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '100%' }}>
          <div style={{ color: 'white' }}>
            <h2 style={{ margin: 0, marginBottom: 4 }}>📊 {processo.nome}</h2>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              Sprint #{processo.sprints.length + 1} • {processo.formula.itens.length} itens
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={handleNovoSprint}
              style={{
                backgroundColor: '#107c10',
                color: 'white',
                border: 'none',
                padding: '16px 40px',
                fontSize: '18px',
                fontWeight: 700,
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#0e6b0e';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#107c10';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ▶️ NOVO SPRINT
            </button>
            <DefaultButton 
              text="← Voltar" 
              onClick={() => navigate('processos')}
              styles={{
                root: {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  height: '40px'
                },
                rootHovered: {
                  backgroundColor: 'rgba(255,255,255,0.3)'
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#f3f2f1', 
          borderRadius: 4,
          border: '1px solid #edebe9'
        }}>
          <div style={{ fontSize: 12, color: '#605e5c', marginBottom: 4 }}>Erro Acumulado Total</div>
          <div style={{ 
            fontSize: 24, 
            fontWeight: 600,
            color: erroAcumulado >= 0 ? '#d13438' : '#107c10'
          }}>
            {erroAcumulado >= 0 ? '+' : ''}{erroAcumulado.toFixed(2)} kg
          </div>
        </div>

        <div style={{ 
          padding: 20, 
          backgroundColor: '#f3f2f1', 
          borderRadius: 4,
          border: '1px solid #edebe9'
        }}>
          <div style={{ fontSize: 12, color: '#605e5c', marginBottom: 4 }}>Itens na Fórmula</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{processo.formula.itens.length}</div>
        </div>

        <div style={{ 
          padding: 20, 
          backgroundColor: '#f3f2f1', 
          borderRadius: 4,
          border: '1px solid #edebe9'
        }}>
          <div style={{ fontSize: 12, color: '#605e5c', marginBottom: 4 }}>Próximo Sprint</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>#{processo.sprints.length + 1}</div>
        </div>
      </div>

      {/* Gráfico de Desvios por Item */}
      {chartData.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3>📈 Histórico de Desvios por Item</h3>
          <div style={{ 
            overflowX: 'auto',
            padding: '20px',
            backgroundColor: '#faf9f8',
            border: '1px solid #edebe9',
            borderRadius: 4
          }}>
            <svg width={chartWidth} height={chartHeight} style={{ display: 'block', margin: '0 auto' }}>
              {/* Eixo Y - linha zero */}
              <line
                x1={60}
                y1={chartHeight / 2}
                x2={chartWidth - 40}
                y2={chartHeight / 2}
                stroke="#8a8886"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
              
              {/* Label linha zero */}
              <text x={40} y={chartHeight / 2 + 5} fontSize={12} fill="#605e5c" textAnchor="end">0 kg</text>
              
              {/* Labels dos sprints no eixo X */}
              {processo.sprints.map((sprint, idx) => {
                const x = 80 + idx * 100;
                return (
                  <text key={`label-${idx}`} x={x} y={chartHeight - 10} fontSize={12} fill="#323130" textAnchor="middle">
                    Sprint {sprint.numero}
                  </text>
                );
              })}
              
              {/* Linhas por item */}
              {Object.entries(dataByItem).map(([itemId, points]) => {
                if (points.length === 0) return null;
                const color = points[0].color;
                
                return (
                  <g key={`item-${itemId}`}>
                    {/* Linhas conectando pontos */}
                    {points.map((point, idx) => {
                      if (idx === 0) return null;
                      const prevPoint = points[idx - 1];
                      const x1 = 80 + (prevPoint.sprintNumero - 1) * 100;
                      const x2 = 80 + (point.sprintNumero - 1) * 100;
                      const y1 = chartHeight / 2 - (prevPoint.desvio / maxAbsDesvio) * (chartHeight / 2 - 40);
                      const y2 = chartHeight / 2 - (point.desvio / maxAbsDesvio) * (chartHeight / 2 - 40);
                      
                      return (
                        <line
                          key={`line-${idx}`}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={color}
                          strokeWidth={2.5}
                          opacity={0.8}
                        />
                      );
                    })}
                    
                    {/* Pontos */}
                    {points.map((point, idx) => {
                      const x = 80 + (point.sprintNumero - 1) * 100;
                      const y = chartHeight / 2 - (point.desvio / maxAbsDesvio) * (chartHeight / 2 - 40);
                      
                      return (
                        <g key={`point-${idx}`}>
                          <circle cx={x} cy={y} r={5} fill={color} stroke="#fff" strokeWidth={2} />
                          <text 
                            x={x} 
                            y={y - 15} 
                            fontSize={10} 
                            fill={color} 
                            textAnchor="middle" 
                            fontWeight={600}
                          >
                            {point.desvio >= 0 ? '+' : ''}{point.desvio.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>
          
          {/* Legenda */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 24, 
            marginTop: 16,
            flexWrap: 'wrap'
          }}>
            {Object.entries(dataByItem).map(([itemId, points]) => {
              if (points.length === 0) return null;
              return (
                <div key={itemId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ 
                    width: 16, 
                    height: 16, 
                    backgroundColor: points[0].color,
                    borderRadius: '50%',
                    border: '2px solid white',
                    boxShadow: '0 0 3px rgba(0,0,0,0.3)'
                  }} />
                  <span style={{ fontSize: 14, color: '#323130', fontWeight: 600 }}>{points[0].itemNome}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detalhes da Fórmula */}
      <div style={{ marginBottom: 32 }}>
        <h3>📋 Composição da Fórmula</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#e1dfdd' }}>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #c8c6c4' }}>Item</th>
              <th style={{ padding: 12, textAlign: 'right', border: '1px solid #c8c6c4' }}>Peso Base (kg)</th>
            </tr>
          </thead>
          <tbody>
            {processo.formula.itens.map((item, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f3f2f1' }}>
                <td style={{ padding: 12, border: '1px solid #edebe9' }}>{item.item.nome}</td>
                <td style={{ padding: 12, textAlign: 'right', border: '1px solid #edebe9', fontWeight: 600 }}>
                  {item.peso.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ações Secundárias */}
      <Stack horizontal tokens={{ childrenGap: 12 }}>
        <DefaultButton
          text="✅ Finalizar Processo"
          onClick={handleFinalizar}
          styles={{ root: { height: 40 } }}
        />
        <DefaultButton
          text="📊 Ver Histórico Detalhado"
          onClick={() => navigate('sprints')}
          styles={{ root: { height: 40 } }}
        />
      </Stack>
    </div>
  );
}
