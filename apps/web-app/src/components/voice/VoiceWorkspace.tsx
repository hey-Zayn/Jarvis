'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  Square,
  Sparkles,
  Keyboard,
  Radio,
  Globe,
  Activity,
  MapPin
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface MessageTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const promptSuggestions = [
  'JARVIS: Search hospital nearby me',
  'JARVIS: Search Wikipedia for artificial intelligence',
  'JARVIS: Click on the Sign up button',
  'JARVIS: Fill search with artificial intelligence',
  'JARVIS: Open YouTube in a new tab',
  'JARVIS: What is the current time and weather?',
  'JARVIS: Summarize the current active webpage'
];

// Lightweight audio chime synthesizer using Web Audio API
function playChime(type: 'wake' | 'success' | 'ready') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'wake') {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.12); // A5
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    // AudioContext autoplay guard
  }
}

export function VoiceWorkspace() {
  const voicePreference = useAuthStore((state) => state.user?.voicePreference || 'female');
  const [searchParams] = useSearchParams();

  // Mode toggles
  const [viewMode, setViewMode] = useState<'voice' | 'text'>('voice');
  const [wakeWordRequired, setWakeWordRequired] = useState(true);

  // Audio / Speech State
  const [isListening, setIsListening] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [inputTranscript, setInputTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [wakeDetected, setWakeDetected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude?: number; longitude?: number; label?: string } | null>(null);

  // Auto-request live location on mount to enable nearby searches
  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let locationLabel = '';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { signal: AbortSignal.timeout(3500) }
          );
          if (res.ok) {
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
            const country = data.address?.country_code?.toUpperCase() || '';
            locationLabel = [city, country].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(',');
          }
        } catch {
          locationLabel = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
        }

        const locData = { latitude, longitude, locationLabel };
        setUserLocation(locData);
        apiClient.updateLocation(locData).catch(() => {});
      },
      (err) => {
        console.info('[VoiceWorkspace] Location permission notice:', err.message);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  // Messages
  const [messages, setMessages] = useState<MessageTurn[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: 'Jarvis online. Always-listening voice loop active. Say "JARVIS" followed by your command (e.g., "JARVIS, click on sign up" or "JARVIS, open YouTube").'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedRef = useRef<string>('');
  const shouldListenRef = useRef<boolean>(true);

  // Load requested conversation if specified in URL
  useEffect(() => {
    const requestedConversationId = searchParams.get('conversationId');
    if (!requestedConversationId) return;
    conversationIdRef.current = requestedConversationId;
    apiClient
      .getConversationMessages(requestedConversationId)
      .then((response) => {
        if (response.status?.ok && Array.isArray(response.messages)) {
          setMessages(
            response.messages.map((message: { messageId: string; role: 'user' | 'assistant'; content: string }) => ({
              id: message.messageId,
              role: message.role,
              content: message.content
            }))
          );
        }
      })
      .catch((error) => console.error('[VoiceWorkspace] Failed to load conversation:', error));
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, viewMode]);

  // Stop active speech synthesis
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Speak assistant response using Web Speech Synthesis API
  const speakResponse = useCallback(
    (text: string) => {
      if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      stopSpeaking();

      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Code block omitted.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*_~#]/g, '')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = voicePreference === 'male' ? 0.98 : 1.05;
      utterance.pitch = voicePreference === 'male' ? 0.78 : 1.05;

      const voices = window.speechSynthesis.getVoices();
      const maleNames = /david|daniel|alex|mark|guy|male|man|james/i;
      const femaleNames = /samantha|karen|zira|susan|female|woman|aria|jenny/i;
      const preferredVoice =
        voices.find((v) => v.lang.startsWith('en') && (voicePreference === 'male' ? maleNames.test(v.name) : femaleNames.test(v.name))) ||
        voices.find((v) => v.lang.startsWith('en') && /natural|google|microsoft/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [ttsEnabled, voicePreference, stopSpeaking]
  );

  const handleCancelTurn = () => {
    stopSpeaking();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setLiveTranscript('');
  };

  // Main command dispatch: Streams response and delegates actions via Gateway -> Agent -> Extension
  const handleSend = async (queryText?: string) => {
    const rawText = (queryText || inputTranscript).trim();
    if (!rawText || isProcessing) return;

    // Check wake word requirement
    let commandToSend = rawText;
    const wakeWordPattern = /\b(?:hey\s+)?jarvis\b/i;

    if (wakeWordRequired && !queryText) {
      if (!wakeWordPattern.test(rawText)) {
        // User spoke without saying JARVIS
        setLiveTranscript(`Ignored: Say "JARVIS" first (e.g. "JARVIS, ${rawText}")`);
        setTimeout(() => setLiveTranscript(''), 3500);
        return;
      }
      // Extract command after wake word
      commandToSend = rawText.replace(/^.*?\b(?:hey\s+)?jarvis\b\s*[:,-]?\s*/i, '').trim();
      if (!commandToSend) {
        // User only said "JARVIS"
        setWakeDetected(true);
        playChime('wake');
        setLiveTranscript('JARVIS: Online. Listening for command...');
        setTimeout(() => setWakeDetected(false), 2000);
        return;
      }
    }

    stopSpeaking();
    setInputTranscript('');
    setLiveTranscript('');
    setWakeDetected(false);
    playChime('wake');

    const userTurnId = `user-${Date.now()}`;
    const assistantTurnId = `asst-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userTurnId, role: 'user', content: rawText },
      { id: assistantTurnId, role: 'assistant', content: '', isStreaming: true }
    ]);

    setIsProcessing(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      if (!conversationIdRef.current) {
        const conversation = await apiClient.startConversation({ title: commandToSend.slice(0, 80) });
        if (!conversation.status?.ok || !conversation.conversationId) {
          throw new Error(conversation.status?.message || 'Could not create conversation');
        }
        conversationIdRef.current = conversation.conversationId;
      }

      const conversationId = conversationIdRef.current;
      if (!conversationId) throw new Error('Conversation is not available');

      // Send command with active window context
      const stream = await apiClient.sendVoiceCommandStream({
        conversationId,
        transcript: commandToSend,
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

      const finalText = accumulatedAssistantText || 'Action executed successfully.';

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantTurnId
            ? { ...msg, content: finalText, isStreaming: false }
            : msg
        )
      );

      playChime('success');
      speakResponse(finalText);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error in voice command stream:', error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantTurnId
              ? { ...msg, content: `Error: ${error.message || 'Action failed'}`, isStreaming: false }
              : msg
          )
        );
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  // Process completed speech utterance after silence debounce
  const handleFinalSpeech = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    handleSend(trimmed);
  }, [wakeWordRequired, isProcessing]);

  // Initialize Continuous Speech Recognition with Silence Debounce
  useEffect(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    // Continuous mode prevents premature cut-offs
    recognition.continuous = true;
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

      const combined = (final + ' ' + interim).trim();
      if (combined) {
        // Universal STOP voice command check: works during listening, speaking, or processing
        if (/\b(?:stop|cancel|halt|quiet|shut\s*up)(?:\s+jarvis)?\b/i.test(combined)) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          accumulatedRef.current = '';
          setLiveTranscript('⏹ Command Cancelled');
          handleCancelTurn();
          setTimeout(() => setLiveTranscript(''), 2000);
          return;
        }

        accumulatedRef.current = combined;
        setLiveTranscript(combined);

        // Check if user spoke wake word
        if (/\b(?:hey\s+)?jarvis\b/i.test(combined)) {
          setWakeDetected(true);
        }

        // Reset silence debounce timer (1000ms pause indicates end of command)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (accumulatedRef.current.trim()) {
            const captured = accumulatedRef.current;
            accumulatedRef.current = '';
            handleFinalSpeech(captured);
          }
        }, 1100);
      }
    };

    recognition.onerror = (event: any) => {
      // Ignore routine network/no-speech errors in continuous mode
      if (event.error !== 'no-speech' && event.error !== 'network') {
        console.warn('[VoiceWorkspace] Speech recognition notice:', event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart in continuous listening mode if listening is active
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch (e) {}
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    // Start continuous listening by default (Voice-First)
    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.warn('[VoiceWorkspace] Auto-start speech recognition notice:', err);
    }

    return () => {
      shouldListenRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      stopSpeaking();
    };
  }, [handleFinalSpeech, stopSpeaking]);

  const toggleListening = () => {
    stopSpeaking();
    if (isListening) {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setLiveTranscript('');
    } else {
      shouldListenRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (err) {
          console.error('[VoiceWorkspace] Failed to start microphone:', err);
        }
      }
    }
  };

  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-3 max-w-5xl mx-auto px-2 sm:px-4">
      {/* ─── Top Control Bar: Apple & Linear Aesthetics ────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-zinc-950/80 border border-white/5 backdrop-blur-md text-xs text-zinc-400 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full transition-all duration-500 ${
                isListening ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span className="font-semibold text-zinc-200 tracking-wide">JARVIS OS</span>
          </div>

          <span className="text-zinc-700">/</span>

          <button
            onClick={() => setWakeWordRequired(!wakeWordRequired)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono transition-all border ${
              wakeWordRequired
                ? 'bg-violet-500/10 text-violet-300 border-violet-500/30'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
            title="Toggle mandatory 'JARVIS' wake word requirement"
          >
            <Radio className="h-3 w-3 text-violet-400" />
            <span>Wake Word: {wakeWordRequired ? '"JARVIS"' : 'Direct'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1 text-zinc-500 font-mono text-[11px]">
            <Globe className="h-3 w-3 text-zinc-400" />
            <span>Extension Bridge: Connected</span>
          </div>

          {userLocation && (
            <div className="hidden md:flex items-center gap-1 text-emerald-400 font-mono text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full" title={userLocation.label || 'Location Active'}>
              <MapPin className="h-3 w-3 text-emerald-400 flex-shrink-0" />
              <span className="truncate max-w-[130px]">{userLocation.label || `${userLocation.latitude?.toFixed(2)}, ${userLocation.longitude?.toFixed(2)}`}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Voice Radar vs Text Thread */}
          <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-0.5">
            <button
              onClick={() => setViewMode('voice')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'voice'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Voice</span>
            </button>
            <button
              onClick={() => setViewMode('text')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'text'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span>Thread</span>
            </button>
          </div>

          {/* Audio Mute/Unmute */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setTtsEnabled(!ttsEnabled);
            }}
            className={`h-7 px-2 text-xs gap-1.5 rounded-lg border border-transparent hover:border-zinc-800 transition-colors ${
              ttsEnabled ? 'text-violet-400 hover:text-violet-300' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={ttsEnabled ? 'Voice output enabled' : 'Voice output muted'}
          >
            {ttsEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </Button>

          {/* Stop Turn */}
          {(isProcessing || isSpeaking) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelTurn}
              className="h-7 text-xs gap-1 text-rose-400 border-rose-900/50 hover:bg-rose-950/40 hover:text-rose-300 rounded-lg"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Stop</span>
            </Button>
          )}

          {/* Clear Session */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopSpeaking();
              setMessages([{ id: 'init', role: 'assistant', content: 'Jarvis online and ready.' }]);
            }}
            className="h-7 text-xs px-2 text-zinc-400 hover:text-zinc-200 rounded-lg"
            title="Clear conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ─── Main Content Area: Voice Radar vs Conversation Feed ───────────── */}
      {viewMode === 'voice' ? (
        <Card className="flex-1 bg-zinc-950 border-zinc-800/80 rounded-3xl overflow-hidden flex flex-col items-center justify-between p-6 sm:p-10 relative backdrop-blur-xl shadow-2xl">
          {/* Subtle Ambient Glow Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,0.12),transparent_65%)] pointer-events-none" />

          {/* Top Status Header */}
          <div className="w-full flex items-center justify-between text-xs text-zinc-400 z-10">
            <div className="flex items-center gap-2">
              <span className="font-mono text-zinc-500 uppercase tracking-widest text-[10px]">Active Loop</span>
              <span className="text-zinc-700">•</span>
              <span className="text-violet-400 font-mono">Continuous VAD Mode</span>
            </div>
            {wakeDetected && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 text-[11px] font-medium"
              >
                <Zap className="h-3.5 w-3.5 text-violet-400 fill-violet-400" />
                <span>Wake Word Detected!</span>
              </motion.div>
            )}
          </div>

          {/* ─── Central Voice Sphere / Soundwave Orb ─── */}
          <div className="flex flex-col items-center justify-center gap-6 my-auto z-10">
            <div className="relative flex items-center justify-center">
              {/* Outer Pulsing Rings */}
              {isListening && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.45, 1], opacity: [0.35, 0, 0.35] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute h-56 w-56 rounded-full border border-violet-500/30"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.85, 1], opacity: [0.18, 0, 0.18] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    className="absolute h-56 w-56 rounded-full border border-violet-400/20"
                  />
                </>
              )}

              {/* Glowing Interactive Voice Orb */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={toggleListening}
                className={`relative flex h-36 w-36 items-center justify-center rounded-full transition-all duration-700 shadow-2xl ${
                  isSpeaking
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-[0_0_60px_rgba(16,185,129,0.5)]'
                    : isProcessing
                    ? 'bg-gradient-to-tr from-violet-700 to-indigo-500 shadow-[0_0_60px_rgba(139,92,246,0.6)] animate-pulse'
                    : isListening
                    ? wakeDetected
                      ? 'bg-gradient-to-tr from-violet-500 to-fuchsia-500 shadow-[0_0_70px_rgba(217,70,239,0.7)]'
                      : 'bg-gradient-to-tr from-violet-600 via-indigo-600 to-violet-800 shadow-[0_0_50px_rgba(124,58,237,0.45)]'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                }`}
                title={isListening ? 'Click to pause listening' : 'Click to start listening'}
              >
                {/* Inner Waveform / Icon */}
                {isProcessing ? (
                  <Loader2 className="h-12 w-12 text-white animate-spin" />
                ) : isSpeaking ? (
                  <Volume2 className="h-12 w-12 text-white animate-bounce" />
                ) : isListening ? (
                  <Mic className="h-12 w-12 text-white drop-shadow-md" />
                ) : (
                  <MicOff className="h-12 w-12 text-zinc-400" />
                )}
              </motion.button>
            </div>

            {/* Voice Status Indicator Label */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-sm font-semibold text-zinc-100 tracking-wide">
                {isProcessing
                  ? 'Reasoning & Executing Tools...'
                  : isSpeaking
                  ? 'Jarvis Speaking Response...'
                  : isListening
                  ? wakeWordRequired
                    ? 'Listening for "JARVIS..."'
                    : 'Listening to Voice Input...'
                  : 'Microphone Muted'}
              </span>

              {/* Dynamic Soundwave Bars */}
              {isListening && (
                <div className="flex items-center gap-1 h-5 mt-1">
                  {[25, 60, 95, 45, 80, 100, 65, 30, 85, 50, 75, 40].map((h, i) => (
                    <motion.span
                      key={i}
                      animate={{
                        height: isListening
                          ? [`${Math.max(4, h * 0.15)}px`, `${h * 0.22}px`, `${Math.max(4, h * 0.15)}px`]
                          : '4px'
                      }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.05 }}
                      className={`w-1 rounded-full ${
                        wakeDetected ? 'bg-fuchsia-400' : 'bg-violet-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Live Real-Time Speech Recognition Transcript Banner */}
            <div className="min-h-[48px] max-w-lg w-full flex items-center justify-center text-center px-4 py-2.5 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md">
              {liveTranscript ? (
                <p className="text-sm text-violet-200 font-medium tracking-wide animate-pulse">
                  "{liveTranscript}"
                </p>
              ) : (
                <p className="text-xs text-zinc-500 italic">
                  Say "JARVIS" followed by any action or question...
                </p>
              )}
            </div>
          </div>

          {/* Latest Response Teaser / Card */}
          {latestAssistantMessage && latestAssistantMessage.content && (
            <div className="w-full max-w-2xl bg-zinc-900/50 border border-white/5 rounded-2xl p-4 text-xs text-zinc-300 flex items-start gap-3 backdrop-blur-md z-10">
              <Zap className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-violet-300 text-[11px]">Latest Jarvis Response</span>
                  <button
                    onClick={() => speakResponse(latestAssistantMessage.content)}
                    className="text-zinc-400 hover:text-violet-400 transition-colors"
                    title="Replay audio"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="line-clamp-2 text-zinc-300 font-sans leading-relaxed">
                  {latestAssistantMessage.content}
                </p>
              </div>
            </div>
          )}
        </Card>
      ) : (
        /* ─── Thread Mode: Conversation Feed ─────────────────────────────── */
        <Card className="flex-1 bg-zinc-950 border-zinc-800/80 rounded-3xl overflow-hidden flex flex-col backdrop-blur-md shadow-xl">
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
                      ? 'bg-violet-600 text-white shadow-md rounded-br-none'
                      : 'bg-zinc-900/90 text-zinc-200 border border-zinc-800/90 rounded-bl-none shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px] font-medium opacity-80">
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
                        title="Replay audio"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap">{msg.content || (msg.isStreaming ? 'Executing action...' : '')}</p>

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
        </Card>
      )}

      {/* ─── Suggestion Chips Bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 no-scrollbar">
        {promptSuggestions.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            disabled={isProcessing}
            className="text-[11px] px-3 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 hover:border-zinc-700 whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <Sparkles className="h-3 w-3 text-violet-400" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* ─── Bottom Command Bar (Voice Toggle + Type Input) ──────────────── */}
      <div className="flex items-center gap-2 bg-zinc-950/90 border border-white/10 rounded-2xl p-2 backdrop-blur-xl shadow-lg">
        {/* Mic Action Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleListening}
          className={`relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
            isListening
              ? 'bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.6)]'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title={isListening ? 'Mute microphone' : 'Activate microphone'}
        >
          {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </motion.button>

        {/* Text Command Input */}
        <input
          type="text"
          value={inputTranscript}
          onChange={(e) => setInputTranscript(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            isListening
              ? 'Speak command (e.g. "JARVIS, click on sign up") or type here...'
              : 'Type command for Jarvis...'
          }
          disabled={isProcessing}
          className="flex-1 h-11 rounded-xl bg-zinc-900/60 border border-zinc-800/80 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
        />

        {/* Send Button */}
        <Button
          size="sm"
          onClick={() => handleSend()}
          disabled={!inputTranscript.trim() || isProcessing}
          className="h-11 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all"
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
