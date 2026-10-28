import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  equipmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  orderNumberSnapshot: { type: String, required: true },
  equipmentNameSnapshot: { type: String, required: true },
  budgetSnapshotCentavos: { type: Number, default: null },
  amountCentavos: { type: Number, required: true, min: 1, max: 999999999 },
  method: { type: String, enum: ['dinheiro', 'pix', 'cartao', 'transferencia', 'outro', null], default: null },
  differenceReason: { type: String, default: null, maxlength: 500 },
  confirmedAt: { type: Date, required: true },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestKey: { type: String, required: true },
  requestHash: { type: String, required: true, select: false },
  voidedAt: { type: Date, default: null },
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  voidReason: { type: String, default: null, maxlength: 500 },
  version: { type: Number, required: true, default: 1 },
}, { collection: 'financeReceipts', autoIndex: false, autoCreate: false, strict: 'throw' });

schema.index({ orderId: 1, equipmentId: 1 }, { unique: true, name: 'receipt_active_equipment', partialFilterExpression: { voidedAt: null } });
schema.index({ confirmedBy: 1, requestKey: 1 }, { unique: true, name: 'receipt_request_key' });
schema.index({ confirmedAt: -1, _id: -1 }, { name: 'receipt_date' });
schema.index({ orderId: 1, equipmentId: 1, confirmedAt: -1 }, { name: 'receipt_history' });

export default mongoose.model('FinanceReceipt', schema);
