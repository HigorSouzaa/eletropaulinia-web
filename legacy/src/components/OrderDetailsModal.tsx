import { X } from 'lucide-react';
import type { Order } from '../contexts/OrderContext';
import { StatusBadge } from './StatusBadge.tsx';

interface OrderDetailsModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
}

export function OrderDetailsModal({ isOpen, order, onClose }: OrderDetailsModalProps) {
  if (!isOpen || !order) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Detalhes da Ordem de Serviço</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Número da OS</label>
              <p className="text-lg font-semibold mt-1">{order.numero}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <StatusBadge status={order.status} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Cliente</label>
              <p className="text-base mt-1">{order.cliente}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Telefone</label>
              <p className="text-base mt-1">{order.telefone}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Equipamento</label>
            <p className="text-base mt-1">{order.equipamento}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Defeito Relatado</label>
            <p className="text-base mt-1">{order.defeito}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Data de Entrada</label>
            <p className="text-base mt-1">{formatDate(order.dataEntrada)}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
