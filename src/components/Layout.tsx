import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-end gap-4">
            <div className="text-sm text-gray-600">
              Olá, <span className="font-semibold text-gray-900">{user?.name || 'Administrador'}</span>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
