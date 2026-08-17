'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { apiClient } from '@/lib/api';

export function VoiceWorkspace() {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVoiceToggle = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // TODO: Start speech recognition
      setTranscript('Listening...');
    } else {
      // TODO: Stop speech recognition
      setTranscript('Voice input stopped');
    }
  };

  const handleSend = async () => {
    if (!transcript.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Generate a conversation ID if we don't have one yet
      // In a real app, this would come from auth or conversation state
      const conversationId = `conv-${Date.now()}`;
      
      // Call the streaming voice command endpoint
      const stream = await apiClient.sendVoiceCommandStream({
        conversationId,
        transcript,
        browserContext: {
          url: window.location.href,
          title: document.title,
          selectedText: window.getSelection()?.toString() || '',
          pageText: document.body.innerText.substring(0, 1000) // Limit page text
        }
      });

      // Reset transcript for new response
      setTranscript('');
      
      // Process the streaming response
      const reader = stream.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines (NDJSON format)
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const chunk = JSON.parse(line);
                // Update transcript with the chunk content
                setTranscript(prev => prev + chunk.chunk);
                
                // If this is the final chunk, we could reset processing state here
                // but we'll keep it until the stream closes to show we're still processing
                if (chunk.is_final) {
                  // Optional: add a small delay before resetting to show completion
                  await new Promise(resolve => setTimeout(resolve, 300));
                }
              } catch (e) {
                console.error('Failed to parse JSON chunk:', line, e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error sending voice command:', error);
      setTranscript(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col items-center justify-center text-center p-8"
      >
        <Card className="w-full max-w-2xl glass-elevated">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Voice Assistant</CardTitle>
            <CardDescription>
              Press the microphone to start a conversation with Jarvis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Visualizer Placeholder */}
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleVoiceToggle}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${
                  isListening
                    ? 'bg-violet-600 shadow-[0_0_30px_rgba(139,92,246,0.4)]'
                    : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
                }`}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? (
                  <MicOff className="h-10 w-10 text-white" />
                ) : (
                  <Mic className="h-10 w-10 text-zinc-100" />
                )}
                {isListening && (
                  <motion.span
                    animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2 border-violet-500/50"
                  />
                )}
              </motion.button>
              <Button
                variant={isMuted ? 'secondary' : 'default'}
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="h-12 w-12"
              >
                {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </Button>
            </div>

            {/* Transcript Display */}
            <div className="min-h-[80px] p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 text-left">
              <p className={isListening ? 'text-violet-300' : 'text-zinc-400'}>
                {transcript || 'Voice transcript will appear here...'}
              </p>
            </div>

            {/* Text Input Fallback */}
            <div className="flex gap-2">
              <input
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Or type your message..."
                className="flex-1 h-10 rounded-md border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200"
                disabled={isProcessing}
              />
              <Button
                size="lg"
                onClick={handleSend}
                disabled={!transcript.trim() || isProcessing}
                className="h-10"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}