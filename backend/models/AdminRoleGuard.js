import mongoose from 'mongoose';
const schema = new mongoose.Schema({ _id: String, serial: { type: Number, default: 0 } }, { versionKey: false });
export default mongoose.model('AdminRoleGuard', schema);
