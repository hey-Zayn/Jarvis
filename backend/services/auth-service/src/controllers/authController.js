import { createAuthService } from '../services/authService.js';

export function createAuthController({ authService = createAuthService() } = {}) {
    const callRpc = (method) => async (call, callback) => {
        try { callback(null, await authService[method](call.request)); }
        catch (error) { callback(null, { status: { ok: false, message: 'Authentication service unavailable', error: { code: 'INTERNAL', message: error.message } } }); }
    };
    return { Register: callRpc('register'), Login: callRpc('login'), VerifyToken: callRpc('verifyToken'), RefreshToken: callRpc('refreshToken'), GetProfile: callRpc('getProfile'), UpdateProfile: callRpc('updateProfile'), UpdateLocation: callRpc('updateLocation') };
}

export function createHttpAuthController({ authService = createAuthService() } = {}) {
    const respond = (method) => async (req, res, next) => {
        try {
            const result = await authService[method](req.body || {});
            res.status(result.status?.ok ? 200 : 401).json(result);
        } catch (error) { next(error); }
    };
    return { register: respond('register'), login: respond('login'), verifyToken: respond('verifyToken'), refreshToken: respond('refreshToken') };
}