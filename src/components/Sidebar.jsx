import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  CalendarDays, LayoutDashboard, Calculator, PackageOpen,
  Settings, LogOut, Users, Package, Scissors, ChevronLeft,
  ChevronRight
} from 'lucide-react';

const itens = [
  { path: '/agenda',        label: 'Agenda',        icon: CalendarDays,     roles: ['PROPRIETARIO','FUNCIONARIO'] },
  { path: '/clientes',      label: 'Clientes',      icon: Users,            roles: ['PROPRIETARIO','FUNCIONARIO'] },
  { path: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard,  roles: ['PROPRIETARIO'] },
  { path: '/precificacao',  label: 'Precificação',  icon: Calculator,       roles: ['PROPRIETARIO'] },
  { path: '/homecar',       label: 'HomeCare',      icon: PackageOpen,      roles: ['PROPRIETARIO'] },

  { path: '/configuracoes', label: 'Equipe',        icon: Settings,         roles: ['PROPRIETARIO'] },
];

export default function Sidebar({ role, email, salaoNome }) {
  const visiveis = itens.filter(i => i.roles.includes(role));
  const [saindo, setSaindo] = useState(false);
  const [recolhida, setRecolhida] = useState(false);

  let menuItens = [];
  if (role === 'VENDEDOR') {
    menuItens = [];
  } else {
    menuItens = visiveis;
  }

  const handleLogout = async () => {
    try {
      setSaindo(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert('Erro ao sair: ' + error.message);
        setSaindo(false);
      }
    } catch (err) {
      alert('Erro inesperado ao sair');
      setSaindo(false);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex ${recolhida ? 'w-16' : 'w-56'} min-h-screen bg-white border-r border-gray-200 flex-col transition-all duration-300 relative z-20`}>
        {/* Botão recolher */}
        <button
          onClick={() => setRecolhida(!recolhida)}
          className="absolute -right-3 top-7 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg z-10 transition-all"
        >
          {recolhida ? <ChevronRight size={12} className="text-gray-500" /> : <ChevronLeft size={12} className="text-gray-500" />}
        </button>

        {/* Logo / Brand */}
        <div className={`px-4 py-5 border-b border-gray-100 ${recolhida ? 'flex justify-center' : ''}`}>
          {recolhida ? (
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg">
              <Scissors size={14} className="text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 flex-shrink-0">
                <Scissors size={16} className="text-white" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-gray-800 truncate">{salaoNome || 'Salão'}</p>
                <p className="text-[10px] text-gray-400 truncate">{email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {!recolhida && (
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Menu</p>
          )}
          {menuItens.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={recolhida ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 ${recolhida ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl text-xs font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-sky-50 text-sky-600 shadow-sm border border-sky-100'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`flex-shrink-0 ${isActive ? 'text-sky-500' : 'text-gray-400 group-hover:text-gray-600'} transition-colors`}>
                      <Icon size={16} />
                    </div>
                    {!recolhida && <span className="truncate">{item.label}</span>}
                    {isActive && !recolhida && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500 shadow-sm shadow-sky-500" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Rodapé */}
        <div className={`px-3 py-4 border-t border-gray-100 ${recolhida ? 'flex justify-center' : ''}`}>
          <button
            onClick={handleLogout}
            disabled={saindo}
            title={recolhida ? 'Sair' : undefined}
            className={`${recolhida ? 'p-2' : 'w-full flex items-center gap-2 px-3 py-2'} text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 rounded-xl hover:bg-red-50 transition-all duration-200`}
          >
            <LogOut size={14} />
            {!recolhida && <span className="font-medium">{saindo ? 'Saindo...' : 'Sair da conta'}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white border-t border-gray-200 flex justify-around items-center px-2 z-50 pb-safe">
        {menuItens.slice(0, 4).map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-sky-500' : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium truncate w-full text-center px-1">{item.label}</span>
            </NavLink>
          );
        })}
        {/* Mobile menu more dropdown or direct link */}
        <NavLink
            to="/configuracoes"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-sky-500' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Settings size={20} />
            <span className="text-[10px] font-medium truncate w-full text-center px-1">Menu</span>
        </NavLink>
      </nav>
      
      {/* Mobile Top Header (Optional if needed) */}
      <header className="md:hidden bg-white text-gray-800 flex items-center justify-between px-4 py-3 sticky top-0 z-40 border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg">
            <Scissors size={14} className="text-white" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">{salaoNome || 'Salão'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={saindo}
          className="text-gray-400 hover:text-red-500 p-2"
        >
          <LogOut size={18} />
        </button>
      </header>
    </>
  );
}
