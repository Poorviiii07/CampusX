import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { logAction } from '../services/audit';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'FACULTY', 'STUDENT', 'GUEST']).optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  const { email, password, name, role, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    sendError(res, 'Email already registered', 409);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name, role: role as any ?? 'STUDENT', phone },
    select: { id: true, email: true, name: true, role: true },
  });

  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ id: user.id, email: user.email, role: user.role });

  sendSuccess(res, { user, accessToken, refreshToken }, 'Registered successfully', 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    sendError(res, 'Invalid credentials', 401);
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    sendError(res, 'Invalid credentials', 401);
    return;
  }

  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ id: user.id, email: user.email, role: user.role });

  await logAction(user.id, 'LOGIN', 'User', user.id, undefined, req.ip);

  sendSuccess(res, {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken,
    refreshToken,
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    sendError(res, 'Refresh token required', 400);
    return;
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) {
      sendError(res, 'User not found or inactive', 401);
      return;
    }
    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    sendSuccess(res, { accessToken });
  } catch {
    sendError(res, 'Invalid refresh token', 401);
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, null, 'Logged out successfully');
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, createdAt: true },
  });
  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }
  sendSuccess(res, user);
}
