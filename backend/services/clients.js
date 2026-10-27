import Client from '../models/Client.js';
import { normalizePhone } from '../../shared/phone.js';
import { OrderError } from './orderInput.js';

export function clientPhone(value, path = 'telefone') {
  const phone = normalizePhone(value);
  if (!phone) throw new OrderError(400, 'VALIDATION_ERROR', [{ path, code: 'INVALID_PHONE' }]);
  return phone;
}
export function clientDTO(client) {
  const { _id, nome, telefone, email, version, createdAt, updatedAt } = client;
  return { _id, nome, telefone, email, version, createdAt, updatedAt };
}
export const clientEtag = client => `"client-${client._id}-v${client.version}"`;

export async function requireClientsReady() {
  let indexes;
  try { indexes = await Client.collection.indexes(); }
  catch (error) { if (error.code === 26) throw new OrderError(503, 'CLIENTS_NOT_READY'); throw error; }
  if (!indexes.some(index => index.unique && index.key.telefone === 1 && Object.keys(index.key).length === 1
    && !index.sparse && !index.partialFilterExpression && (!index.collation || index.collation.locale === 'simple'))) {
    throw new OrderError(503, 'CLIENTS_NOT_READY');
  }
}

// Only called inside the order transaction. Never updates customer-facing data.
export async function resolveClient(input, actor, session) {
  let client;
  if (input.clienteId) {
    client = await Client.findOneAndUpdate({ _id: input.clienteId, version: input.clienteVersion },
      { $inc: { usageFence: 1 } }, { new: true, session, timestamps: false });
    if (!client) throw new OrderError(409, 'CLIENT_CHANGED');
  } else {
    client = await Client.findOne({ telefone: input.cliente.telefone }).session(session);
    if (client) {
      if (client.nome !== input.cliente.nome || (input.cliente.email !== null && client.email !== input.cliente.email)) {
        throw new OrderError(409, 'CLIENT_REVIEW_REQUIRED');
      }
      client = await Client.findOneAndUpdate({ _id: client._id, version: client.version },
        { $inc: { usageFence: 1 } }, { new: true, session, timestamps: false });
      if (!client) throw new OrderError(409, 'CLIENT_CHANGED');
    } else {
      [client] = await Client.create([{ ...input.cliente, createdBy: actor, updatedBy: actor }], { session });
    }
  }
  return { clienteId: client._id, cliente: { nome: client.nome, telefone: client.telefone, email: client.email } };
}
