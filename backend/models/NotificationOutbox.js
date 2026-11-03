import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  kind: { type: String, enum: ['order_created'], required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, required: true },
  phone: { type: String, required: true },
  customerName: { type: String, required: true },
  orderNumber: { type: String, required: true },
  entryDate: { type: String, required: true },
  state: { type: String, enum: ['pending', 'accepted', 'uncertain', 'failed'], default: 'pending', required: true },
  providerMessageId: { type: String, default: null },
  attemptedAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
}, { collection: 'notificationOutbox', timestamps: true, strict: 'throw', autoIndex: false, autoCreate: false });

schema.index({ orderId: 1, kind: 1 }, { unique: true, name: 'outbox_order_kind_unique' });
schema.index({ state: 1, createdAt: 1 }, { name: 'outbox_pending' });

export default mongoose.model('NotificationOutbox', schema);
