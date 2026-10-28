import mongoose from 'mongoose';
import Order from '../models/OrderV2.js';
import Client from '../models/Client.js';
import { validId } from './orderInput.js';

// Test-only rehearsal. No URI argument, dotenv, remote executor or inferred matching.
export async function rehearseClientLinks(mappings, { dryRun = true } = {}) {
 if (mongoose.connection.name !== 'clients_slice_test' || !['127.0.0.1', 'localhost'].includes(mongoose.connection.host)) throw new Error('Disposable rehearsal database required');
 if (!Array.isArray(mappings) || mappings.length > 1000) throw new Error('Invalid mapping batch');
 const report = { planned: 0, applied: 0, unchanged: 0, conflicts: 0 };
 for (const mapping of mappings) {
  validId(mapping.orderId); validId(mapping.clientId);
  if (!Number.isSafeInteger(mapping.version) || mapping.version < 1) throw new Error('Invalid expected version');
  const order = await Order.findById(mapping.orderId).lean(); const client = await Client.findById(mapping.clientId).lean();
  if (!order || !client || order.schemaVersion !== 2) { report.conflicts++; continue; }
  if (String(order.clienteId) === mapping.clientId) { report.unchanged++; continue; }
  if (order.clienteId || order.version !== mapping.version) { report.conflicts++; continue; }
  report.planned++;
  if (!dryRun) {
   const updated = await Order.updateOne({ _id: order._id, version: mapping.version, clienteId: null }, { $set: { clienteId: client._id }, $inc: { version: 1 } });
   if (updated.modifiedCount) report.applied++; else report.conflicts++;
  }
 }
 return report;
}

export async function inventoryClientLinks() {
 if (mongoose.connection.name !== 'clients_slice_test' || !['127.0.0.1', 'localhost'].includes(mongoose.connection.host)) throw new Error('Disposable rehearsal database required');
 const { normalizePhone } = await import('../../shared/phone.js');
 const report = { orders: 0, linked: 0, missingPhone: 0, invalidPhone: 0, divergentPhoneGroups: 0, textualTechnicians: 0 };
 const groups = new Map();
 for await (const row of Order.collection.find({}, { projection: { schemaVersion: 1, cliente: 1, telefone: 1, clienteId: 1, tecnico: 1, tecnicoId: 1 } })) {
  report.orders++; if (row.clienteId) report.linked++;
  const phone = row.schemaVersion === 2 ? row.cliente?.telefone : row.telefone;
  if (!phone) report.missingPhone++; else if (!normalizePhone(phone)) report.invalidPhone++;
  else { const normalized = normalizePhone(phone); const values = groups.get(normalized) || new Set(); values.add(JSON.stringify([row.schemaVersion === 2 ? row.cliente?.nome : row.cliente, row.schemaVersion === 2 ? row.cliente?.email : null])); groups.set(normalized, values); }
  if (row.tecnico && !row.tecnicoId) report.textualTechnicians++;
 }
 report.divergentPhoneGroups = [...groups.values()].filter(values => values.size > 1).length;
 return report;
}
