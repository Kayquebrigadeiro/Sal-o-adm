import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';
import { Calendar, PieChart, ShoppingBag, Settings, LogOut } from 'lucide-react';

export default function Sidebar() {
  const { role, user } = useAuth();
  
  const isDona = role === 'PROPRIETARIO';
  
  const menuItems = [
    { name: 'Recepção (Agenda)', path: '/agenda', icon: <Calendar size={18} /> },
    ...(isDona ? [
      { name: 'Painel do Chefe', path: '/dashboard', icon: <PieChart size={18} /> },
      { name: 'A Vitrine', path: '/homecare', icon: <ShoppingBag size={18} /> },
      { name: 'Casa de Máquinas', path: '/configuracoes', icon: <Settings size={18} /> },
    ] : [])
  ];

  return (
    <aside className="w-64 bg-gray-900 flex flex-col h-full text-gray-300 flex-shrink-0">
      <div className="p-6">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 text-gray-900 shadow-sm">
          <span className="text-2xl">✂</span>
        </div>
        <h1 className="text-white font-bold text-lg">Salon Software</h1>
        <p className="text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap mt-1">{user?.email}</p>
        <span className="inline-block mt-3 text-[10px] uppercase font-bold tracking-wider text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full">
          {role || 'Carregando...'}
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 mt-2">
        {menuItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive 
                ? 'bg-blue-600/15 text-blue-400' 
                : 'hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 hover:text-red-400 transition-colors w-full text-left"
        >
          <LogOut size={18} />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
