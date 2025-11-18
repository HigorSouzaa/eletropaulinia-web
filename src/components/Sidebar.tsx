import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, BarChart3, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';

export function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-6 flex flex-col">
      <div className="mb-8 flex items-center gap-2">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">⚡</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Eletro Paulínia</h1>
      </div>

      <nav className="flex-1 space-y-1">
        <Link
          to="/ordens"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive('/ordens')
              ? 'bg-orange-50 text-orange-600 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
       
        <Link
          to="/whatsapp-chat"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive('/whatsapp-chat')
              ? 'bg-orange-50 text-orange-600 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <MessageCircle size={20} />
          <span>Chat WhatsApp</span>
        </Link>

        <Link
          to="/nova-ordem"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive('/nova-ordem')
              ? 'bg-orange-50 text-orange-600 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <FileText size={20} />
          <span>Nova Ordem</span>
        </Link>


        <Link
          to="/clientes"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Users size={20} />
          <span>Clientes</span>
        </Link>

        <Link
          to="/relatorios"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <BarChart3 size={20} />
          <span>Relatórios</span>
        </Link>
      </nav>
    </aside>
  );
}
