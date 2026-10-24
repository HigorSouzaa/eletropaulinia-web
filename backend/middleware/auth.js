import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RevokedToken, { tokenHash } from '../models/RevokedToken.js';

export const protect = async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ message: 'Autenticação necessária' });
  let decoded;
  try {
    decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded !== 'object' || !Number.isFinite(decoded.exp) || !/^[a-f\d]{24}$/i.test(decoded.id || '')) {
      return res.status(401).json({ message: 'Sessão inválida ou expirada' });
    }
  } catch {
    return res.status(401).json({ message: 'Sessão inválida ou expirada' });
  }
  try {
    if (await RevokedToken.exists({ hash: tokenHash(match[1]) })) {
      return res.status(401).json({ message: 'Sessão inválida ou expirada' });
    }
    const user = await User.findById(decoded.id).select('-password +sessionVersion');
    // Token válido não substitui um usuário ainda existente no banco.
    if (!user || user.active === false || (decoded.sv ?? 0) !== (user.sessionVersion ?? 0)) return res.status(401).json({ message: 'Sessão inválida ou expirada' });
    req.user = user;
    req.authToken = match[1];
    req.authExpires = decoded.exp;
    return next();
  } catch {
    return res.status(503).json({ message: 'Serviço temporariamente indisponível' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Autenticação necessária' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Acesso não permitido' });
  return next();
};
