import mongoose from 'mongoose';
export default mongoose.model('Counter', new mongoose.Schema({
  _id: String,
  value: { type: Number, required: true, min: 0 },
}, { versionKey: false }));
