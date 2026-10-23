import mongoose from 'mongoose';
import { createHash } from 'node:crypto';

export const tokenHash = token => createHash('sha256').update(token).digest('hex');
const schema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
export default mongoose.model('RevokedToken', schema);
