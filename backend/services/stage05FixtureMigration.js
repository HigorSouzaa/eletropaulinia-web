// Deliberately limited to the disposable database started by the stage-05
// rehearsal runner. No URI, dotenv or production connection is accepted here.
import mongoose from 'mongoose';
import Order from '../models/OrderV2.js';
import { prepareFreshDatabase } from './prepareFreshDatabase.js';
import { transformLegacy } from './legacyOrders.js';

const DATABASE = 'stage05_fixture_only';
function requireFixture(db) {
  if (db.databaseName !== DATABASE || db !== mongoose.connection.db) {
    throw new Error('Disposable stage-05 database required');
  }
}
function sequence(numero) {
  const match = typeof numero === 'string' ? /^OS-(\d{4,})$/.exec(numero) : null;
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
function category(path) {
  // Field paths are schema metadata, never field values.
  return typeof path === 'string' && /^[a-zA-Z][a-zA-Z0-9.[\]]*$/.test(path) ? path : 'dados';
}

export async function inventoryFixture(db) {
  requireFixture(db);
  const summary = { total: 0, legacy: 0, v2: 0, ready: 0, blocked: 0,
    invalidNumbers: 0, duplicateNumbers: 0, maximumSequence: 0, issueCategories: {} };
  const seen = new Set();
  for await (const raw of db.collection('orders').find({})) {
    summary.total++;
    const number = sequence(raw.numero);
    if (number === null) summary.invalidNumbers++;
    else {
      if (seen.has(number)) summary.duplicateNumbers++;
      seen.add(number);
      summary.maximumSequence = Math.max(summary.maximumSequence, number);
    }
    if (raw.schemaVersion === 2) { summary.v2++; continue; }
    summary.legacy++;
    const result = transformLegacy(raw);
    if (result.document) summary.ready++;
    else {
      summary.blocked++;
      for (const path of new Set(result.issues.map(category))) {
        summary.issueCategories[path] = (summary.issueCategories[path] || 0) + 1;
      }
    }
  }
  return summary;
}

export async function migrateFixtureBatch(db, { batchSize = 10, failAfter = null } = {}) {
  requireFixture(db);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) throw new Error('Invalid batch size');
  const inventory = await inventoryFixture(db);
  if (inventory.invalidNumbers || inventory.duplicateNumbers) throw new Error('Numbering reconciliation required');
  let examined = 0; let transformed = 0; let blocked = 0; let changed = 0;
  const cursor = db.collection('orders').find({ schemaVersion: { $ne: 2 } }).sort({ _id: 1 });
  for await (const raw of cursor) {
    examined++;
    const result = transformLegacy(raw);
    if (!result.document) { blocked++; continue; }
    await new Order(result.document).validate();
    // Exact original-document match prevents overwriting an intervening edit.
    const write = await db.collection('orders').replaceOne(raw, result.document);
    if (write.modifiedCount === 1) transformed++;
    else changed++;
    if (failAfter !== null && transformed >= failAfter) throw new Error('Synthetic interruption');
    if (transformed >= batchSize) break;
  }
  return { examined, transformed, blocked, changed, remaining: await db.collection('orders').countDocuments({ schemaVersion: { $ne: 2 } }) };
}

export async function bootstrapFreshFixture(db) {
  requireFixture(db);
  return prepareFreshDatabase(db);
}
