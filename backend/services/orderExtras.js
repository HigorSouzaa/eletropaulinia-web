import User from '../models/User.js';
import Order from '../models/OrderV2.js';
import { object, validId, OrderError } from './orderInput.js';
const bad = () => { throw new OrderError(400, 'VALIDATION_ERROR'); };
export function evaluationInput(value, actor, previous) {
  if (value === null) return { laudo: null, servicos: [], totalCentavos: null, atualizadoPor: actor, atualizadoEm: new Date() };
  object(value, ['laudo', 'servicos'], 'avaliacao');
  const laudo = value.laudo == null ? null : typeof value.laudo === 'string' ? value.laudo.trim() || null : bad();
  if (laudo?.length > 5000 || !Array.isArray(value.servicos) || value.servicos.length > 100) bad();
  const servicos = value.servicos.map(service => {
    object(service, ['_id', 'descricao', 'valorCentavos'], 'servico');
    if (typeof service.descricao !== 'string' || !service.descricao.trim() || service.descricao.trim().length > 500 || !Number.isSafeInteger(service.valorCentavos) || service.valorCentavos < 0 || service.valorCentavos > 99999999) bad();
    if (service._id !== undefined) { validId(service._id); if (!previous?.servicos.some(s => String(s._id) === service._id)) bad(); }
    return { ...(service._id ? { _id: service._id } : {}), descricao: service.descricao.trim(), valorCentavos: service.valorCentavos };
  });
  const ids = servicos.filter(s => s._id).map(s => s._id);
  if (new Set(ids).size !== ids.length || servicos.reduce((sum, s) => sum + s.valorCentavos, 0) > 999999999) bad();
  const comparable = list => list.map(s => ({ _id: s._id ? String(s._id) : null, descricao: s.descricao, valorCentavos: s.valorCentavos }));
  if (previous && previous.laudo === laudo && JSON.stringify(comparable(previous.servicos)) === JSON.stringify(comparable(servicos))) return previous;
  return { laudo, servicos, totalCentavos: servicos.length ? servicos.reduce((sum, s) => sum + s.valorCentavos, 0) : null, atualizadoPor: actor, atualizadoEm: new Date() };
}
export async function resolveTechnician(id, session) {
  if (id === null) return { tecnicoId: null, tecnico: null };
  validId(id);
  const user = await User.findOneAndUpdate({ _id: id, active: { $ne: false }, role: { $in: ['admin', 'tecnico'] } }, { $inc: { assignmentFence: 1 } }, { new: true, session });
  if (!user) throw new OrderError(409, 'TECHNICIAN_UNAVAILABLE');
  return { tecnicoId: user._id, tecnico: user.name };
}
export const civilDate = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
export function deadline(date) { return new Date(Date.parse(date + 'T00:00:00Z') + 90 * 86400000).toISOString().slice(0, 10); }
export function warrantyView(item, entry, type = 'normal') {
  const start = item.retorno ? item.retorno.inicio : type !== 'retorno' && item.retirada?.retiradoEm ? civilDate(item.retirada.retiradoEm) : null;
  const end = item.garantiaFim || (item.retorno ? item.retorno.fim : start ? deadline(start) : null);
  const manual = Boolean(item.garantiaFim || item.retorno?.prazoManual);
  return { inicio: start, fim: end, ajustada: manual, situacao: (!start && !manual) || !end || (start && (end < start || entry < start)) ? 'nao_verificavel' : entry <= end ? 'dentro' : 'fora' };
}
export function originInput(value) {
  if (value == null) return null;
  object(value, ['ordemId', 'equipamentoId', 'version'], 'origem');
  validId(value.ordemId); validId(value.equipamentoId);
  if (!Number.isSafeInteger(value.version) || value.version < 1) bad();
  return { ordemId: value.ordemId, equipamentoId: value.equipamentoId, version: value.version };
}
export async function resolveOrigin(value, clienteId, session) {
  if (!value) return null;
  // A conditional write serializes the reference with edits/deletion of its source.
  const order = await Order.findOneAndUpdate({ _id: value.ordemId, clienteId, version: value.version, schemaVersion: 2 }, { $inc: { referenceFence: 1 } }, { new: true, session, timestamps: false });
  if (!order) throw new OrderError(409, 'ORIGIN_CHANGED');
  const equipment = order.equipamentos.find(item => String(item._id) === value.equipamentoId);
  if (!equipment) throw new OrderError(409, 'ORIGIN_CHANGED');
  const prior = equipment.retorno;
  let inicio = prior ? prior.inicio : order.tipoAtendimento !== 'retorno' && equipment.retirada?.retiradoEm ? civilDate(equipment.retirada.retiradoEm) : null;
  let fim = equipment.garantiaFim || (prior ? prior.fim : inicio ? deadline(inicio) : null);
  const prazoManual = Boolean(equipment.garantiaFim || prior?.prazoManual);
  if (prior?.raizOrdemId) {
    const root = await Order.findOneAndUpdate({ _id: prior.raizOrdemId, clienteId, schemaVersion: 2 }, { $inc: { referenceFence: 1 } }, { new: true, session, timestamps: false });
    const rootItem = root?.equipamentos.find(item => String(item._id) === String(prior.raizEquipamentoId));
    if (!rootItem?.retirada?.retiradoEm || civilDate(rootItem.retirada.retiradoEm) !== inicio) { inicio = null; if (!prazoManual) fim = null; }
  }
  return { ordemId: order._id, equipamentoId: equipment._id, numero: order.numero, nome: equipment.nome, sourceVersion: order.version, inicio, fim, prazoManual, raizOrdemId: prior?.raizOrdemId || order._id, raizEquipamentoId: prior?.raizEquipamentoId || equipment._id };
}
