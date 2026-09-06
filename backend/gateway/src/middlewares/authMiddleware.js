import { unary } from '../grpc/unary.js';
import { createRequestContext } from '../utils/requestContext.js';
import { createLatencyLogger } from '../utils/logger.js';

const latencyLogger = createLatencyLogger('gateway-auth');

function extractToken(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    return req.body?.accessToken || '';
}

export function createAuthMiddleware({ authClient }) {
    return async function authMiddleware(req, res, next) {
        const token = extractToken(req);
        let jwtValidationStartTime = Date.now();

        if (!token) {
            return res.status(401).json({
                status: {
                    ok: false,
                    message: 'Authentication required',
                    error: { code: 'UNAUTHENTICATED', message: 'Missing access token' }
                }
            });
        }

        try {
            // Record when JWT validation starts
            const response = await unary(authClient, 'VerifyToken', {
                context: createRequestContext(req),
                accessToken: token
            });

            // Record when JWT validation completes
            const jwtValidationEndTime = Date.now();
            latencyLogger.log('jwt_validation_completed', {
                requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
                userId: response.userId,
                latency: jwtValidationEndTime - jwtValidationStartTime
            });

            if (!response.status?.ok || response.tokenStatus !== 'TOKEN_STATUS_VALID') {
                return res.status(401).json({
                    status: {
                        ok: false,
                        message: response.status?.message || 'Invalid or expired token',
                        error: { code: 'INVALID_TOKEN', message: response.status?.message || 'Token validation failed' }
                    }
                });
            }

            req.user = {
                userId: response.userId,
                email: response.email,
                expiresAt: response.expiresAtEpochSeconds
            };

            next();
        } catch (error) {
            // Record error in JWT validation
            const jwtValidationErrorTime = Date.now();
            latencyLogger.log('jwt_validation_error', {
                requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
                error: error.message,
                latency: jwtValidationErrorTime - (jwtValidationStartTime || Date.now())
            });
            
            console.error('[Auth Middleware] Verification error:', error.message);
            return res.status(500).json({
                status: {
                    ok: false,
                    message: 'Authentication service unavailable',
                    error: { code: 'AUTH_SERVICE_ERROR', message: error.message }
                }
            });
        }
    };
}

export function optionalAuthMiddleware({ authClient }) {
    return async function optionalAuthMiddleware(req, res, next) {
        const token = extractToken(req);

        if (!token) {
            return next();
        }

        try {
            const response = await unary(authClient, 'VerifyToken', {
                context: createRequestContext(req),
                accessToken: token
            });

            if (response.status?.ok && response.tokenStatus === 'TOKEN_STATUS_VALID') {
                req.user = {
                    userId: response.userId,
                    email: response.email,
                    expiresAt: response.expiresAtEpochSeconds
                };
            }
        } catch (error) {
            console.warn('[Optional Auth] Verification failed, continuing unauthenticated:', error.message);
        }

        next();
    };
}
