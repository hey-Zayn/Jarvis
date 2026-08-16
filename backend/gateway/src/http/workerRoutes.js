import { Router } from 'express';

export function createWorkerRoutes(workerController) {
    const router = Router();

    router.post('/action-log', workerController.enqueueActionLog);
    router.post('/conversation-persist', workerController.enqueueConversationPersist);

    return router;
}