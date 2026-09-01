import { createRequestContext } from '../utils/requestContext.js';
import { unary } from '../grpc/unary.js';
import { createLatencyLogger } from '../utils/logger.js';

const latencyLogger = createLatencyLogger('gateway');

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

        async listConversations(req, res, next) {
            try {
                const response = await unary(agentClient, 'ListConversations', { context: createRequestContext(req), limit: Number(req.query.limit || 50) });
                res.json(response);
            } catch (error) { next(error); }
        },

        async getConversationMessages(req, res, next) {
            try {
                const response = await unary(agentClient, 'GetConversationMessages', { context: createRequestContext(req), conversationId: req.params.conversationId });
                res.json(response);
            } catch (error) { next(error); }
        },

        sendVoiceCommand(req, res, next) {
            // Record when request was received
            const requestReceivedTime = Date.now();
            let firstChunkTime = null;
            let chunkCount = 0;
            
            latencyLogger.log('voice_command_request_received', {
                requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
                conversationId: req.body.conversationId || '',
                hasTranscript: !!req.body.transcript
            });

            try {
                const call = agentClient.SendVoiceCommand({
                    context: createRequestContext(req),
                    conversationId: req.body.conversationId || '',
                    transcript: req.body.transcript || '',
                    browserContext: req.body.browserContext || {}
                });

                // Record when gRPC request was sent to agent-service
                const grpcRequestSentTime = Date.now();
                latencyLogger.log('grpc_request_sent_to_agent_service', {
                    requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
                    conversationId: req.body.conversationId || '',
                    latency: grpcRequestSentTime - requestReceivedTime
                });

                res.setHeader('Content-Type', 'application/x-ndjson');

                call.on('data', (chunk) => {
                    // Record first chunk time
                    if (firstChunkTime === null) {
                        firstChunkTime = Date.now();
                        latencyLogger.log('voice_command_first_chunk_received', {
                            requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
                            conversationId: req.body.conversationId || '',
                            latency: firstChunkTime - requestReceivedTime
                        });
                    }
                    
                    chunkCount++;
                    res.write(`${JSON.stringify(chunk)}\n`);
                });

                call.on('end', () => {
                    // Record when response stream ends
                    const responseEndTime = Date.now();
                    latencyLogger.log('voice_command_response_completed', {
                        requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
                        conversationId: req.body.conversationId || '',
                        latency: responseEndTime - requestReceivedTime,
                        totalChunks: chunkCount,
                        timeToFirstChunk: firstChunkTime ? firstChunkTime - requestReceivedTime : null
                    });
                    res.end();
                });

                call.on('error', (error) => {
                    // Record error
                    latencyLogger.log('voice_command_error', {
                        requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
                        conversationId: req.body.conversationId || '',
                        error: error.message,
                        latency: Date.now() - requestReceivedTime
                    });
                    next(error);
                });
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
        ,
        async listMemories(req, res, next) {
            try { res.json(await unary(agentClient, 'ListMemories', { context: createRequestContext(req), category: req.query.category || 'all', limit: Number(req.query.limit || 100) })); }
            catch (error) { next(error); }
        },
        async deleteMemory(req, res, next) {
            try { res.json(await unary(agentClient, 'DeleteMemory', { context: createRequestContext(req), memoryId: req.params.memoryId })); }
            catch (error) { next(error); }
        }
    };
}
