import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Agenda from './pages/Agenda';
import Sidebar from './components/Sidebar';

function PrivateLayout({ children }) {
  const { sessao, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Carregando permissões...</p>
      </div>
    );
  }
  
  if (!sessao) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto flex flex-col relative w-full h-full pb-8">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<PrivateLayout><Navigate to="/agenda" replace /></PrivateLayout>} />
        
        <Route path="/agenda" element={
          <PrivateLayout>
            <Agenda />
          </PrivateLayout>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
