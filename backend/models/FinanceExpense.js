import mongoose from 'mongoose';
const event = new mongoose.Schema({ at: Date, by: mongoose.Schema.Types.ObjectId, reason: String, previous: mongoose.Schema.Types.Mixed }, { _id: false });
const schema = new mongoose.Schema({
  description: { type: String, required: true, maxlength: 160 },
  category: { type: String, enum: ['aluguel', 'internet', 'agua', 'energia', 'peca', 'outra'], required: true },
  amountCentavos: { type: Number, min: 1, max: 999999999, required: true },
  state: { type: String, enum: ['previsto', 'pago', 'cancelado'], required: true },
  dueDate: { type: String, default: null }, paidAt: { type: Date, default: null },
  orderId: { type: mongoose.Schema.Types.ObjectId, default: null }, equipmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  orderNumberSnapshot: { type: String, default: null }, equipmentNameSnapshot: { type: String, default: null },
  recurrenceId: { type: mongoose.Schema.Types.ObjectId, default: null }, competence: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true }, updatedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  requestKey: { type: String, select: false }, requestHash: { type: String, select: false },
  version: { type: Number, default: 1 }, history: { type: [event], default: [] },
}, { collection: 'financeExpenses', timestamps: true, strict: 'throw', autoIndex: false, autoCreate: false });
schema.index({ paidAt: -1, _id: -1 });
schema.index({ state: 1, dueDate: -1, _id: -1 });
schema.index({ orderId: 1, equipmentId: 1 });
schema.index({ recurrenceId: 1, competence: 1 }, { unique: true, partialFilterExpression: { recurrenceId: { $type: 'objectId' } }, name: 'recurrence_competence_unique' });
schema.index({ createdBy: 1, requestKey: 1 }, { unique: true, partialFilterExpression: { requestKey: { $type: 'string' } }, name: 'expense_request_key' });
export default mongoose.model('FinanceExpense', schema);
