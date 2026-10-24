import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import RevokedToken, { tokenHash } from '../models/RevokedToken.js';
import User from '../models/User.js';
import { beforeLogin, failedLogin, successfulLogin, LoginThrottled } from '../services/loginThrottle.js';

const publicUser = user => ({
  _id: user._id,
  username: user.username,
  name: user.name,
  role: user.role,
  active: user.active !== false,
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
    // The socket address cannot be replaced by an untrusted X-Forwarded-For header.
    const attempt = await beforeLogin(username, req.socket.remoteAddress);
    const user = await User.findOne({ username: username.trim() }).select('+password +sessionVersion');
    if (!user || user.active === false || !(await user.matchPassword(password))) {
      await failedLogin(attempt);
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    await successfulLogin(attempt);
    const token = jwt.sign({ id: user._id.toString(), sv: user.sessionVersion ?? 0 }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      jwtid: randomUUID(),
      expiresIn: process.env.JWT_EXPIRE || '1h',
    });
    return res.json({ ...publicUser(user), token });
  } catch (error) {
    if (error instanceof LoginThrottled) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({ message: 'Muitas tentativas. Aguarde antes de tentar novamente.' });
    }
    return res.status(503).json({ message: 'Login temporariamente indisponível' });
  }
};

export const getMe = (req, res) => res.json(publicUser(req.user));

export const logout = async (req, res) => {
  try {
    await RevokedToken.updateOne(
      { hash: tokenHash(req.authToken) },
      { $setOnInsert: { expiresAt: new Date(req.authExpires * 1000) } },
      { upsert: true },
    ).catch(error => { if (error.code !== 11000) throw error; });
    return res.status(204).end();
  } catch {
    return res.status(503).json({ message: 'Não foi possível encerrar a sessão' });
  }
};
