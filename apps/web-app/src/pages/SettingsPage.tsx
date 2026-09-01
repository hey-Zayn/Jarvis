import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Mic, Cpu, RefreshCw, CheckCircle2 } from 'lucide-react';

export function SettingsPage() {
  const [selectedModel, setSelectedModel] = useState('llama3-8b-8192');
  const [voiceVolume, setVoiceVolume] = useState(85);
  const [autoListen, setAutoListen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const services = [
    { name: 'API Gateway', port: '5000', status: 'healthy', latency: '2ms', protocol: 'HTTP / NDJSON' },
    { name: 'Auth Service', port: '4001 / 4101', status: 'healthy', latency: '8ms', protocol: 'gRPC / Proto v1' },
    { name: 'Agent Service', port: '4002 / 4102', status: 'healthy', latency: '45ms', protocol: 'gRPC / LangGraph' },
    { name: 'Worker Service', port: '4003 / 4103', status: 'healthy', latency: '12ms', protocol: 'BullMQ / Redis' },
    { name: 'Qdrant Vector DB', port: '6333', status: 'healthy', latency: '4ms', protocol: 'REST / Cosine' },
    { name: 'PostgreSQL DB', port: '5432', status: 'healthy', latency: '1ms', protocol: 'Prisma Client' }
  ];

  const handleRefreshHealth = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Settings & Developer Debug</h1>
            <p className="text-sm text-zinc-400">Configure voice parameters and inspect microservice infrastructure health</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Voice & Model Settings */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-zinc-900/40 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-violet-400" />
                    <CardTitle className="text-lg">Agent Inference Model</CardTitle>
                  </div>
                  <CardDescription>Select model provider optimized for ultra-low latency response streaming</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'llama3-8b-8192', name: 'Llama 3 8B (Groq)', desc: 'Fastest inference (<150ms token latency)', speed: 'Ultra Fast' },
                      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', desc: 'Complex reasoning & multi-step tools', speed: 'Smart' },
                      { id: 'fallback-local', name: 'Jarvis Local Engine', desc: 'Offline deterministic fallback', speed: 'Instant' }
                    ].map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                          selectedModel === m.id
                            ? 'bg-violet-600/20 border-violet-500 text-zinc-100 shadow-[0_0_15px_rgba(25,118,210,0.2)]'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-zinc-100">{m.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-violet-300">{m.speed}</span>
                        </div>
                        <p className="text-xs text-zinc-400">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Audio I/O Configuration */}
              <Card className="bg-zinc-900/40 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-violet-400" />
                    <CardTitle className="text-lg">Audio & Microphone</CardTitle>
                  </div>
                  <CardDescription>Configure microphone input capture and speech synthesis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-zinc-800/60">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">Continuous Voice Activation</p>
                      <p className="text-xs text-zinc-500">Keep listening automatically after assistant answers</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoListen}
                      onChange={(e) => setAutoListen(e.target.checked)}
                      className="h-4 w-4 rounded accent-violet-600 bg-zinc-900 border-zinc-700 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-300">
                      <span>Synthesizer Output Volume</span>
                      <span>{voiceVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(parseInt(e.target.value))}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Microservice Health Telemetry */}
            <div className="space-y-6">
              <Card className="bg-zinc-900/40 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-400" />
                    <CardTitle className="text-base">System Telemetry</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefreshHealth}
                    className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {services.map((svc) => (
                    <div
                      key={svc.name}
                      className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="font-medium text-zinc-200">{svc.name}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 pl-5">{svc.protocol} • Port {svc.port}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-mono text-emerald-300">{svc.latency}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
    </div>
  );
}
