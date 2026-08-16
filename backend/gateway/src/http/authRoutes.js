import { Router } from 'express';

export function createAuthRoutes(authController) {
    const router = Router();
    router.post('/register', authController.register);
    router.post('/login', authController.login);
    router.post('/verify-token', authController.verifyToken);
    router.post('/refresh-token', authController.refreshToken);
    router.get('/profile', authController.getProfile);
    router.patch('/profile', authController.updateProfile);
    return router;
}