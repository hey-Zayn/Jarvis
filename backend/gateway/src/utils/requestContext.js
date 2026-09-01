export function createRequestContext(req) {
    return {
        requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
        userId: req.user?.userId || req.headers['x-user-id'] || '',
        source: req.headers['x-client-source'] || 'gateway',
        requestedAt: { seconds: Math.floor(Date.now() / 1000), nanos: 0 }
    };
}
