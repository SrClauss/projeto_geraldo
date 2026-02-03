import { useState, useEffect, useRef } from 'react';
import { ProgressIndicator, TextField, PrimaryButton, DefaultButton } from '@fluentui/react';
import './SprintExecutionView.css';

interface SprintItem {
  item: {
    id: string;
    nome: string;
  };
  target: number;
  actual: number | null;
}

interface Sprint {
  id: string;
  processo_id: string;
  numero: number;
  itens: SprintItem[];
  operador_id: any;
  comentario: string | null;
}

interface Props {
  processoId: string;
  processoNome: string;
  sprintItems: SprintItem[];
  sprint: Sprint;
  onComplete: () => void;
  onCancel: () => void;
}

export default function SprintExecutionView({ processoId, processoNome, sprintItems, sprint, onComplete, onCancel }: Props) {
  // `processoId` está disponível se precisarmos referenciar o processo (por exemplo logs)
  void processoId;
  const [items, setItems] = useState<SprintItem[]>(sprintItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentWeight, setCurrentWeight] = useState('');
  const [updatedSprint, setUpdatedSprint] = useState<Sprint>(sprint);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Foco automático no input quando componente monta ou índice muda
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex]);

  const currentItem = items[currentIndex];
  const totalItems = items.length;
  const completedItems = items.filter(item => item.actual !== null).length;
  const progress = totalItems > 0 ? completedItems / totalItems : 0;

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNext();
    }
  };

  const handleNext = () => {
    const weight = parseFloat(currentWeight);
    if (isNaN(weight)) {
      alert('Peso inválido. Digite um número válido.');
      return;
    }

    // ⚠️ BLOQUEIO: Correção manual de pesos é PROIBIDA
    // Operador não pode editar valores já registrados
    
    // Atualiza item atual com peso
    const updatedItems = [...items];
    updatedItems[currentIndex] = {
      ...currentItem,
      actual: weight
    };
    setItems(updatedItems);
    
    // Atualiza sprint object
    const newSprint = { ...updatedSprint };
    newSprint.itens = updatedItems;
    setUpdatedSprint(newSprint);
    
    setCurrentWeight('');

    // Avança para próximo ou finaliza
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finalizeSprint(newSprint);
    }
  };

  const finalizeSprint = async (finalSprint: Sprint) => {
    console.log('Sprint finalizado com itens:', finalSprint);
    // Atualiza estado e chama callback que salvará no backend
    setUpdatedSprint(finalSprint);
    onComplete();
  };

  const getDivergence = (item: SprintItem): number | null => {
    if (item.actual === null) return null;
    return item.actual - item.target;
  };

  return (
    <div className="sprint-execution-container">
      <div className="sprint-header">
        <div className="sprint-title-section">
          <h1>Sprint #{sprint.numero}</h1>
          <h2>{processoNome}</h2>
        </div>
        <div className="sprint-progress-section">
          <div className="progress-label">Item {completedItems + 1} de {totalItems}</div>
          <ProgressIndicator
            percentComplete={progress}
            styles={{ root: { width: '100%' } }}
          />
        </div>
      </div>

      <div className="sprint-main">
        {/* Área de pesagem atual */}
        <div className="current-item-area">
          <div className="item-name">🎯 {currentItem.item.nome}</div>
          <div className="target-weight-card">
            <div className="target-label">Peso Sugerido</div>
            <div className="target-value">{currentItem.target.toFixed(2)} kg</div>
            <div className="target-hint">
              {currentItem.target !== 0 && Math.abs(currentItem.target) > 0.1 && (
                <span>Correção aplicada baseada em sprints anteriores</span>
              )}
            </div>
          </div>
          <div className="weight-input-area">
            <label className="input-label">Digite o peso pesado:</label>
            <TextField
              componentRef={inputRef as any}
              value={currentWeight}
              onChange={(_, newValue) => setCurrentWeight(newValue || '')}
              onKeyPress={handleKeyPress}
              placeholder="00.00"
              styles={{
                root: { width: '100%', maxWidth: '500px' },
                field: { 
                  fontSize: '48px', 
                  textAlign: 'center', 
                  padding: '24px',
                  fontWeight: '600',
                  border: '3px solid #0078d4',
                  borderRadius: '8px'
                }
              }}
            />
            <div className="input-hint">Pressione Enter ou clique em Próximo</div>
          </div>
          <div className="action-buttons">
            <PrimaryButton
              text={currentIndex < totalItems - 1 ? '➡️ Próximo Item' : '✅ Finalizar Sprint'}
              onClick={handleNext}
              styles={{ 
                root: { 
                  fontSize: '20px', 
                  padding: '24px 48px',
                  height: '72px',
                  minWidth: '280px',
                  fontWeight: 600
                } 
              }}
            />
            <DefaultButton
              text="❌ Cancelar"
              onClick={onCancel}
              styles={{ 
                root: { 
                  fontSize: '18px', 
                  padding: '24px 32px',
                  height: '72px',
                  minWidth: '180px'
                } 
              }}
            />
          </div>
        </div>

        {/* Lista lateral de progresso */}
        <div className="items-progress-list">
          <h3>Itens do Sprint</h3>
          <div className="items-list">
            {items.map((item, idx) => {
              const divergence = getDivergence(item);
              const isCurrent = idx === currentIndex;
              const isCompleted = item.actual !== null;

              return (
                <div
                  key={item.item.id}
                  className={`item-row ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : 'pending'}`}
                >
                  <div className="item-info">
                    <span className="item-number">{idx + 1}.</span>
                    <span className="item-name-small">{item.item.nome}</span>
                  </div>
                  <div className="item-weights">
                    <span className="target">Alvo: {item.target.toFixed(2)} kg</span>
                    {item.actual !== null && (
                      <>
                        <span className="actual">Real: {item.actual.toFixed(2)} kg</span>
                        <span className={`divergence ${divergence! >= 0 ? 'positive' : 'negative'}`}>
                          {divergence! >= 0 ? '+' : ''}{divergence!.toFixed(2)} kg
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
