import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const publicUser = user => ({
  _id: user._id,
  username: user.username,
  name: user.name,
  role: user.role,
});

// Provisionamento administrativo não inicia sessão como o novo usuário.
export const register = async (req, res) => {
  try {
    const { username, password, name, role = 'atendente' } = req.body;
    const user = await User.create({ username: username.trim(), password, name: name.trim(), role });
    return res.status(201).json(publicUser(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Usuário já existe' });
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Dados de cadastro inválidos' });
    return res.status(500).json({ message: 'Não foi possível cadastrar o usuário' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username.trim() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRE || '1h',
    });
    return res.json({ ...publicUser(user), token });
  } catch {
    return res.status(500).json({ message: 'Não foi possível iniciar a sessão' });
  }
};

export const getMe = (req, res) => res.json(publicUser(req.user));
