import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../database/db.js';
import { jwtSecret } from '../config/auth.js';
import { validateLogin } from '../validators/auth.validator.js';

export function login(req: Request, res: Response) {
  if (!validateLogin(req.body)) return res.status(422).json({ error: 'Datos inválidos', details: validateLogin.errors });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email) as { id: number; email: string; password_hash: string } | undefined;
  if (!user || !bcrypt.compareSync(req.body.password, user.password_hash)) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: '8h' });
  return res.json({ token, user: { id: user.id, email: user.email } });
}

export function currentUser(req: Request, res: Response) {
  const token = req.headers.authorization!.replace(/^Bearer\s+/i, '');
  const user = jwt.verify(token, jwtSecret);
  return res.json({ user });
}
