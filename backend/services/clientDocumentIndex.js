import Client from '../models/Client.js';

const indexName = 'client_document_unique';

function isExpectedIndex(index) {
  return index?.name === indexName && index.unique === true
    && index.key?.documento === 1 && Object.keys(index.key).length === 1
    && index.partialFilterExpression?.documento?.$type === 'string'
    && Object.keys(index.partialFilterExpression).length === 1
    && (!index.collation || index.collation.locale === 'simple');
}

// One-time release step. Call before listening, while the previous API version
// still cannot write customer documents. Do not log document values.
export async function prepareClientDocumentIndex() {
  const indexes = await Client.collection.indexes();
  if (indexes.some(isExpectedIndex)) return 'already_ready';
  if (indexes.some(index => index.name === indexName || index.key?.documento === 1)) {
    throw new Error('CLIENT_DOCUMENT_INDEX_CONFLICT');
  }
  const duplicates = await Client.collection.aggregate([
    { $match: { documento: { $type: 'string' } } },
    { $group: { _id: '$documento', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]).toArray();
  if (duplicates.length) throw new Error('CLIENT_DOCUMENT_DUPLICATES');
  await Client.collection.createIndex({ documento: 1 }, {
    name: indexName,
    unique: true,
    partialFilterExpression: { documento: { $type: 'string' } },
  });
  return 'created';
}
