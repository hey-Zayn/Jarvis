export function requireAuth(authService) {
    return async (req, res, next) => {
        const header = req.headers.authorization || '';
        const accessToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
        if (!accessToken) return res.status(401).json({ status: { ok: false, message: 'Bearer access token is required', error: { code: 'UNAUTHENTICATED', message: 'Bearer access token is required' } } });

        try {
            const user = await authService.getAuthenticatedUser(accessToken);
            if (!user) return res.status(401).json({ status: { ok: false, message: 'Access token is invalid or expired', error: { code: 'UNAUTHENTICATED', message: 'Access token is invalid or expired' } } });
            req.auth = { accessToken, user };
            next();
        } catch (error) {
            next(error);
        }
    };
}