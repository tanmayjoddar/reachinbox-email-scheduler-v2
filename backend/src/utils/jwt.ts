import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

interface TokenPayload {
  userId: string;
}

export const signToken = (userId: string, expiresIn: SignOptions['expiresIn'] = '7d') =>
  jwt.sign({ userId } satisfies TokenPayload, env.JWT_SECRET, { expiresIn });

export const verifyToken = (token: string) => jwt.verify(token, env.JWT_SECRET) as TokenPayload;
