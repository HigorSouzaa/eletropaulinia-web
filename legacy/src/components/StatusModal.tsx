import { X } from 'lucide-react';
import type { OrderStatus } from '../contexts/OrderContext';

interface StatusModalProps {
  isOpen: boolean;
  currentStatus: OrderStatus;
  onClose: () => void;
  onUpdateStatus: (status: OrderStatus) => void;
}

const statuses: OrderStatus[] = ['Aguardando', 'Em andamento', 'Pronto', 'Entregue'];

export function StatusModal({ isOpen, currentStatus, onClose, onUpdateStatus }: StatusModalProps) {
  if (!isOpen) return null;

  const handleStatusClick = (status: OrderStatus) => {
    onUpdateStatus(status);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Alterar Status</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusClick(status)}
              className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                status === currentStatus
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
