import { Router } from 'express';

export function createAuthRoutes(controller, rateLimiter, strictRateLimiter) {
    const router = Router();

    // Strict rate limiting for auth mutation endpoints
    router.post('/register', strictRateLimiter, controller.register);
    router.post('/login', strictRateLimiter, controller.login);
    router.post('/refresh-token', strictRateLimiter, controller.refreshToken);

    // Standard rate limiting for read/verify endpoints
    router.post('/verify-token', rateLimiter, controller.verifyToken);
    router.get('/profile', rateLimiter, controller.getProfile);
    router.patch('/profile', rateLimiter, controller.updateProfile);
    router.patch('/location', rateLimiter, controller.updateLocation);

    return router;
}