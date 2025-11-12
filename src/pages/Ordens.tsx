import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { StatusModal } from '../components/StatusModal';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { useOrders } from '../contexts/OrderContext';
import type { Order, OrderStatus } from '../contexts/OrderContext';
import { Search, X, Eye, Edit2, RotateCw, Plus } from 'lucide-react';

export function Ordens() {
  const navigate = useNavigate();
  const { orders, updateOrderStatus } = useOrders();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    cliente: '',
    numero: '',
    telefone: '',
    dataInicial: '',
    dataFinal: '',
    status: [] as OrderStatus[]
  });

  // Estatísticas
  const stats = useMemo(() => {
    const total = orders.length;
    const emAndamento = orders.filter(o => o.status === 'Em andamento').length;
    const aguardando = orders.filter(o => o.status === 'Aguardando').length;
    const prontas = orders.filter(o => o.status === 'Pronto').length;
    
    return { total, emAndamento, aguardando, prontas };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (filters.cliente && !order.cliente.toLowerCase().includes(filters.cliente.toLowerCase())) {
        return false;
      }

      if (filters.numero && !order.numero.toLowerCase().includes(filters.numero.toLowerCase())) {
        return false;
      }

      if (filters.telefone) {
        const phoneNumbers = order.telefone.replace(/\D/g, '');
        const searchNumbers = filters.telefone.replace(/\D/g, '');
        if (!phoneNumbers.includes(searchNumbers)) {
          return false;
        }
      }

      if (filters.dataInicial && order.dataEntrada < filters.dataInicial) {
        return false;
      }

      if (filters.dataFinal && order.dataEntrada > filters.dataFinal) {
        return false;
      }

      if (filters.status.length > 0 && !filters.status.includes(order.status)) {
        return false;
      }

      return true;
    });
  }, [orders, filters]);

  const handleStatusChange = (status: OrderStatus) => {
    if (selectedOrder) {
      updateOrderStatus(selectedOrder._id, status);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      cliente: '',
      numero: '',
      telefone: '',
      dataInicial: '',
      dataFinal: '',
      status: []
    });
  };

  const toggleStatusFilter = (status: OrderStatus) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const hasActiveFilters = Object.values(filters).some(value =>
    Array.isArray(value) ? value.length > 0 : value !== ''
  );

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Ordens de Serviço</h1>
          <button
            onClick={() => navigate('/nova-ordem')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
          >
            <Plus size={18} />
            Nova Ordem
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total de OS</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Aguardando</div>
            <div className="text-3xl font-bold text-yellow-600">{stats.aguardando}</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Em andamento</div>
            <div className="text-3xl font-bold text-blue-600">{stats.emAndamento}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Prontas</div>
            <div className="text-3xl font-bold text-green-600">{stats.prontas}</div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Search size={20} />
              Filtros
            </h2>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <X size={16} />
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={filters.cliente}
              onChange={(e) => setFilters(prev => ({ ...prev, cliente: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            />

            <input
              type="text"
              placeholder="Buscar por número da OS..."
              value={filters.numero}
              onChange={(e) => setFilters(prev => ({ ...prev, numero: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            />

            <input
              type="text"
              placeholder="Buscar por telefone..."
              value={filters.telefone}
              onChange={(e) => setFilters(prev => ({ ...prev, telefone: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Data inicial</label>
              <input
                type="date"
                value={filters.dataInicial}
                onChange={(e) => setFilters(prev => ({ ...prev, dataInicial: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Data final</label>
              <input
                type="date"
                value={filters.dataFinal}
                onChange={(e) => setFilters(prev => ({ ...prev, dataFinal: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-2 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {(['Aguardando', 'Em andamento', 'Pronto', 'Entregue'] as OrderStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => toggleStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.status.includes(status)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Nº OS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Equipamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Data de Entrada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Nenhuma ordem de serviço encontrada
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">#{order.numero}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{order.cliente}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{order.telefone}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{order.equipamento}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{formatDate(order.dataEntrada)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setDetailsModalOpen(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => navigate(`/editar-ordem/${order._id}`)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setStatusModalOpen(true);
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Alterar status"
                          >
                            <RotateCw size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredOrders.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando 1 a 5 de {filteredOrders.length} resultados
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
                  Anterior
                </button>
                <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <StatusModal
        isOpen={statusModalOpen}
        currentStatus={selectedOrder?.status || 'Aguardando'}
        onClose={() => setStatusModalOpen(false)}
        onUpdateStatus={handleStatusChange}
      />

      <OrderDetailsModal
        isOpen={detailsModalOpen}
        order={selectedOrder}
        onClose={() => setDetailsModalOpen(false)}
      />
    </Layout>
  );
}
