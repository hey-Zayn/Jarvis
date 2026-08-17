'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

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
    // TODO: Send to agent service
    await new Promise(resolve => setTimeout(resolve, 1000));
    setTranscript('');
    setIsProcessing(false);
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