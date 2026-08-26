import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Search, Trash2, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface ConversationItem {
  id: string;
  title: string;
  lastMessage: string;
  turnCount: number;
  updatedAt: string;
}

const mockConversations: ConversationItem[] = [
  {
    id: 'conv-1',
    title: 'Distributed Rust Services Architecture',
    lastMessage: 'Here is a breakdown of gRPC streaming with Protobuf contracts...',
    turnCount: 6,
    updatedAt: '10 mins ago'
  },
  {
    id: 'conv-2',
    title: 'Daily Schedule & Weather in Seattle',
    lastMessage: 'The weather in Seattle is 21°C and partly cloudy today.',
    turnCount: 3,
    updatedAt: '2 hours ago'
  },
  {
    id: 'conv-3',
    title: 'Complex Math & Token Latency Calculations',
    lastMessage: '45 * 18 + 120 = 930 with sub-200ms first chunk latency.',
    turnCount: 4,
    updatedAt: 'Yesterday'
  }
];

export function HistoryPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>(mockConversations);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pl-16 md:pl-64">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Conversation History</h1>
              <p className="text-sm text-zinc-400">Review past conversations, turns, and voice sessions</p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <Card className="bg-zinc-900/50 border-zinc-800 text-center py-12">
                <CardContent className="space-y-3">
                  <MessageSquare className="h-10 w-10 text-zinc-600 mx-auto" />
                  <p className="text-zinc-400 text-sm">No conversations found</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    onClick={() => navigate('/workspace')}
                    className="bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800 hover:border-violet-500/40 transition-all cursor-pointer group"
                  >
                    <CardHeader className="p-4 flex flex-row items-center justify-between">
                      <div className="space-y-1 pr-4 flex-1">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-violet-400" />
                          <CardTitle className="text-base text-zinc-100 group-hover:text-violet-300 transition-colors">
                            {item.title}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-xs text-zinc-400 line-clamp-1">
                          {item.lastMessage}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{item.updatedAt}</span>
                        </div>
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                          {item.turnCount} turns
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(item.id, e)}
                          className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8"
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
