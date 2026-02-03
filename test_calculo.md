# Correções Implementadas - Sistema de Sprints

## ✅ Problema 1: Cálculo de Erro Acumulado CORRIGIDO

### O que estava errado
- O erro estava sendo calculado como `actual - target` (peso real - alvo sugerido)
- Isso causava acúmulo incorreto, pois o alvo já era ajustado com base em erros anteriores

### Correção aplicada
- **Backend**: `accumulate_divergences()` agora calcula erro como `actual - base_weight`
  - `base_weight`: peso original do item na fórmula
  - Exemplo: Item A = 20kg na fórmula
    - Sprint 1: colocou 20kg → erro = 20 - 20 = 0 ✓
    - Sprint 2: sugestão = 20 - 0 = 20kg ✓

- **Frontend**: `calcularErroAcumulado()` também corrigido em DashboardView.tsx
  - Busca o peso base na fórmula antes de calcular erro

### Logs de Debug Adicionados
```rust
println!("📊 Sprint {}, Item {}: actual={:.2}, base={:.2}, erro={:.2}", ...);
println!("🎯 Item {}: base={:.2}kg, erro_acumulado={:.2}kg, sugestão={:.2}kg", ...);
```

## ✅ Problema 2: Tela de NewSprintView ELIMINADA

### Mudança
- Botão "+Sprint" agora cria o sprint automaticamente e vai DIRETO para execução
- Atualizado em:
  - `DashboardView.tsx`: botão "Iniciar Sprint" vai direto
  - `ProcessosView.tsx`: função `handleAddSprint()` agora é async e cria + navega

### Código atualizado
```typescript
const handleAddSprint = async (processo: Processo) => {
  const sprint = await invoke('create_sprint_for_processo', {
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
};
```

## ✅ Problema 3: Histórico Detalhado por Item IMPLEMENTADO

### Nova funcionalidade em SprintsView.tsx
- **Acordeon expansível** em cada linha de sprint
- Clique na linha ou no ícone de chevron para expandir
- Mostra tabela detalhada por item com:
  - **Base Fórmula**: peso original do item na fórmula
  - **Alvo Sprint**: peso sugerido para este sprint (com correção acumulada)
  - **Real**: peso realmente colocado
  - **Erro vs Base**: diferença entre real e base (vermelho = excesso, verde = falta)

### Layout visual
```
▶️ Processo A | Sprint #1 | 2 itens | 45.00 | 44.50 | -0.50 | 03/02/2026
▼ Processo A | Sprint #1 | 2 itens | 45.00 | 44.50 | -0.50 | 03/02/2026
  ┌─────────────────────────────────────────────────────────────┐
  │ 📋 Detalhes por Item                                        │
  ├────────┬──────────┬────────────┬─────────┬─────────────────┤
  │ Item   │ Base     │ Alvo Sprint│ Real    │ Erro vs Base    │
  ├────────┼──────────┼────────────┼─────────┼─────────────────┤
  │ Item 3 │ 20.00 kg │ 19.00 kg   │ 20.00 kg│ 0.00 kg         │
  │ Item 2 │ 25.00 kg │ 25.00 kg   │ 24.50 kg│ -0.50 kg        │
  └────────┴──────────┴────────────┴─────────┴─────────────────┘
```

## 🧪 Como Testar

1. **Criar um processo** com fórmula de 2 itens (ex: A=20kg, B=25kg)
2. **Executar Sprint 1** colocando exatamente 20kg e 25kg
3. **Verificar que Sprint 2** sugere exatamente 20kg e 25kg novamente ✓
4. **Executar Sprint 2** com pequeno erro (ex: 21kg e 24kg)
5. **Verificar que Sprint 3** compensa: 19kg e 26kg
6. **Ir para Histórico** e expandir cada sprint para ver detalhes por item

## 📝 Arquivos Modificados

### Backend (Rust)
- `src-tauri/src/models/processo.rs`
  - `accumulate_divergences()`: calcula erro vs base_weight
  - `suggest_next_sprint_targets()`: usa erro acumulado corretamente
  - Logs de debug adicionados

### Frontend (TypeScript/React)
- `src/views/DashboardView.tsx`: cálculo de erro corrigido
- `src/views/ProcessosView.tsx`: botão Sprint vai direto para execução
- `src/views/SprintsView.tsx`: acordeon com histórico detalhado por item

## ✨ Resultado Final

- ✅ Erro acumulado calculado corretamente (sempre vs peso base)
- ✅ Sem tela intermediária ao criar sprint
- ✅ Histórico completo e detalhado por item
- ✅ Visualização clara de onde estão os desvios

