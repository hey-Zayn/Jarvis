export function errorHandler(error, req, res, next) {
    console.error('[Gateway] request failed', error);

    res.status(502).json({
        status: {
            ok: false,
            message: 'Upstream gRPC call failed',
            error: {
                code: String(error.code || 'UNKNOWN'),
                message: error.message || 'Unknown gRPC error',
                details: {}
            }
        }
    });
}