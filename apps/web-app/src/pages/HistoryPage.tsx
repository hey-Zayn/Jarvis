import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Search, Trash2, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';

interface ConversationItem {
  id: string;
  title: string;
  lastMessage: string;
  turnCount: number;
  updatedAt: string;
}

export function HistoryPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.listConversations().then((response) => {
      if (response.status?.ok) {
        setConversations((response.conversations || []).map((conversation: { conversationId: string; title: string; lastMessage: string; messageCount: number; updatedAtEpochMillis: string }) => ({
          id: conversation.conversationId,
          title: conversation.title,
          lastMessage: conversation.lastMessage,
          turnCount: conversation.messageCount,
          updatedAt: new Date(Number(conversation.updatedAtEpochMillis)).toLocaleString()
        })));
      }
    }).catch((error) => console.error('[HistoryPage] Failed to load conversations:', error)).finally(() => setIsLoading(false));
  }, []);

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">
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
            {isLoading ? (
              <Card className="bg-zinc-900/50 border-zinc-800 text-center py-12"><CardContent><p className="text-zinc-400 text-sm">Loading conversation history...</p></CardContent></Card>
            ) : filtered.length === 0 ? (
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
                    onClick={() => navigate(`/workspace?conversationId=${encodeURIComponent(item.id)}`)}
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
    </div>
  );
}
