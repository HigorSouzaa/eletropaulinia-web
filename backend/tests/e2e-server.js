// Ambiente exclusivo de teste: sem dotenv e sem URI externa.
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import app from '../app.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
process.env.JWT_SECRET=randomBytes(48).toString('hex');
process.env.JWT_EXPIRE='1h';
const mongo=await MongoMemoryServer.create({binary:{version:'8.0.17'},instance:{ip:'127.0.0.1'}});
await mongoose.connect(mongo.getUri(),{dbName:'e2e_synthetic'});
await User.init();await Order.init();
await User.create([
 {username:'teste-a',name:'Funcionário A',role:'admin',password:'Synthetic-test-password-42'},
 {username:'teste-b',name:'Funcionário B',role:'atendente',password:'Synthetic-test-password-42'}
]);
await Order.create({cliente:'Cliente sintético',telefone:'00000000000',equipamento:'Ventilador de teste',marca:'Teste',defeito:'Teste',dataEntrada:'2026-10-23'});
let server=app.listen(5101,'127.0.0.1',()=>console.log('API de teste isolada pronta'));
// Controle existe apenas neste runner local, nunca no app de produção.
const control=createServer(async(req,res)=>{
 if(req.method!=='POST'){res.writeHead(405);res.end();return;}
 if(req.url==='/stop'){
   await new Promise(resolve=>server.close(resolve));
 }else if(req.url==='/start'){
   if(!server.listening)await new Promise(resolve=>{server=app.listen(5101,'127.0.0.1',resolve);});
 }else {res.writeHead(404);res.end();return;}
 res.writeHead(204);res.end();
}).listen(5102,'127.0.0.1');
async function stop(){server.close();control.close();await mongoose.disconnect();await mongo.stop();process.exit(0);}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
