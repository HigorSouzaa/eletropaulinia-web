import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Gerar JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Registrar novo usuário
// @route   POST /api/auth/register
// @access  Public (em produção, deve ser protegido)
export const register = async (req, res) => {
  try {
    const { username, password, name, role } = req.body;

    // Verificar se usuário já existe
    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    // Criar usuário
    const user = await User.create({
      username,
      password,
      name,
      role: role || 'atendente'
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Dados de usuário inválidos' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Verificar se usuário existe
    const user = await User.findOne({ username }).select('+password');

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Credenciais inválidas' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obter perfil do usuário logado
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
