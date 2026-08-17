import { createAgentService } from '../services/agentService.js';

export function createAgentController() {
    const agentService = createAgentService();

    return {
        StartConversation(call, callback) {
            callback(null, agentService.startConversation(call.request));
        },

        SendVoiceCommand(call) {
            for (const chunk of agentService.sendVoiceCommand(call.request)) {
                call.write(chunk);
            }

            call.end();
        },

        StreamAgentResponse(call) {
            for (const chunk of agentService.streamAgentResponse(call.request)) {
                call.write(chunk);
            }

            call.end();
        },

        SaveMemory(call, callback) {
            callback(null, agentService.saveMemory(call.request));
        },

        SearchMemory(call, callback) {
            callback(null, agentService.searchMemory(call.request));
        }
    };
}