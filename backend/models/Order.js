import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  numero: {
    type: String,
    trim: true,
    unique: true
  },
  cliente: {
    type: String,
    required: [true, 'Nome do cliente é obrigatório'],
    trim: true
  },
  telefone: {
    type: String,
    required: [true, 'Telefone é obrigatório'],
    trim: true
  },
  equipamento: {
    type: String,
    required: [true, 'Equipamento é obrigatório'],
    trim: true
  },
  marca: {
    type: String,
    required: [true, 'Marca é obrigatória'],
    trim: true
  },
  numeroSerie: {
    type: String,
    trim: true
  },
  defeito: {
    type: String,
    required: [true, 'Descrição do defeito é obrigatória'],
    trim: true
  },
  status: {
    type: String,
    enum: ['Aguardando', 'Em andamento', 'Pronto', 'Entregue'],
    default: 'Aguardando'
  },
  dataEntrada: {
    type: Date,
    required: [true, 'Data de entrada é obrigatória'],
    default: Date.now,
    get: function(date) {
      if (!date) return null;
      return date.toISOString().split('T')[0];
    }
  },
  dataPrevista: {
    type: Date,
    get: function(date) {
      if (!date) return null;
      return date.toISOString().split('T')[0];
    }
  },
  tecnico: {
    type: String,
    trim: true
  },
  observacoes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Índices para melhorar performance de busca
orderSchema.index({ cliente: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ dataEntrada: -1 });

// Modelo legado somente para leitura; numeração pertence ao serviço v2.
const Order = mongoose.model('Order', orderSchema);

export default Order;
