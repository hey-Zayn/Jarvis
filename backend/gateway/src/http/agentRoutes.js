import { Router } from 'express';

export function createAgentRoutes(agentController) {
    const router = Router();

    router.post('/conversations', agentController.startConversation);
    router.post('/voice-command', agentController.sendVoiceCommand);
    router.get('/responses/:conversationId/:turnId', agentController.streamAgentResponse);
    router.post('/memory', agentController.saveMemory);
    router.get('/memory/search', agentController.searchMemory);
    router.post('/memory/search', agentController.searchMemory);

    return router;
}