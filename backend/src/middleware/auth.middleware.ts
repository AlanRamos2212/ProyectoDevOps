import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/auth.js';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function validateTransactionId(req: Request, res: Response, next: NextFunction) {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Id inválido' });
  next();
}
