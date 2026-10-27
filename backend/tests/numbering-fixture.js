// Test-only setup: does not import dotenv or open connections.
import Order from '../models/OrderV2.js';
import Counter from '../models/Counter.js';
import Client from '../models/Client.js';

export async function prepareNumberingFixture() {
  if (Order.db.name !== 'orders_v2_test') throw new Error('Isolated test database required');
  const seen = new Set();
  let maximum = 0;
  for await (const order of Order.collection.find({}, { projection: { numero: 1 } })) {
    if (!/^OS-\d{4,}$/.test(order.numero || '')) throw new Error('Invalid numbering fixture');
    const number = Number(order.numero.slice(3));
    if (!Number.isSafeInteger(number) || number < 1 || seen.has(number)) throw new Error('Unreconciled numbering fixture');
    seen.add(number); maximum = Math.max(maximum, number);
  }
  await Order.createIndexes();
  await Client.createCollection();
  await Client.createIndexes();
  await Counter.updateOne({ _id: 'orders' }, { $max: { value: maximum } }, { upsert: true });
}
