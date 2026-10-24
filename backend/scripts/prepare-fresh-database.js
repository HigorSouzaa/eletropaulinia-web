// Manual one-time preparation of an empty database. Never drops or deletes data.
import 'dotenv/config';
import mongoose from 'mongoose';
import { prepareFreshDatabase } from '../services/prepareFreshDatabase.js';

const [flag, expectedName, confirmation] = process.argv.slice(2);
if (process.argv.length !== 5 || flag !== '--database' || !/^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(expectedName || '')
    || confirmation !== '--confirm-empty' || !process.env.MONGODB_URI) {
  console.error('Use: node backend/scripts/prepare-fresh-database.js --database NAME --confirm-empty (MONGODB_URI in environment)');
  process.exitCode = 1;
} else {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, autoIndex: false });
    const actual = mongoose.connection.db.databaseName;
    if (actual !== expectedName) throw new Error('Database name does not match confirmation');
    const result = await prepareFreshDatabase(mongoose.connection.db);
    console.log(JSON.stringify(result));
  } catch {
    console.error('Preparation refused or failed; check target, emptiness, permissions and indexes');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
