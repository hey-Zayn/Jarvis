import { createWorkerJobService } from '../services/workerJobService.js';

export function createWorkerJobController() {
    const workerJobService = createWorkerJobService();

    return {
        async EnqueueActionLog(call, callback) {
            try {
                const req = call.request;
                const response = await workerJobService.enqueueActionLog({
                    idempotencyKey: req.idempotency_key || req.idempotencyKey,
                    actionType: req.action_type || req.actionType,
                    conversationId: req.conversation_id || req.conversationId,
                    payloadJson: req.payload_json || req.payloadJson
                });
                callback(null, {
                    status: response.status,
                    job_id: response.jobId
                });
            } catch (err) {
                callback(null, {
                    status: { ok: false, message: err.message },
                    job_id: ''
                });
            }
        },

        async EnqueueConversationPersist(call, callback) {
            try {
                const req = call.request;
                const response = await workerJobService.enqueueConversationPersist({
                    idempotencyKey: req.idempotency_key || req.idempotencyKey,
                    conversationId: req.conversation_id || req.conversationId,
                    turnId: req.turn_id || req.turnId,
                    payloadJson: req.payload_json || req.payloadJson
                });
                callback(null, {
                    status: response.status,
                    job_id: response.jobId
                });
            } catch (err) {
                callback(null, {
                    status: { ok: false, message: err.message },
                    job_id: ''
                });
            }
        }
    };
}