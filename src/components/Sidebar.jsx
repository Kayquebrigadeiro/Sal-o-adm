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
    <aside className={`${recolhida ? 'w-16' : 'w-56'} min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col transition-all duration-300 relative`}>
      {/* Botão recolher */}
      <button
        onClick={() => setRecolhida(!recolhida)}
        className="absolute -right-3 top-7 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg z-10 transition-all"
      >
        {recolhida ? <ChevronRight size={12} className="text-slate-500" /> : <ChevronLeft size={12} className="text-slate-500" />}
      </button>

      {/* Logo / Brand */}
      <div className={`px-4 py-5 border-b border-white/10 ${recolhida ? 'flex justify-center' : ''}`}>
        {recolhida ? (
          <div className="w-8 h-8 bg-gradient-to-br from-rose-400 to-amber-400 rounded-lg flex items-center justify-center shadow-lg">
            <Scissors size={14} className="text-white" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-rose-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 flex-shrink-0">
              <Scissors size={16} className="text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{salaoNome || 'Salão'}</p>
              <p className="text-[10px] text-slate-400 truncate">{email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {!recolhida && (
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Menu</p>
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
                    ? 'bg-gradient-to-r from-rose-500/20 to-amber-500/10 text-white shadow-sm border border-rose-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`flex-shrink-0 ${isActive ? 'text-rose-400' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`}>
                    <Icon size={16} />
                  </div>
                  {!recolhida && <span className="truncate">{item.label}</span>}
                  {isActive && !recolhida && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Rodapé */}
      <div className={`px-3 py-4 border-t border-white/10 ${recolhida ? 'flex justify-center' : ''}`}>
        <button
          onClick={handleLogout}
          disabled={saindo}
          title={recolhida ? 'Sair' : undefined}
          className={`${recolhida ? 'p-2' : 'w-full flex items-center gap-2 px-3 py-2'} text-xs text-slate-500 hover:text-rose-400 disabled:opacity-50 rounded-xl hover:bg-white/5 transition-all duration-200`}
        >
          <LogOut size={14} />
          {!recolhida && <span className="font-medium">{saindo ? 'Saindo...' : 'Sair da conta'}</span>}
        </button>
      </div>
    </aside>
  );
}
