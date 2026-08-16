const okStatus = (message) => ({ ok: true, message });

export function createAgentService() {
    return {
        startConversation({ title }) {
            return {
                status: okStatus('StartConversation contract is wired'),
                conversationId: `phase1-conversation-${Date.now()}`
            };
        },

        sendVoiceCommand({ conversationId, transcript }) {
            return {
                status: okStatus('SendVoiceCommand contract is wired'),
                turnId: `phase1-turn-${Date.now()}`,
                responsePreview: transcript ? `Received: ${transcript}` : 'Voice command contract received'
            };
        },

        streamAgentResponse({ conversationId, turnId }) {
            return [
                { status: okStatus('StreamAgentResponse contract is wired'), conversationId, turnId, chunk: 'Phase 1 ', isFinal: false },
                { status: okStatus('StreamAgentResponse contract is wired'), conversationId, turnId, chunk: 'streaming stub complete.', isFinal: true }
            ];
        },

        saveMemory() {
            return {
                status: okStatus('SaveMemory contract is wired'),
                memoryId: `phase1-memory-${Date.now()}`
            };
        },

        searchMemory({ query }) {
            return {
                status: okStatus('SearchMemory contract is wired'),
                results: query ? [{ memoryId: 'phase1-memory', content: `Stub result for ${query}`, score: 1, metadata: {} }] : []
            };
        }
    };
}