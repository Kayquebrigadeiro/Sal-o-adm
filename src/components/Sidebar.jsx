import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CalendarDays, LayoutDashboard, Scissors, ShoppingBag, Receipt, Settings, LogOut, Users, Calculator } from 'lucide-react';

const itens = [
  { path: '/agenda',        label: 'Agenda',        icon: CalendarDays,     roles: ['PROPRIETARIO','FUNCIONARIO'] },
  { path: '/clientes',      label: 'Clientes',      icon: Users,            roles: ['PROPRIETARIO','FUNCIONARIO'] },
  { path: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard,  roles: ['PROPRIETARIO'] },
  { path: '/precificacao',  label: 'Precificação',  icon: Calculator,       roles: ['PROPRIETARIO'] },
  { path: '/paralelos',     label: 'Paralelos',     icon: Scissors,         roles: ['PROPRIETARIO'] },
  { path: '/homecar',       label: 'HomeCare',      icon: ShoppingBag,      roles: ['PROPRIETARIO'] },
  { path: '/despesas',      label: 'Despesas',      icon: Receipt,          roles: ['PROPRIETARIO'] },
  { path: '/configuracoes', label: 'Configurações', icon: Settings,         roles: ['PROPRIETARIO'] },
];

const formatarData = () => {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const agora = new Date();
  return `${dias[agora.getDay()]}, ${agora.getDate()} de ${meses[agora.getMonth()]}`;
};

export default function Sidebar({ role, email, salaoNome }) {
  const visiveis = itens.filter(i => i.roles.includes(role));
  const [saindo, setSaindo] = useState(false);
  const [dataAtual, setDataAtual] = useState(formatarData());

  useEffect(() => {
    const interval = setInterval(() => {
      setDataAtual(formatarData());
    }, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, []);

  let menuItens = [];
  if (role === 'VENDEDOR') {
    menuItens = [];
  } else {
    menuItens = visiveis;
  }

  const handleLogout = async () => {
    try {
      setSaindo(true);
      console.log('[Sidebar] Iniciando logout...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[Sidebar] Erro ao fazer logout:', error);
        alert('Erro ao sair: ' + error.message);
        setSaindo(false);
      } else {
        console.log('[Sidebar] Logout realizado com sucesso - aguardando redirecionamento...');
      }
    } catch (err) {
      console.error('[Sidebar] Erro na execução do logout:', err);
      alert('Erro inesperado ao sair');
      setSaindo(false);
    }
  };

  const inicial = salaoNome ? salaoNome.charAt(0).toUpperCase() : email?.charAt(0).toUpperCase() || 'S';

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col">
      {/* Logo e Nome do Salão */}
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg font-bold">{inicial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{salaoNome || 'Salão'}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400">{dataAtual}</p>
      </div>

      {/* Menu de Navegação */}
      <nav className="flex-1 py-4 space-y-1 px-3">
        {menuItens.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 font-medium shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-slate-900' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Rodapé com Email e Logout */}
      <div className="px-4 py-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 truncate mb-2">{email}</p>
        <button
          onClick={handleLogout}
          disabled={saindo}
          className="w-full flex items-center gap-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          <span>{saindo ? 'Saindo...' : 'Sair'}</span>
        </button>
      </div>
    </aside>
  );
}
