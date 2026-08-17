const okStatus = (message) => ({ ok: true, message });

export async function createAgentService() {
    return {
        startConversation({ title }) {
            return {
                status: okStatus('StartConversation contract is wired'),
                conversationId: `phase1-conversation-${Date.now()}`
            };
        },

        async sendVoiceCommand({ conversationId, transcript }) {
            // Phase 3.3: Use LLM to generate response based on transcript
            let responseText;

            try {
                // Import Groq dynamically to avoid issues if not installed
                const { Groq } = await import('groq-sdk');
                const groq = new Groq({
                    apiKey: process.env.GROQ_API_KEY // Fallback for dev
                });

                // Call Groq API to generate response
                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are Jarvis, a helpful AI assistant. Provide concise, helpful responses to user queries."
                        },
                        {
                            role: "user",
                            content: transcript
                        }
                    ],
                    model: "llama3-8b-8192", // Fast Groq model
                    temperature: 0.7,
                    max_tokens: 150,
                    stream: false, // We'll handle streaming ourselves by chunking the response
                });

                responseText = chatCompletion.choices[0].message.content;
            } catch (error) {
                console.error('Error calling LLM API:', error);
                // Fallback to echo response if LLM fails
                responseText = transcript
                    ? `I heard you say: "${transcript}". This is a streaming response from Jarvis (fallback).`
                    : 'I received a voice command. This is a streaming response from Jarvis (fallback).';
            }

            // Split response into chunks for streaming
            const chunkSize = 15; // Characters per chunk
            const chunks = [];
            for (let i = 0; i < responseText.length; i += chunkSize) {
                chunks.push(responseText.substring(i, i + chunkSize));
            }




            // Return an iterable of chunks with proto-correct field names
            return chunks.map((chunk, index) => ({
                status: okStatus('Streaming voice command response'),
                conversation_id: conversationId || `phase2-conversation-${Date.now()}`,
                turn_id: `phase2-turn-${Date.now()}-${index}`,
                chunk,
                is_final: index === chunks.length - 1
            }));
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