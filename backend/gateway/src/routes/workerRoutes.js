import { Router } from 'express';

export function createWorkerRoutes(controller, rateLimiter) {
    const router = Router();

    router.post('/action-log', rateLimiter, controller.enqueueActionLog);
    router.post('/conversation-persist', rateLimiter, controller.enqueueConversationPersist);

    return router;
}