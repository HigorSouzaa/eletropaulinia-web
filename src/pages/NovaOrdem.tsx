import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useOrders } from '../contexts/OrderContext';
import { User, Wrench, Clipboard, Plus, X } from 'lucide-react';

interface Equipamento {
  id: string;
  equipamento: string;
  marca: string;
  numeroSerie: string;
  defeito: string;
}

export function NovaOrdem() {
  const navigate = useNavigate();
  const { addOrder } = useOrders();

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    cliente: '',
    telefone: '',
    dataEntrada: today,
    observacoes: ''
  });

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([
    {
      id: '1',
      equipamento: '',
      marca: '',
      numeroSerie: '',
      defeito: ''
    }
  ]);

  const addEquipamento = () => {
    setEquipamentos([
      ...equipamentos,
      {
        id: Date.now().toString(),
        equipamento: '',
        marca: '',
        numeroSerie: '',
        defeito: ''
      }
    ]);
  };

  const removeEquipamento = (id: string) => {
    if (equipamentos.length > 1) {
      setEquipamentos(equipamentos.filter(eq => eq.id !== id));
    }
  };

  const updateEquipamento = (id: string, field: keyof Equipamento, value: string) => {
    setEquipamentos(equipamentos.map(eq => 
      eq.id === id ? { ...eq, [field]: value } : eq
    ));
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, telefone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Usar dados do primeiro equipamento para compatibilidade
    const primeiroEquipamento = equipamentos[0];

    await addOrder({
      ...formData,
      equipamento: primeiroEquipamento.equipamento,
      marca: primeiroEquipamento.marca,
      numeroSerie: primeiroEquipamento.numeroSerie,
      defeito: primeiroEquipamento.defeito,
      status: 'Aguardando'
    });

    navigate('/ordens');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <nav className="text-sm text-gray-600 mb-2">
            Inicial &gt; Ordens de Serviço &gt; <span className="text-gray-900 font-medium">Nova</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">Nova Ordem de Serviço</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do Cliente */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <User size={20} className="text-orange-500" />
              Dados do Cliente
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={formData.cliente}
                  onChange={(e) => setFormData(prev => ({ ...prev, cliente: e.target.value }))}
                  placeholder="Digite o nome completo"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Informações do Equipamento */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Wrench size={20} className="text-orange-500" />
                Informações do Equipamento
              </h2>
              <button
                type="button"
                onClick={addEquipamento}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-300"
              >
                <Plus size={16} />
                Adicionar Equipamento
              </button>
            </div>
            
            {equipamentos.map((eq, index) => (
              <div key={eq.id} className="mb-6 pb-6 border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0">
                {equipamentos.length > 1 && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Equipamento {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeEquipamento(eq.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remover equipamento"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Tipo do equipamento
                    </label>
                    <input
                      type="text"
                      value={eq.equipamento}
                      onChange={(e) => updateEquipamento(eq.id, 'equipamento', e.target.value)}
                      placeholder="Ex: Notebook, Ar-condicionado, etc."
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Marca / Modelo
                    </label>
                    <input
                      type="text"
                      value={eq.marca}
                      onChange={(e) => updateEquipamento(eq.id, 'marca', e.target.value)}
                      placeholder="Ex: Samsung Galaxy S23"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Nº de série ou identificação
                    </label>
                    <input
                      type="text"
                      value={eq.numeroSerie}
                      onChange={(e) => updateEquipamento(eq.id, 'numeroSerie', e.target.value)}
                      placeholder="Ex: ABC123456789"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Defeito Relatado pelo Cliente
                    </label>
                    <textarea
                      value={eq.defeito}
                      onChange={(e) => updateEquipamento(eq.id, 'defeito', e.target.value)}
                      placeholder="Descreva o problema relatado pelo cliente..."
                      required
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detalhes do Serviço */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Clipboard size={20} className="text-orange-500" />
              Detalhes do Serviço
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Data de Entrada
                </label>
                <input
                  type="date"
                  value={formData.dataEntrada}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataEntrada: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Informações adicionais (opcional)"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate('/ordens')}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              Criar Ordem de Serviço
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
