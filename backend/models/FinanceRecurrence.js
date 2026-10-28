import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  description: { type: String, required: true, maxlength: 160 },
  category: { type: String, enum: ['aluguel', 'internet', 'agua', 'energia', 'outra'], required: true },
  amountCentavos: { type: Number, min: 1, max: 999999999, required: true },
  startCompetence: { type: String, required: true }, endCompetence: { type: String, default: null },
  active: { type: Boolean, default: true }, version: { type: Number, default: 1 },
  generationFence: { type: Number, default: 0, select: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true }, updatedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  requestKey: { type: String, select: false }, requestHash: { type: String, select: false },
  history: { type: [{ at: Date, by: mongoose.Schema.Types.ObjectId, reason: String, previous: mongoose.Schema.Types.Mixed }], default: [] },
}, { collection: 'financeRecurrences', timestamps: true, strict: 'throw', autoIndex: false, autoCreate: false });
schema.index({ active: 1, startCompetence: 1 });
schema.index({ createdBy: 1, requestKey: 1 }, { unique: true, partialFilterExpression: { requestKey: { $type: 'string' } }, name: 'recurrence_request_key' });
export default mongoose.model('FinanceRecurrence', schema);
