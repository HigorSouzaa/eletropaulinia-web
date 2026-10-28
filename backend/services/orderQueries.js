import mongoose from 'mongoose';
import Order from '../models/OrderV2.js';
import { object, OrderError, validId } from './orderInput.js';
import { orderDTO } from './ordersV2.js';

const delivered = { $cond: [{ $eq: ['$schemaVersion', 2] }, { $size: { $filter: { input: '$equipamentos', as: 'item', cond: { $ne: ['$$item.retirada', null] } } } }, { $cond: [{ $eq: ['$status', 'Entregue'] }, 1, 0] }] };
const total = { $cond: [{ $eq: ['$schemaVersion', 2] }, { $size: '$equipamentos' }, 1] };
function bad() { throw new OrderError(400, 'VALIDATION_ERROR'); }
export function queryInput(query, summary = false) {
  object(query, summary ? ['q', 'status', 'entrega', 'clienteId'] : ['q', 'status', 'entrega', 'clienteId', 'page', 'pageSize', 'sort', 'direction'], 'query');
  for (const value of Object.values(query)) if (typeof value !== 'string') bad();
  const page = query.page === undefined ? 1 : Number(query.page);
  const pageSize = query.pageSize === undefined ? 25 : Number(query.pageSize);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) bad();
  if (query.q?.length > 100 || (query.status && !['Aguardando', 'Em andamento', 'Pronto', 'Entregue'].includes(query.status)) || (query.entrega && !['nenhuma', 'parcial', 'completa'].includes(query.entrega))) bad();
  if (query.sort && !['dataEntrada', 'createdAt', 'numero'].includes(query.sort)) bad();
  if (query.direction && !['asc', 'desc'].includes(query.direction)) bad();
  const filter = {};
  if (query.clienteId) { validId(query.clienteId); filter.clienteId = new mongoose.Types.ObjectId(query.clienteId); }
  if (query.q?.trim()) {
    const literal = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['numero', 'cliente.nome', 'cliente.telefone', 'equipamentos.nome', 'cliente', 'telefone', 'equipamento'].map(field => ({ [field]: { $regex: literal, $options: 'i' } }));
  }
  if (query.status) filter.status = query.status;
  if (query.entrega) filter.$expr = query.entrega === 'nenhuma' ? { $eq: [delivered, 0] } : query.entrega === 'completa' ? { $eq: [delivered, total] } : { $and: [{ $gt: [delivered, 0] }, { $lt: [delivered, total] }] };
  return { filter, page, pageSize, sort: query.sort || 'dataEntrada', direction: query.direction === 'asc' ? 1 : -1 };
}
export async function listOrders(query) {
  const { filter, page, pageSize, sort, direction } = queryInput(query);
  const legacy = await Order.collection.findOne({ schemaVersion: { $ne: 2 } }, { projection: { _id: 1 } });
  let data;
  if (!legacy) {
    data = await Order.collection.find(filter).sort({ [sort === 'numero' ? 'sequencia' : sort]: direction, _id: direction }).skip((page - 1) * pageSize).limit(pageSize).maxTimeMS(5000).toArray();
  } else {
    // Mixed historical dates/numbers need normalization; this transitional path
    // can scan/sort. It does not pretend to be an indexed substring search.
    const value = sort === 'numero' ? { $convert: { input: { $substrBytes: [{ $convert: { input: '$numero', to: 'string', onError: '', onNull: '' } }, 3, 64] }, to: 'long', onError: null, onNull: null } } : { $convert: { input: `$${sort}`, to: 'date', onError: null, onNull: null } };
    data = await Order.collection.aggregate([{ $match: filter }, { $set: { _sort: value } }, { $sort: { _sort: direction, _id: direction } }, { $skip: (page - 1) * pageSize }, { $limit: pageSize }], { maxTimeMS: 5000 }).toArray();
  }
  const count = await Order.collection.countDocuments(filter, { maxTimeMS: 5000 });
  return { data: data.map(orderDTO), meta: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) } };
}
export async function summaryOrders(query) {
  const { filter } = queryInput(query, true);
  const rows = await Order.collection.aggregate([{ $match: filter }, { $group: { _id: { $cond: [{ $eq: [{ $type: '$status' }, 'string'] }, '$status', null] }, total: { $sum: 1 }, equipamentos: { $sum: total }, retirados: { $sum: delivered } } }], { maxTimeMS: 5000 }).toArray();
  return { data: { total: rows.reduce((sum, row) => sum + row.total, 0), equipamentos: rows.reduce((sum, row) => sum + row.equipamentos, 0), retirados: rows.reduce((sum, row) => sum + row.retirados, 0), porStatus: rows.map(row => ({ status: row._id ?? null, total: row.total })) } };
}
