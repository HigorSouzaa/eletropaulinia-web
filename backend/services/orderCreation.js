import { evaluationInput, originInput, resolveOrigin, resolveTechnician } from './orderExtras.js';
import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import Order from '../models/OrderV2.js';
import Counter from '../models/Counter.js';
import { clientPhone, requireClientsReady, resolveClient } from './clients.js';
import { OrderError, createInput, clientSnapshotInput, orderFieldsInput, creationKey, validId, object } from './orderInput.js';

function linkedInput(body) {
  object(body, ['cliente', 'clienteId', 'clienteVersion', 'equipamentos', 'dataEntrada', 'dataPrevista', 'tecnico', 'observacoes'], 'body');
  let client;
  if ('clienteId' in body) {
    validId(body.clienteId);
    if ('cliente' in body || !Number.isSafeInteger(body.clienteVersion) || body.clienteVersion < 1) throw new OrderError(400, 'VALIDATION_ERROR');
    client = { clienteId: body.clienteId.toLowerCase(), clienteVersion: body.clienteVersion };
  } else {
    if ('clienteVersion' in body) throw new OrderError(400, 'VALIDATION_ERROR');
    const cliente = clientSnapshotInput(body.cliente);
    cliente.telefone = clientPhone(cliente.telefone, 'cliente.telefone');
    client = { cliente };
  }
  return { ...client, ...orderFieldsInput(body) };
}
function extendedInput(body) {
  object(body, ['cliente', 'clienteId', 'clienteVersion', 'equipamentos', 'dataEntrada', 'dataPrevista', 'tecnico', 'tecnicoId', 'observacoes', 'tipoAtendimento'], 'body');
  const { tecnicoId = null, tipoAtendimento = 'normal', ...base } = body;
  if (!['normal', 'retorno'].includes(tipoAtendimento)) throw new OrderError(400, 'VALIDATION_ERROR');
  if (tecnicoId !== null) validId(tecnicoId);
  if (body.tecnico != null && body.tecnico !== '') throw new OrderError(409, 'TECHNICIAN_REFERENCE_REQUIRED');
  if (!Array.isArray(base.equipamentos)) throw new OrderError(400, 'VALIDATION_ERROR');
  const extras = base.equipamentos.map(item => {
    object(item, ['nome', 'marca', 'modelo', 'numeroSerie', 'solicitacao', 'avaliacao', 'origem'], 'equipamento');
    const value = item.avaliacao == null ? null : evaluationInput(item.avaliacao);
    const avaliacao = value ? { laudo: value.laudo, servicos: value.servicos } : null;
    const origem = originInput(item.origem);
    if (origem && tipoAtendimento !== 'retorno') throw new OrderError(400, 'VALIDATION_ERROR');
    return { avaliacao, origem };
  });
  base.equipamentos = base.equipamentos.map(({ avaliacao: _a, origem: _o, ...item }) => item);
  return { ...linkedInput(base), tecnicoId, tipoAtendimento, extras };
}
const digest = input => createHash('sha256').update(JSON.stringify(input)).digest('hex');
function replay(existing, body) {
  const hash = digest(existing.creationHashVersion === 3 ? extendedInput(body) : existing.creationHashVersion === 2 ? linkedInput(body) : createInput(body));
  if (hash !== existing.creationHash) throw new OrderError(409, 'IDEMPOTENCY_CONFLICT');
  return { document: existing, created: false };
}
async function findReplay(scope, body) {
  const existing = await Order.findOne(scope).select('+creationHash +creationHashVersion');
  return existing ? replay(existing, body) : null;
}

export async function createOrder(body, key, actor) {
  const validatedKey = creationKey(key);
  const scope = { schemaVersion: 2, createdBy: actor, creationKey: validatedKey };
  const previous = await findReplay(scope, body);
  if (previous) return previous;
  const input = extendedInput(body);
  const hash = digest(input);
  const indexes = await Order.collection.indexes();
  const numberIndex = indexes.some(index => index.unique && index.key.numero === 1 && Object.keys(index.key).length === 1 && !index.partialFilterExpression && !index.sparse);
  const keyIndex = indexes.some(index => index.unique && index.key.createdBy === 1 && index.key.creationKey === 1 && Object.keys(index.key).length === 2 && index.partialFilterExpression?.schemaVersion === 2 && index.partialFilterExpression?.creationKey?.$type === 'string');
  if (!numberIndex || !keyIndex) throw new OrderError(503, 'NUMBERING_NOT_READY');
  await requireClientsReady();
  // Phone insert collisions require a fresh transaction to see the winning client.
  for (let attempt = 0; attempt < 3; attempt++) {
    const session = await mongoose.startSession();
    try {
      // Fresh model instances on every retry; no reused document change tracking.
      return await session.withTransaction(async () => {
        const existing = await Order.findOne(scope).select('+creationHash +creationHashVersion').session(session);
        if (existing) return replay(existing, body);
        const customer = await resolveClient(input, actor, session);
        const counter = await Counter.findOneAndUpdate({ _id: 'orders', value: { $lt: Number.MAX_SAFE_INTEGER } }, { $inc: { value: 1 } }, { new: true, session });
        if (!counter) throw new OrderError(503, 'NUMBERING_NOT_READY');
        const fields = orderFieldsInput(input);
        Object.assign(fields, await resolveTechnician(input.tecnicoId, session), { tipoAtendimento: input.tipoAtendimento });
        for (let index = 0; index < fields.equipamentos.length; index++) {
          fields.equipamentos[index].avaliacao = input.extras[index].avaliacao ? evaluationInput(input.extras[index].avaliacao, actor) : null;
          fields.equipamentos[index].retorno = await resolveOrigin(input.extras[index].origem, customer.clienteId, session);
        }
        const [document] = await Order.create([{ ...fields, ...customer, numero: `OS-${String(counter.value).padStart(4, '0')}`,
          sequencia: counter.value, createdBy: actor, creationKey: validatedKey, creationHash: hash, creationHashVersion: 3 }], { session });
        return { document, created: true };
      }, { readPreference: 'primary', writeConcern: { w: 'majority' }, maxCommitTimeMS: 5000 });
    } catch (error) {
      if (error.code === 11000) {
        const winner = await findReplay(scope, body);
        if (winner) return winner;
        if (error.keyPattern?.telefone) {
          if (attempt < 2) continue;
          throw new OrderError(409, 'CLIENT_REVIEW_REQUIRED');
        }
        if (error.keyPattern?.numero) throw new OrderError(409, 'NUMBER_CONFLICT');
        throw new OrderError(409, 'IDEMPOTENCY_CONFLICT');
      }
      if (error.code === 20 || error.hasErrorLabel?.('UnknownTransactionCommitResult')) throw new OrderError(503, 'TRANSACTION_UNAVAILABLE');
      throw error;
    } finally { await session.endSession(); }
  }
}
