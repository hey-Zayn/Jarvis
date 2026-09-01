import { prisma as defaultPrisma } from '../lib/prisma.js';
import { comparePassword, generateAccessToken, generateRefreshToken, getTokenExpiry, hashPassword, hashToken, verifyToken } from '../utils/auth.utils.js';

const ACCESS_TOKEN_SECONDS = 15 * 60;
const errorStatus = (message, code = 'AUTH_ERROR') => ({ ok: false, message, error: { code, message } });
const okStatus = (message) => ({ ok: true, message });

function normalizeEmail(email) { return String(email || '').trim().toLowerCase(); }
function validateCredentials(email, password) {
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'A valid email is required';
    if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters';
    return null;
}
function normalizeVoicePreference(value) { return value === 'male' ? 'male' : 'female'; }
function profileResponse(user) {
    return { userId: user.id, email: user.email, displayName: user.displayName || '', voicePreference: normalizeVoicePreference(user.voicePreference), createdAtEpochMillis: String(user.createdAt.getTime()), updatedAtEpochMillis: String(user.updatedAt.getTime()) };
}
function sessionResponse(user, tokens) {
    return { userId: user.id, email: user.email, displayName: user.displayName || '', voicePreference: normalizeVoicePreference(user.voicePreference), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresInSeconds: ACCESS_TOKEN_SECONDS };
}

export function createAuthService({ prisma = defaultPrisma } = {}) {
    async function authenticatedUser(accessToken) {
        const token = verifyToken(accessToken, 'access');
        const user = await prisma.user.findUnique({ where: { id: token.sub } });
        if (!user) throw new Error('Token user no longer exists');
        return { user, token };
    }
    async function issueSession(user) {
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        await prisma.session.create({ data: { userId: user.id, refreshTokenHash: hashToken(refreshToken), expiresAt: getTokenExpiry(refreshToken) } });
        return { accessToken, refreshToken };
    }

    return {
        async register({ email, password, displayName, voicePreference }) {
            const normalizedEmail = normalizeEmail(email);
            const validationError = validateCredentials(normalizedEmail, password);
            if (validationError) return { status: errorStatus(validationError, 'VALIDATION_ERROR') };
            if (await prisma.user.findUnique({ where: { email: normalizedEmail } })) return { status: errorStatus('An account with this email already exists', 'EMAIL_TAKEN') };
            const user = await prisma.user.create({ data: { email: normalizedEmail, displayName: String(displayName || '').trim() || null, voicePreference: normalizeVoicePreference(voicePreference), passwordHash: await hashPassword(password) } });
            return { status: okStatus('Registration successful'), session: sessionResponse(user, await issueSession(user)) };
        },
        async login({ email, password }) {
            const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
            if (!user || !(await comparePassword(password || '', user.passwordHash))) return { status: errorStatus('Invalid email or password', 'INVALID_CREDENTIALS') };
            return { status: okStatus('Login successful'), session: sessionResponse(user, await issueSession(user)) };
        },
        async verifyToken({ accessToken }) {
            try {
                const { user, token } = await authenticatedUser(accessToken);
                return { status: okStatus('Token is valid'), tokenStatus: 'TOKEN_STATUS_VALID', userId: user.id, email: user.email, expiresAtEpochSeconds: token.exp || 0 };
            } catch { return { status: errorStatus('Token is invalid or expired', 'INVALID_TOKEN'), tokenStatus: 'TOKEN_STATUS_INVALID' }; }
        },
        async refreshToken({ refreshToken }) {
            try {
                const token = verifyToken(refreshToken, 'refresh');
                const session = await prisma.session.findFirst({ where: { userId: token.sub, refreshTokenHash: hashToken(refreshToken), revokedAt: null, expiresAt: { gt: new Date() } }, include: { user: true } });
                if (!session) return { status: errorStatus('Refresh token is invalid', 'INVALID_TOKEN') };
                await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
                return { status: okStatus('Token refreshed'), session: sessionResponse(session.user, await issueSession(session.user)) };
            } catch { return { status: errorStatus('Refresh token is invalid or expired', 'INVALID_TOKEN') }; }
        },
        async getAuthenticatedUser(accessToken) {
            try { return (await authenticatedUser(accessToken)).user; } catch { return null; }
        },
        async getProfile({ accessToken, userId }) {
            try {
                const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : (await authenticatedUser(accessToken)).user;
                if (!user) return { status: errorStatus('Profile not found', 'NOT_FOUND') };
                return { status: okStatus('Profile retrieved'), profile: profileResponse(user) };
            } catch { return { status: errorStatus('Authentication is required', 'UNAUTHENTICATED') }; }
        },
        async updateProfile({ accessToken, userId, displayName, voicePreference }) {
            if (typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 100) return { status: errorStatus('displayName must be between 1 and 100 characters', 'VALIDATION_ERROR') };
            try {
                const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : (await authenticatedUser(accessToken)).user;
                if (!user) return { status: errorStatus('Profile not found', 'NOT_FOUND') };
                const updatedUser = await prisma.user.update({ where: { id: user.id }, data: { displayName: displayName.trim(), voicePreference: normalizeVoicePreference(voicePreference || user.voicePreference) } });
                return { status: okStatus('Profile updated'), profile: profileResponse(updatedUser) };
            } catch { return { status: errorStatus('Authentication is required', 'UNAUTHENTICATED') }; }
        }
    };
}
