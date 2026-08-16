import { createRequestContext } from '../utils/requestContext.js';
import { unary } from '../grpc/unary.js';

export function createAgentController({ agentClient }) {
    return {
        async startConversation(req, res, next) {
            try {
                const response = await unary(agentClient, 'StartConversation', {
                    context: createRequestContext(req),
                    title: req.body.title || '',
                    metadata: req.body.metadata || {}
                });
                res.json(response);
            } catch (error) {
                next(error);
            }
        },

        async sendVoiceCommand(req, res, next) {
            try {
                const response = await unary(agentClient, 'SendVoiceCommand', {
                    context: createRequestContext(req),
                    conversationId: req.body.conversationId || '',
                    transcript: req.body.transcript || '',
                    browserContext: req.body.browserContext || {}
                });
                res.json(response);
            } catch (error) {
                next(error);
            }
        },

        streamAgentResponse(req, res, next) {
            const call = agentClient.StreamAgentResponse({
                context: createRequestContext(req),
                conversationId: req.params.conversationId || req.query.conversationId || '',
                turnId: req.params.turnId || req.query.turnId || ''
            });

            res.setHeader('Content-Type', 'application/x-ndjson');

            call.on('data', (chunk) => {
                res.write(`${JSON.stringify(chunk)}\n`);
            });

            call.on('end', () => {
                res.end();
            });

            call.on('error', next);
        },

        async saveMemory(req, res, next) {
            try {
                const response = await unary(agentClient, 'SaveMemory', {
                    context: createRequestContext(req),
                    content: req.body.content || '',
                    metadata: req.body.metadata || {}
                });
                res.json(response);
            } catch (error) {
                next(error);
            }
        },

        async searchMemory(req, res, next) {
            try {
                const response = await unary(agentClient, 'SearchMemory', {
                    context: createRequestContext(req),
                    query: req.body.query || req.query.query || '',
                    limit: Number(req.body.limit || req.query.limit || 5)
                });
                res.json(response);
            } catch (error) {
                next(error);
            }
        }
    };
}