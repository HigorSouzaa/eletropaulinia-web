import mongoose from 'mongoose';

const text = (max, required = false) => ({ type: String, maxlength: max, required, default: required ? undefined : null });
const equipment = new mongoose.Schema({
  nome: text(160, true), marca: text(120), modelo: text(120), numeroSerie: text(120),
  solicitacao: {
    tipo: { type: String, enum: ['relato', 'testar'], required: true },
    descricao: text(2000),
  },
  andamento: { type: String, enum: ['Aguardando', 'Em andamento', 'Pronto', null], default: 'Aguardando' },
  retirada: { type: new mongoose.Schema({
    retiradoEm: Date, registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    origem: { type: String, enum: ['operacao', 'legado'] },
  }, { _id: false }), default: null },
}, { strict: 'throw' });
const schema = new mongoose.Schema({
  schemaVersion: { type: Number, enum: [2], default: 2, required: true },
  version: { type: Number, default: 1, min: 1, required: true },
  numero: { type: String, required: true, immutable: true },
  sequencia: { type: Number, required: true, min: 1, immutable: true },
  cliente: { nome: text(120, true), telefone: text(32, true), email: text(254) },
  equipamentos: { type: [equipment], validate: v => v.length >= 1 && v.length <= 100 },
  dataEntrada: { type: String, required: true }, dataPrevista: text(10),
  tecnico: text(120), observacoes: text(5000),
  status: { type: String, enum: ['Aguardando', 'Em andamento', 'Pronto', 'Entregue'], default: 'Aguardando' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  creationKey: { type: String, select: false },
  creationHash: { type: String, select: false },
  migration: { type: mongoose.Schema.Types.Mixed, select: false },
}, { collection: 'orders', timestamps: true, strict: 'throw', autoIndex: false });
// Index installation is explicit, never a side effect of importing this model.
schema.index({ numero: 1 }, { unique: true });
schema.index({ createdBy: 1, creationKey: 1 }, { unique: true, partialFilterExpression: { schemaVersion: 2, creationKey: { $type: 'string' } } });
schema.index({ dataEntrada: -1, _id: -1 });
export default mongoose.model('OrderV2', schema);
