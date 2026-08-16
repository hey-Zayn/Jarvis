import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const PASSWORD_ROUNDS = 12;

function tokenSecret() {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be configured with at least 32 characters');
    }

    return process.env.JWT_SECRET;
}

export function hashPassword(password) {
    return bcrypt.hash(password, PASSWORD_ROUNDS);
}

export function comparePassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

export function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateAccessToken(user) {
    return jwt.sign({ sub: user.id, email: user.email, type: 'access' }, tokenSecret(), { expiresIn: '15m' });
}

export function generateRefreshToken(user) {
    return jwt.sign({ sub: user.id, type: 'refresh', jti: crypto.randomUUID() }, tokenSecret(), { expiresIn: '7d' });
}

export function verifyToken(token, expectedType = 'access') {
    const payload = jwt.verify(token, tokenSecret());
    if (payload.type !== expectedType || typeof payload.sub !== 'string') {
        throw new Error('Invalid token type');
    }

    return payload;
}

export function getTokenExpiry(token) {
    const payload = jwt.decode(token);
    return payload && typeof payload === 'object' && typeof payload.exp === 'number'
        ? new Date(payload.exp * 1000)
        : null;
}