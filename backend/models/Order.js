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
orderSchema.index({ numero: 1 });
orderSchema.index({ cliente: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ dataEntrada: -1 });

// Middleware para gerar número automático antes de salvar
orderSchema.pre('save', async function(next) {
  if (!this.numero) {
    // Buscar a última ordem criada
    const lastOrder = await this.constructor.findOne().sort({ createdAt: -1 });
    
    if (lastOrder && lastOrder.numero) {
      // Extrair o número da última ordem (ex: "OS-0001" -> 1)
      const lastNumber = parseInt(lastOrder.numero.split('-')[1]);
      this.numero = `OS-${String(lastNumber + 1).padStart(4, '0')}`;
    } else {
      // Primeira ordem
      this.numero = 'OS-0001';
    }
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
