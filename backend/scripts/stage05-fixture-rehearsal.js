// Self-contained synthetic rehearsal. Never reads MONGODB_URI or dotenv.
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { inventoryFixture, migrateFixtureBatch } from '../services/stage05FixtureMigration.js';

if (process.argv.length !== 3 || process.argv[2] !== '--fixtures-only') {
  console.error('Use: node backend/scripts/stage05-fixture-rehearsal.js --fixtures-only');
  process.exitCode = 1;
} else {
  let mongo;
  try {
    mongo = await MongoMemoryServer.create({ binary: { version: '8.0.17' }, instance: { ip: '127.0.0.1' } });
    await mongoose.connect(mongo.getUri(), { dbName: 'stage05_fixture_only' });
    await mongoose.connection.db.collection('orders').insertMany([
      { _id: new mongoose.Types.ObjectId('000000000000000000000001'), numero: 'OS-0001',
        cliente: 'Pessoa sintética', telefone: '0000', equipamento: 'Rádio sintético', marca: '',
        defeito: 'Não liga', status: 'Entregue', dataEntrada: new Date('2020-01-01T12:00:00Z') },
      { _id: new mongoose.Types.ObjectId('000000000000000000000002'), numero: 'OS-0002',
        cliente: 'Pessoa sintética', telefone: '0000', equipamento: 'Ferro sintético', marca: '',
        defeito: 'Não aquece', status: 'Pronto', dataEntrada: new Date('2020-01-02T12:00:00Z') },
    ]);
    const before = await inventoryFixture(mongoose.connection.db);
    const first = await migrateFixtureBatch(mongoose.connection.db, { batchSize: 1 });
    const second = await migrateFixtureBatch(mongoose.connection.db, { batchSize: 2 });
    const repeat = await migrateFixtureBatch(mongoose.connection.db);
    const after = await inventoryFixture(mongoose.connection.db);
    console.log(JSON.stringify({ before, first, second, repeat, after, databaseWrites: first.transformed + second.transformed }));
  } finally {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  }
}
