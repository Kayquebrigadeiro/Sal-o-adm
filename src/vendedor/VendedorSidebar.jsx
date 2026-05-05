import { NavLink } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function VendedorSidebar({ email }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Badge identificador */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="bg-sky-500 text-white text-xs font-bold px-2 py-1 rounded mb-3 inline-block">
          PAINEL DO ADMIN
        </div>
        <p className="text-xs text-gray-400 truncate">{email}</p>
      </div>

      <nav className="flex-1 py-4 space-y-0.5 px-2">
        <NavLink to="/admin/saloes"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-sky-50 text-sky-600 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}>
          Meus Salões
        </NavLink>
        <NavLink to="/admin/novo-salao"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-sky-50 text-sky-600 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}>
          + Novo Salão
        </NavLink>
        <NavLink to="/admin/admins"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-sky-50 text-sky-600 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}>
          Admins
        </NavLink>
        <NavLink to="/admin/assinaturas"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-sky-50 text-sky-600 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}>
          Assinaturas
        </NavLink>
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <button onClick={handleLogout}
          className="w-full text-xs text-gray-400 hover:text-red-500 text-left">
          Sair
        </button>
      </div>
    </aside>
  );
}
