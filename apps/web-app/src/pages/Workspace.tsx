import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { VoiceWorkspace } from '@/components/voice/VoiceWorkspace';

export function Workspace() {
  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <VoiceWorkspace />
        </main>
      </div>
    </div>
  );
}