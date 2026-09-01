'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Send, Loader2, Zap, RotateCcw, Volume2, VolumeX, Square, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '@/lib/api';

interface MessageTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const promptSuggestions = [
  'Open YouTube',
  'What is the current time in UTC?',
  'Search on YouTube for lofi beats',
  'Calculate 45 * 18 + 120'
];

function executeBrowserAction(transcript: string): { message: string; url?: string } | null {
  const t = transcript.toLowerCase().trim();

  // YouTube (handles "open youtube", "open youthub", "open utube", "play youtube")
  if (t.includes('youtube') || t.includes('youthub') || t.includes('utube')) {
    const searchMatch = t.match(/(?:search|play|find)\s+(?:on\s+youtube\s+for|youtube\s+for|for)?\s*(.+)/i);
    if (searchMatch && searchMatch[1] && !t.startsWith('open')) {
      const query = encodeURIComponent(searchMatch[1].replace(/on youtube/i, '').trim());
      const url = `https://www.youtube.com/results?search_query=${query}`;
      if (typeof window !== 'undefined') window.open(url, '_blank');
      return { message: `Searching YouTube for "${searchMatch[1].trim()}".`, url };
    }
    const url = 'https://www.youtube.com';
    if (typeof window !== 'undefined') window.open(url, '_blank');
    return { message: 'Opening YouTube in a new tab.', url };
  }

  // Google
  if (t.includes('open google') || t === 'google') {
    const url = 'https://www.google.com';
    if (typeof window !== 'undefined') window.open(url, '_blank');
    return { message: 'Opening Google in a new tab.', url };
  }

  // New Tab
  if (t.includes('open new tab') || t.includes('new tab') || t.includes('open tab') || t === 'tab') {
    const url = 'https://www.google.com';
    if (typeof window !== 'undefined') window.open(url, '_blank');
    return { message: 'Opening a new tab.', url };
  }

  // GitHub
  if (t.includes('open github') || t === 'github') {
    const url = 'https://www.github.com';
    if (typeof window !== 'undefined') window.open(url, '_blank');
    return { message: 'Opening GitHub in a new tab.', url };
  }

  // Reddit
  if (t.includes('open reddit') || t === 'reddit') {
    const url = 'https://www.reddit.com';
    if (typeof window !== 'undefined') window.open(url, '_blank');
    return { message: 'Opening Reddit in a new tab.', url };
  }

  // Twitter / X
  if (t.includes('open twitter') || t.includes('open x') || t === 'twitter') {
    const url = 'https://www.x.com';
    if (typeof window !== 'undefined') window.open(url, '_blank');
    return { message: 'Opening X (Twitter) in a new tab.', url };
  }

  // Google Search
  const gMatch = t.match(/^(?:search|google|search for|search on google for)\s+(.+)/i);
  if (gMatch && gMatch[1]) {
    const query = encodeURIComponent(gMatch[1].trim());
    const url = `https://www.google.com/search?q=${query}`;
    if (typeof window !== 'undefined') window.open(url, '_blank');
    return { message: `Searching Google for "${gMatch[1].trim()}".`, url };
  }

  // Generic "open <site>" (e.g. "open wikipedia", "open amazon")
  const openMatch = t.match(/^open\s+([a-z0-9\-]+(?:\.[a-z]{2,})?)$/i);
  if (openMatch && openMatch[1]) {
    let domain = openMatch[1].trim();
    if (!domain.includes('.')) domain += '.com';
    const url = `https://${domain}`;
    if (typeof window !== 'undefined') window.open(url, '_blank');
    return { message: `Opening ${domain} in a new tab.`, url };
  }

  return null;
}

export function VoiceWorkspace() {
  const [searchParams] = useSearchParams();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [inputTranscript, setInputTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [messages, setMessages] = useState<MessageTurn[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: 'Jarvis online. Real-time voice loop, LangGraph multi-tool reasoning, and speech synthesis active. How can I assist you today?'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    const requestedConversationId = searchParams.get('conversationId');
    if (!requestedConversationId) return;
    conversationIdRef.current = requestedConversationId;
    apiClient.getConversationMessages(requestedConversationId).then((response) => {
      if (response.status?.ok && Array.isArray(response.messages)) {
        setMessages(response.messages.map((message: { messageId: string; role: 'user' | 'assistant'; content: string }) => ({
          id: message.messageId, role: message.role, content: message.content
        })));
      }
    }).catch((error) => console.error('[VoiceWorkspace] Failed to load conversation:', error));
  }, [searchParams]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Stop any active SpeechSynthesis utterance
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Speak assistant response using Web Speech Synthesis API
  const speakResponse = useCallback((text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    stopSpeaking();

    // Clean up markdown / code tags for natural speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_~#]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled, stopSpeaking]);

  // Initialize and tear down Speech Recognition
  useEffect(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const text = final || interim;
      if (text) {
        setInputTranscript(text);
      }

      if (final.trim()) {
        setIsListening(false);
        handleSend(final.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[VoiceWorkspace] Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const handleVoiceToggle = () => {
    stopSpeaking();

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          setInputTranscript('');
          recognitionRef.current.start();
          setIsListening(true);
        } catch (err) {
          console.error('[VoiceWorkspace] Failed to start speech recognition:', err);
          setIsListening(false);
        }
      } else {
        // Fallback for browsers without SpeechRecognition
        setInputTranscript('What is the current time and calculate 45 * 18?');
      }
    }
  };

  const handleCancelTurn = () => {
    stopSpeaking();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setIsListening(false);
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputTranscript).trim();
    if (!textToSend || isProcessing) return;

    stopSpeaking();
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }

    const userTurnId = `user-${Date.now()}`;
    const assistantTurnId = `asst-${Date.now()}`;

    // Check for browser action intent (e.g. "open youtube", "open new tab", "search on youtube for ...")
    const actionResult = executeBrowserAction(textToSend);
    if (actionResult) {
      setMessages((prev) => [
        ...prev,
        { id: userTurnId, role: 'user', content: textToSend },
        { id: assistantTurnId, role: 'assistant', content: actionResult.message, isStreaming: false }
      ]);
      setInputTranscript('');
      speakResponse(actionResult.message);
      return;
    }

    // Add user turn and initialize assistant stream slot
    setMessages((prev) => [
      ...prev,
      { id: userTurnId, role: 'user', content: textToSend },
      { id: assistantTurnId, role: 'assistant', content: '', isStreaming: true }
    ]);

    setInputTranscript('');
    setIsProcessing(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      if (!conversationIdRef.current) {
        const conversation = await apiClient.startConversation({ title: textToSend.slice(0, 80) });
        if (!conversation.status?.ok || !conversation.conversationId) throw new Error(conversation.status?.message || 'Could not create conversation');
        conversationIdRef.current = conversation.conversationId;
      }
      const conversationId = conversationIdRef.current;
      if (!conversationId) throw new Error('Conversation is not available');
      const stream = await apiClient.sendVoiceCommandStream({
        conversationId,
        transcript: textToSend,
        browserContext: {
          url: typeof window !== 'undefined' ? window.location.href : '',
          title: typeof document !== 'undefined' ? document.title : '',
          selectedText: typeof window !== 'undefined' ? window.getSelection()?.toString() || '' : '',
          pageText: typeof document !== 'undefined' ? document.body.innerText.substring(0, 800) : ''
        }
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedAssistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunkObj = JSON.parse(line);
              if (chunkObj.chunk) {
                accumulatedAssistantText += chunkObj.chunk;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantTurnId
                      ? { ...msg, content: accumulatedAssistantText, isStreaming: !chunkObj.is_final }
                      : msg
                  )
                );
              }
            } catch (err) {}
          }
        }
      }

      const finalText = accumulatedAssistantText || 'Jarvis processed your request.';

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantTurnId
            ? { ...msg, content: finalText, isStreaming: false }
            : msg
        )
      );

      // Audibly speak the final response (Phase 9 TTS)
      speakResponse(finalText);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error in voice command stream:', error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantTurnId
              ? { ...msg, content: `Error: ${error.message || 'Stream disconnected'}`, isStreaming: false }
              : msg
          )
        );
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-4 max-w-5xl mx-auto">
      {/* Top Bar / Status & Audio Controls */}
      <div className="flex items-center justify-between px-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-zinc-300">Live Voice Gateway</span>
          <span className="text-zinc-600">•</span>
          <span className="text-violet-400 font-mono">sub-200ms target</span>
          {isSpeaking && (
            <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Speaking Response...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* TTS Audio Mute/Unmute Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setTtsEnabled(!ttsEnabled);
            }}
            className={`h-7 text-xs gap-1.5 transition-colors ${
              ttsEnabled ? 'text-violet-400 hover:text-violet-300' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={ttsEnabled ? 'Voice output enabled' : 'Voice output muted'}
          >
            {ttsEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span>{ttsEnabled ? 'Audio On' : 'Muted'}</span>
          </Button>

          {/* Cancel/Stop Speaking */}
          {(isProcessing || isSpeaking) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelTurn}
              className="h-7 text-xs gap-1 text-rose-400 border-rose-900/50 hover:bg-rose-950/40 hover:text-rose-300"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Stop</span>
            </Button>
          )}

          {/* Reset Conversation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopSpeaking();
              setMessages([{ id: 'init', role: 'assistant', content: 'Ready for next command.' }]);
            }}
            className="h-7 text-xs gap-1 text-zinc-400 hover:text-zinc-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear</span>
          </Button>
        </div>
      </div>

      {/* Messages / Conversation Feed */}
      <Card className="flex-1 bg-zinc-900/40 border-zinc-800 overflow-hidden flex flex-col backdrop-blur-sm">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white shadow-[0_0_20px_rgba(25,118,210,0.25)] rounded-br-none'
                    : 'bg-zinc-950/90 text-zinc-200 border border-zinc-800 rounded-bl-none shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px] font-medium opacity-75">
                  <div className="flex items-center gap-1.5">
                    {msg.role === 'assistant' ? (
                      <>
                        <Zap className="h-3.5 w-3.5 text-violet-400" />
                        <span className="font-semibold text-violet-300">Jarvis AI</span>
                      </>
                    ) : (
                      <span>You</span>
                    )}
                  </div>
                  {msg.role === 'assistant' && msg.content && !msg.isStreaming && (
                    <button
                      onClick={() => speakResponse(msg.content)}
                      className="text-zinc-400 hover:text-violet-400 transition-colors p-0.5 rounded"
                      title="Replay speech audio"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <p className="whitespace-pre-wrap">{msg.content || (msg.isStreaming ? 'Reasoning and executing tools...' : '')}</p>

                {msg.isStreaming && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-violet-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Streaming response tokens...</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Live Audio Visualizer / Status Bar */}
        <AnimatePresence>
          {(isListening || isSpeaking) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 bg-violet-950/30 border-t border-violet-900/40 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[40, 80, 50, 100, 60, 90, 45].map((height, i) => (
                    <motion.span
                      key={i}
                      animate={{ height: [`${height * 0.2}px`, `${height * 0.4}px`, `${height * 0.2}px`] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                      className="w-1 bg-violet-400 rounded-full"
                    />
                  ))}
                </div>
                <span className="text-violet-200 font-medium">
                  {isListening ? 'Listening to speech input...' : 'Synthesizing voice playback...'}
                </span>
              </div>
              <span className="text-violet-400 font-mono text-[11px]">
                {isListening ? 'Web Speech STT Active' : 'SpeechSynthesis Active'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-zinc-950/60 border-t border-zinc-800/80 flex flex-wrap gap-2">
          {promptSuggestions.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              disabled={isProcessing}
              className="text-xs px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles className="h-3 w-3 text-violet-400" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Voice Control & Input Bar */}
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleVoiceToggle}
          className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
            isListening
              ? 'bg-violet-600 shadow-[0_0_25px_rgba(25,118,210,0.8)] text-white'
              : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300'
          }`}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
          title={speechSupported ? (isListening ? 'Stop listening' : 'Click to speak') : 'Speech recognition not supported in this browser'}
        >
          {isListening ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}

          {isListening && (
            <>
              <motion.span
                animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-violet-400/80"
              />
              <motion.span
                animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="absolute inset-0 rounded-full border border-violet-300/40"
              />
            </>
          )}
        </motion.button>

        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={inputTranscript}
            onChange={(e) => setInputTranscript(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
              isListening
                ? 'Listening to microphone... (Speak now)'
                : 'Type or click mic to speak to Jarvis...'
            }
            disabled={isProcessing}
            className="flex-1 h-12 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
          <Button
            size="lg"
            onClick={() => handleSend()}
            disabled={!inputTranscript.trim() || isProcessing}
            className="h-12 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-md shadow-violet-900/20"
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
