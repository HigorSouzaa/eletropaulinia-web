import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Por favor, forneça um nome de usuário'],
    unique: true,
    trim: true,
    minlength: [3, 'Nome de usuário deve ter pelo menos 3 caracteres']
  },
  password: {
    type: String,
    required: [true, 'Por favor, forneça uma senha'],
    minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
    select: false
  },
  name: {
    type: String,
    required: [true, 'Por favor, forneça um nome'],
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'tecnico', 'atendente'],
    default: 'atendente'
  },
  assignmentFence: { type: Number, default: 0, select: false },
  active: { type: Boolean, default: true },
  sessionVersion: { type: Number, default: 0, min: 0, select: false },
  version: { type: Number, default: 1, min: 1 },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Criptografar senha antes de salvar
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar senhas
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
