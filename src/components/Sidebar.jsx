import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CalendarDays, LayoutDashboard, Calculator, PackageOpen, Receipt, Settings, LogOut, Users, Package, Landmark } from 'lucide-react';

const itens = [
  { path: '/agenda',        label: 'Agenda',        icon: CalendarDays,     roles: ['PROPRIETARIO','FUNCIONARIO'] },
  { path: '/clientes',      label: 'Clientes',      icon: Users,            roles: ['PROPRIETARIO','FUNCIONARIO'] },
  { path: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard,  roles: ['PROPRIETARIO'] },
  { path: '/precificacao',  label: 'Precificação',  icon: Calculator,       roles: ['PROPRIETARIO'] },
  { path: '/homecar',       label: 'HomeCare',      icon: PackageOpen,      roles: ['PROPRIETARIO'] },
  { path: '/catalogo',      label: 'Catálogo',      icon: Package,          roles: ['PROPRIETARIO'] },
  { path: '/custos-fixos',  label: 'Custos Fixos',  icon: Landmark,         roles: ['PROPRIETARIO'] },
  { path: '/despesas',      label: 'Despesas',      icon: Receipt,          roles: ['PROPRIETARIO'] },
  { path: '/configuracoes', label: 'Equipe',        icon: Settings,         roles: ['PROPRIETARIO'] },
];

export default function Sidebar({ role, email, salaoNome }) {
  const visiveis = itens.filter(i => i.roles.includes(role));
  const [saindo, setSaindo] = useState(false);

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
    <aside className="w-48 min-h-screen bg-slate-50 border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="px-3 py-4 border-b border-slate-200">
        <p className="text-xs font-bold text-slate-900 truncate">{salaoNome || 'Salão'}</p>
        <p className="text-[10px] text-slate-400 truncate">{email}</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-2">
        {menuItens.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Rodapé */}
      <div className="px-3 py-3 border-t border-slate-200">
        <button
          onClick={handleLogout}
          disabled={saindo}
          className="w-full flex items-center gap-2 text-[10px] text-slate-500 hover:text-slate-900 disabled:opacity-50 px-2 py-1.5 transition-colors"
        >
          <LogOut size={12} />
          <span>{saindo ? 'Saindo...' : 'Sair'}</span>
        </button>
      </div>
    </aside>
  );
}
