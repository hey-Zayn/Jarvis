import { Router } from 'express';

export function createAgentRoutes(controller, rateLimiter) {
    const router = Router();

    router.post('/conversations', rateLimiter, controller.startConversation);
    router.post('/voice-command', rateLimiter, controller.sendVoiceCommand);
    router.post('/voice/stream', rateLimiter, controller.sendVoiceCommand); // Streaming - now handled natively by sendVoiceCommand
    router.get('/responses/:conversationId/:turnId', rateLimiter, controller.streamAgentResponse);
    router.post('/memory', rateLimiter, controller.saveMemory);
    router.get('/memory/search', rateLimiter, controller.searchMemory);
    router.post('/memory/search', rateLimiter, controller.searchMemory);

    return router;
}