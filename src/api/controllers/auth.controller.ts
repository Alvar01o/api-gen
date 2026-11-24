import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getOrm } from '../../core/database/app.orm';
import { User, UserRole } from '../../core/database/entities/User.entity';

const secret = () => process.env.JWT_SECRET ?? 'change-me-in-production';

function signToken(user: User) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    secret() as jwt.Secret,
    { expiresIn: '7d' },
  );
}

function userDto(user: User) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function registerHandler(req: Request, res: Response) {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const em = getOrm().em.fork();
  if (await em.findOne(User, { email })) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const user = em.create(User, { name: name.trim(), email: email.trim().toLowerCase(), passwordHash, role: UserRole.CLIENT, createdAt: now, updatedAt: now });
  await em.persist(user);
  await em.flush();

  res.status(201).json({ token: signToken(user), user: userDto(user) });
}

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const em = getOrm().em.fork();
  const user = await em.findOne(User, { email: email.trim().toLowerCase() });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ token: signToken(user), user: userDto(user) });
}

export async function meHandler(req: Request, res: Response) {
  res.json({ user: req.user });
}
