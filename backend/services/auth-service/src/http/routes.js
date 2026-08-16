import { Router } from 'express';
import { createHttpAuthController } from '../controllers/authController.js';
import { createProfileController } from '../controllers/profileController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

export function createHttpApp({ serviceName, authService }) {
    const router = Router();
    const authController = createHttpAuthController({ authService });
    const profileController = createProfileController({ authService });
    const authRequired = requireAuth(authService);

    router.get('/', (req, res) => res.json({ message: `${serviceName} is running` }));
    router.get('/health', (req, res) => res.json({ status: 'ok', service: serviceName }));
    router.post('/register', authController.register);
    router.post('/login', authController.login);
    router.post('/verify-token', authController.verifyToken);
    router.post('/refresh-token', authController.refreshToken);
    router.get('/profile', authRequired, profileController.getProfile);
    router.patch('/profile', authRequired, profileController.updateProfile);

    return { register(app) { app.use(router); } };
}