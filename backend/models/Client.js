import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  nome: { type: String, required: true, maxlength: 120 },
  telefone: { type: String, required: true, maxlength: 14 },
  email: { type: String, default: null, maxlength: 254 },
  tipoPessoa: { type: String, enum: ['fisica', 'juridica', null], default: null },
  documento: { type: String, default: null, maxlength: 14 },
  endereco: { type: new mongoose.Schema({ cep: String, logradouro: String, numero: String, complemento: String, bairro: String, cidade: String, uf: String }, { _id: false, strict: 'throw' }), default: null },
  version: { type: Number, default: 1, min: 1, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  usageFence: { type: Number, default: 0, select: false },
}, { collection: 'clients', strict: 'throw', timestamps: true, autoIndex: false, autoCreate: false });
schema.index({ telefone: 1 }, { unique: true, name: 'client_phone_unique' });
schema.index({ documento: 1 }, { unique: true, partialFilterExpression: { documento: { $type: 'string' } }, name: 'client_document_unique' });
schema.index({ nome: 1, _id: 1 });
export default mongoose.model('Client', schema);
