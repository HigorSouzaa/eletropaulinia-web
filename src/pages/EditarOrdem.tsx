import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FormInput } from '../components/FormInput';
import { useOrders } from '../contexts/OrderContext';
import { Check } from 'lucide-react';

export function EditarOrdem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getOrder, updateOrder } = useOrders();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const order = getOrder(id || '');

  const [formData, setFormData] = useState({
    cliente: '',
    telefone: '',
    equipamento: '',
    defeito: '',
    dataEntrada: ''
  });

  useEffect(() => {
    if (order) {
      setFormData({
        cliente: order.cliente,
        telefone: order.telefone,
        equipamento: order.equipamento,
        defeito: order.defeito,
        dataEntrada: order.dataEntrada
      });
    }
  }, [order]);

  if (!order) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Ordem de serviço não encontrada</p>
        </div>
      </Layout>
    );
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setFormData(prev => ({ ...prev, telefone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await updateOrder(order._id, formData);
      navigate('/ordens');
    } catch {
      setError('Não foi possível salvar as alterações. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Editar Ordem de Serviço</h1>
        <p className="text-gray-600 mb-8">OS: {order.numero}</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8 space-y-6">
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Nome do Cliente"
              value={formData.cliente}
              onChange={(value) => setFormData(prev => ({ ...prev, cliente: value }))}
              placeholder="Digite o nome completo"
              required
            />

            <FormInput
              label="Telefone"
              value={formData.telefone}
              onChange={handlePhoneChange}
              placeholder="(99) 99999-9999"
              required
            />
          </div>

          <FormInput
            label="Equipamento"
            value={formData.equipamento}
            onChange={(value) => setFormData(prev => ({ ...prev, equipamento: value }))}
            placeholder="Ex: TV Samsung 50 polegadas"
            required
          />

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Defeito Relatado <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.defeito}
              onChange={(e) => setFormData(prev => ({ ...prev, defeito: e.target.value }))}
              placeholder="Descreva o problema relatado pelo cliente"
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          <FormInput
            label="Data de Entrada"
            type="date"
            value={formData.dataEntrada}
            onChange={(value) => setFormData(prev => ({ ...prev, dataEntrada: value }))}
            required
          />

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              <Check size={20} />
              {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/ordens')}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
