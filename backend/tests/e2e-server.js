// Ambiente exclusivo de teste: sem dotenv e sem URI externa.
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import app from '../app.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import OrderV2 from '../models/OrderV2.js';
import Counter from '../models/Counter.js';
import Client from '../models/Client.js';
import FinanceReceipt from '../models/FinanceReceipt.js';
import FinanceExpense from '../models/FinanceExpense.js';
import FinanceRecurrence from '../models/FinanceRecurrence.js';
import { createOrder } from '../services/ordersV2.js';
process.env.JWT_SECRET=randomBytes(48).toString('hex');
process.env.JWT_EXPIRE='1h';
const mongo=await MongoMemoryReplSet.create({binary:{version:'8.0.17'},replSet:{count:1}});
await mongoose.connect(mongo.getUri(),{dbName:'e2e_synthetic'});
await User.init();await Order.init();
await User.create([
 {username:'teste-a',name:'Funcionário A',role:'admin',password:'Synthetic-test-password-42'},
 {username:'teste-b',name:'Funcionário B',role:'atendente',password:'Synthetic-test-password-42'}
]);
await Order.create({numero:'OS-0001',cliente:'Cliente sintético',telefone:'00000000000',equipamento:'Ventilador de teste',marca:'Teste',defeito:'Teste',dataEntrada:'2026-10-23'});
await OrderV2.createIndexes();
await Client.createCollection(); await Client.createIndexes();
await FinanceReceipt.createCollection(); await FinanceReceipt.createIndexes();
await FinanceExpense.createCollection(); await FinanceExpense.createIndexes();
await FinanceRecurrence.createCollection(); await FinanceRecurrence.createIndexes();
await Counter.create({ _id: 'orders', value: 1 });
const actor = await User.findOne({ username: 'teste-a' });
for (let i = 0; i < 26; i++) {
  await createOrder({ cliente: { nome: `Cliente v2 ${i}`, telefone: `19900001${String(i).padStart(3, '0')}` }, dataEntrada: '2026-10-22',
    equipamentos: i === 0 ? ['Equipamento v2', 'Rádio para teste', 'Ferro para teste'].map(nome => ({ nome, solicitacao: { tipo: 'testar' } })) : [{ nome: `Equipamento paginado ${i}`, solicitacao: { tipo: 'testar' } }] }, `e2e-synthetic-key-${i}`, actor._id);
}
await OrderV2.updateOne({ 'cliente.nome': 'Cliente v2 0' }, { $set: { tecnico: 'Técnico histórico sintético', tecnicoId: null } });
let server=app.listen(5101,'127.0.0.1',()=>console.log('API de teste isolada pronta'));
// Controle existe apenas neste runner local, nunca no app de produção.
const control=createServer(async(req,res)=>{
 if(req.method!=='POST'){res.writeHead(405);res.end();return;}
 if(req.url==='/stop'){
   await new Promise(resolve=>server.close(resolve));
 }else if(req.url==='/start'){
   if(!server.listening)await new Promise(resolve=>{server=app.listen(5101,'127.0.0.1',resolve);});
 }else if(/^\/cleanup-finance-test\/[0-9a-f]{24}$/.test(req.url||'')){
   const orderId=req.url.split('/').at(-1);
   await FinanceReceipt.deleteMany({orderId});
   await OrderV2.deleteOne({_id:orderId});
 }else if(req.url==='/cleanup-finance-ledger'){
   await FinanceExpense.deleteMany({description:{$in:['Energia financeira sintética','Internet financeira sintética']}});
   await FinanceRecurrence.deleteMany({description:'Internet financeira sintética'});
 }else {res.writeHead(404);res.end();return;}
 res.writeHead(204);res.end();
}).listen(5102,'127.0.0.1');
async function stop(){server.close();control.close();await mongoose.disconnect();await mongo.stop();process.exit(0);}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
