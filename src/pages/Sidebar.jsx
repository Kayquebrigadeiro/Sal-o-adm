import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CalendarDays, LayoutDashboard, Scissors, ShoppingBag, Receipt, Settings, LogOut, Sparkles } from 'lucide-react';

export default function Sidebar({ salaoId, email }) {
    const [salaoNome, setSalaoNome] = useState('Carregando...');
    const [hora, setHora] = useState(new Date());

    useEffect(() => {
        const fetchSalao = async () => {
            if (!salaoId) return;
            const { data } = await supabase.from('saloes').select('nome').eq('id', salaoId).single();
            if (data) setSalaoNome(data.nome);
        };
        fetchSalao();

        const timer = setInterval(() => setHora(new Date()), 60000);
        return () => clearInterval(timer);
    }, [salaoId]);

    const menuItems = [
        { to: '/agenda', icon: CalendarDays, label: 'Agenda Diária' },
        { to: '/dashboard', icon: LayoutDashboard, label: 'Painel Financeiro' },
        { to: '/paralelos', icon: Scissors, label: 'Serviços Paralelos' },
        { to: '/homecar', icon: ShoppingBag, label: 'Vendas HomeCare' },
        { to: '/despesas', icon: Receipt, label: 'Despesas' },
        { to: '/configuracoes', icon: Settings, label: 'Configurações' },
    ];

    return (
        <aside className="w-72 bg-zinc-950 text-zinc-400 flex flex-col min-h-screen shadow-2xl border-r border-zinc-900">
            {/* Cabeçalho Premium */}
            <div className="p-6 border-b border-zinc-900/50 bg-zinc-950/80">
                <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="text-rose-400" size={20} />
                    <h2 className="text-xl font-serif text-zinc-100 font-semibold tracking-wide truncate">{salaoNome}</h2>
                </div>
                <p className="text-xs text-zinc-500 truncate">{email}</p>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-1.5">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${isActive
                                ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-900/20'
                                : 'hover:bg-zinc-900 hover:text-zinc-100'
                            }`
                        }
                    >
                        <item.icon size={20} className={({ isActive }) => isActive ? 'text-rose-100' : 'text-zinc-500'} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="p-6">
                <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-zinc-500 hover:text-rose-400 hover:bg-zinc-900/50 rounded-xl transition-colors">
                    <LogOut size={18} /> Sair do Sistema
                </button>
            </div>
        </aside>
    );
}