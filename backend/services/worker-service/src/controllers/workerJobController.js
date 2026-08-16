import { createWorkerJobService } from '../services/workerJobService.js';

export function createWorkerJobController() {
    const workerJobService = createWorkerJobService();

    return {
        EnqueueActionLog(call, callback) {
            callback(null, workerJobService.enqueueActionLog(call.request));
        },

        EnqueueConversationPersist(call, callback) {
            callback(null, workerJobService.enqueueConversationPersist(call.request));
        }
    };
}