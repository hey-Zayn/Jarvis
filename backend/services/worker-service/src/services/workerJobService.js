const okStatus = (message) => ({ ok: true, message });

export function createWorkerJobService() {
    return {
        enqueueActionLog({ idempotencyKey }) {
            return {
                status: okStatus('EnqueueActionLog contract is wired'),
                jobId: idempotencyKey || `phase1-action-log-${Date.now()}`
            };
        },

        enqueueConversationPersist({ idempotencyKey }) {
            return {
                status: okStatus('EnqueueConversationPersist contract is wired'),
                jobId: idempotencyKey || `phase1-conversation-persist-${Date.now()}`
            };
        }
    };
}