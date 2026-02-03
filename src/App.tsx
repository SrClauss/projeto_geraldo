import "./App.css";
import "./responsive.css";
import Sidebar from "./components/Sidebar";
import DashboardView from "./views/DashboardView";
import ProcessosView from "./views/ProcessosView";
import FormulasView from "./views/FormulasView";
import FornecedoresView from "./views/FornecedoresView";
import ItensView from "./views/ItensView";
import UsersView from "./views/UsersView";
import SprintsView from "./views/SprintsView";
import { NavigationProvider, useNavigation } from './NavigationContext';
import NewFornecedorView from './views/NewFornecedorView';
import NewItemView from './views/NewItemView';
import NewFormulaView from './views/NewFormulaView';
import NewUserView from './views/NewUserView';
import NewProcessView from './views/NewProcessView';
import NewSprintView from './views/NewSprintView';
import SprintExecutionView from './views/SprintExecutionView';
import ProcessoDashboardView from './views/ProcessoDashboardView';
import { TrialChecker } from './components/TrialChecker';

function SprintExecutionWrapper() {
  const { payload, navigate } = useNavigation();
  
  return (
    <SprintExecutionView
      processoId={payload?.processoId}
      processoNome={payload?.processoNome}
      sprint={payload?.sprint}
      sprintItems={payload?.sprintItems}
      onComplete={() => navigate('processo-dashboard', { processoId: payload?.processoId })}
      onCancel={() => navigate('processo-dashboard', { processoId: payload?.processoId })}
    />
  );
}

function Content() {
  const { selected } = useNavigation();

  switch (selected) {
    case 'processos':
      return <ProcessosView />;
    case 'sprints':
      return <SprintsView />;
    case 'cadastros-formulas':
      return <FormulasView />;
    case 'cadastros-fornecedores':
      return <FornecedoresView />;
    case 'cadastros-itens':
      return <ItensView />;
    case 'cadastros-users':
      return <UsersView />;
    case 'novo-fornecedor':
      return <NewFornecedorView />;
    case 'novo-item':
      return <NewItemView />;
    case 'nova-formula':
      return <NewFormulaView />;
    case 'novo-usuario':
      return <NewUserView />;
    case 'novo-processo':
      return <NewProcessView />;
    case 'novo-sprint':
      return <NewSprintView />;
    case 'execucao-sprint':
      return <SprintExecutionWrapper />;
    case 'processo-dashboard':
      return <ProcessoDashboardView />;
    case 'home':
      return <DashboardView />;
    default:
      return <div className="view-container"><h2>{selected}</h2><p>Conteúdo de {selected} (placeholder)</p></div>;
  }
}

function App() {
  return (
    <NavigationProvider>
      <TrialChecker>
        <div className="app-root">
          <div className="app-layout">
            <Sidebar />
            <div className="content">
              <Content />
            </div>
          </div>
        </div>
      </TrialChecker>
    </NavigationProvider>
  );
}

export default App;
