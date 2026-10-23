// Deliberately restricted to built-in synthetic fixtures. No dotenv, network,
// connection string, file argument or production apply mode.
import mongoose from 'mongoose';
import { transformLegacy } from '../services/legacyOrders.js';

if (process.argv.length !== 3 || process.argv[2] !== '--fixtures-only') {
  console.error('Use: node backend/scripts/transform-order-fixtures.js --fixtures-only');
  process.exitCode = 1;
} else {
  const fixtures = ['Pronto', 'Entregue'].map((status, i) => ({
    _id: new mongoose.Types.ObjectId(`00000000000000000000000${i + 1}`), numero: `OS-000${i + 1}`,
    cliente: 'Fixture sintética', telefone: '0000', equipamento: 'Equipamento sintético',
    marca: '', defeito: 'Relato sintético', status, dataEntrada: new Date('2020-01-01T13:00:00Z'),
  }));
  fixtures.push({ ...fixtures[0], defeito: '' });
  const results = fixtures.map(transformLegacy);
  console.log(JSON.stringify({ fixtures: results.length, transformed: results.filter(item => item.document).length,
    blockedForReconciliation: results.filter(item => !item.document).length,
    databaseWrites: 0 }));
}
