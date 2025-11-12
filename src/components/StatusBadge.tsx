import type { OrderStatus } from '../contexts/OrderContext';

interface StatusBadgeProps {
  status: OrderStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    'Aguardando': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Em andamento': 'bg-blue-100 text-blue-800 border-blue-300',
    'Pronto': 'bg-green-100 text-green-800 border-green-300',
    'Entregue': 'bg-gray-100 text-gray-800 border-gray-300'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {status}
    </span>
  );
}
