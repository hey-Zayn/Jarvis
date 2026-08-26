import { createAgentService } from '../services/agentService.js';

export function createAgentController() {
    const agentService = createAgentService();

    return {
        StartConversation(call, callback) {
            try {
                const res = agentService.startConversation(call.request);
                callback(null, res);
            } catch (err) {
                console.error('[AgentController] StartConversation error:', err);
                callback(err);
            }
        },

        async SendVoiceCommand(call) {
            try {
                for await (const chunk of agentService.sendVoiceCommand(call.request)) {
                    call.write(chunk);
                }
                call.end();
            } catch (err) {
                console.error('[AgentController] SendVoiceCommand error:', err);
                call.emit('error', err);
            }
        },

        StreamAgentResponse(call) {
            try {
                for (const chunk of agentService.streamAgentResponse(call.request)) {
                    call.write(chunk);
                }
                call.end();
            } catch (err) {
                console.error('[AgentController] StreamAgentResponse error:', err);
                call.emit('error', err);
            }
        },

        async SaveMemory(call, callback) {
            try {
                const res = await agentService.saveMemory(call.request);
                callback(null, res);
            } catch (err) {
                console.error('[AgentController] SaveMemory error:', err);
                callback(err);
            }
        },

        async SearchMemory(call, callback) {
            try {
                const res = await agentService.searchMemory(call.request);
                callback(null, res);
            } catch (err) {
                console.error('[AgentController] SearchMemory error:', err);
                callback(err);
            }
        }
    };
}