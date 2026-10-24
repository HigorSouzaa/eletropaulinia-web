import Order from '../models/OrderV2.js';
import User from '../models/User.js';
import RevokedToken from '../models/RevokedToken.js';
import Counter from '../models/Counter.js';

const ALLOWED = new Set(['orders', 'users', 'counters', 'adminroleguards', 'revokedtokens']);

export async function prepareFreshDatabase(db) {
  if (!db || db !== Order.db.db || db !== User.db.db) throw new Error('Model connection mismatch');
  const names = await db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of names) {
    if (name.startsWith('system.')) continue;
    if (!ALLOWED.has(name)) throw new Error('Unknown collection in destination');
    if (name === 'counters') {
      const values = await db.collection(name).find({}, { projection: { _id: 1, value: 1 } }).limit(2).toArray();
      if (values.some(item => item._id !== 'orders' || item.value !== 0) || values.length > 1) {
        throw new Error('Destination contains data');
      }
    } else if (await db.collection(name).estimatedDocumentCount() !== 0) {
      throw new Error('Destination contains data');
    }
  }
  // Explicit index setup, never sync/drop. Safe to repeat while the database stays empty.
  await Order.createIndexes();
  await User.createIndexes();
  await RevokedToken.createIndexes();
  await Counter.collection.updateOne({ _id: 'orders' }, { $setOnInsert: { value: 0 } }, { upsert: true });
  return { database: db.databaseName, orders: 0, counter: 0, prepared: true };
}
