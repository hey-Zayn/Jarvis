import { unary } from '../grpc/unary.js';
import { createRequestContext } from '../utils/requestContext.js';

export function createWorkerController({ workerClient }) {
    return {
        async enqueueActionLog(req, res, next) {
            try {
                const response = await unary(workerClient, 'EnqueueActionLog', {
                    context: createRequestContext(req),
                    idempotencyKey: req.body.idempotencyKey || '',
                    actionType: req.body.actionType || '',
                    conversationId: req.body.conversationId || '',
                    payloadJson: JSON.stringify({ ...(req.body.payload || {}), userId: req.user.userId })
                });
                res.json(response);
            } catch (error) {
                next(error);
            }
        },

        async enqueueConversationPersist(req, res, next) {
            try {
                const response = await unary(workerClient, 'EnqueueConversationPersist', {
                    context: createRequestContext(req),
                    idempotencyKey: req.body.idempotencyKey || '',
                    conversationId: req.body.conversationId || '',
                    turnId: req.body.turnId || '',
                    payloadJson: JSON.stringify({ ...(req.body.payload || {}), userId: req.user.userId })
                });
                res.json(response);
            } catch (error) {
                next(error);
            }
        }
    };
}
