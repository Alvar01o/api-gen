import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';
import { getPool } from '../db/pool';
import { AuthManifest } from '../registry';

function esc(engine: string, name: string) {
  if (engine === 'mysql') return `\`${name.replace(/`/g, '``')}\``;
  return `"${name.replace(/"/g, '""')}"`;
}

async function verifyPassword(
  plain: string,
  stored: string,
  algorithm: AuthManifest['hashAlgorithm'],
): Promise<boolean> {
  switch (algorithm) {
    case 'bcrypt':
      return bcrypt.compare(plain, stored);
    case 'md5':
      return crypto.createHash('md5').update(plain).digest('hex') === stored;
    case 'sha1':
      return crypto.createHash('sha1').update(plain).digest('hex') === stored;
    case 'sha256':
      return crypto.createHash('sha256').update(plain).digest('hex') === stored;
    case 'plain':
      return plain === stored;
    default:
      return false;
  }
}

export function makeLoginHandler(engine: string, dbName: string, auth: AuthManifest) {
  return async function loginHandler(req: Request, res: Response) {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const e = (n: string) => esc(engine, n);
    const ph = engine === 'mysql' ? '?' : '$1';
    const sql =
      `SELECT * FROM ${e(auth.table)} WHERE ${e(auth.usernameField)} = ${ph} LIMIT 1`;

    let rows: Record<string, unknown>[];
    try {
      const pool = await getPool(engine, dbName);
      if (engine === 'mysql') {
        const [result] = await (pool as mysql.Pool).query(sql, [username]);
        rows = result as Record<string, unknown>[];
      } else {
        const result = await (pool as PgPool).query(sql, [username]);
        rows = result.rows;
      }
    } catch (err: any) {
      console.error('[auth] DB error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const storedHash = user[auth.passwordField] as string;

    const valid = await verifyPassword(password, storedHash, auth.hashAlgorithm);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[auth] JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    // Strip the password field before embedding in JWT / returning
    const userPayload = { ...user };
    delete userPayload[auth.passwordField];

    const token = jwt.sign(
      { sub: user[auth.table + '_id'] ?? user['id'] ?? username, ...userPayload },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' } as jwt.SignOptions,
    );

    return res.json({ token, user: userPayload });
  };
}
