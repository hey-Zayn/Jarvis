import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Plus, Search, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MemoryItem {
  id: string;
  content: string;
  category: 'user_preference' | 'fact' | 'task' | 'general';
  score?: number;
  createdAt: string;
}

const mockMemories: MemoryItem[] = [
  {
    id: 'mem-1',
    content: 'User prefers concise, direct responses under 200ms latency without filler words.',
    category: 'user_preference',
    createdAt: 'Today, 2:30 PM'
  },
  {
    id: 'mem-2',
    content: 'User lives in Seattle, WA and works on distributed systems and AI agents.',
    category: 'fact',
    createdAt: 'Yesterday'
  },
  {
    id: 'mem-3',
    content: 'Preferred tech stack: Node.js, React, TypeScript, Rust, and Tailwind CSS.',
    category: 'user_preference',
    createdAt: 'Aug 24, 2026'
  },
  {
    id: 'mem-4',
    content: 'Deploy Redis cluster with BullMQ worker queues on port 6379.',
    category: 'task',
    createdAt: 'Aug 20, 2026'
  }
];

export function MemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>(mockMemories);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'user_preference' | 'fact' | 'task' | 'general'>('user_preference');
  const [isAdding, setIsAdding] = useState(false);

  const categories = [
    { id: 'all', label: 'All Memories' },
    { id: 'user_preference', label: 'Preferences' },
    { id: 'fact', label: 'Facts' },
    { id: 'task', label: 'Tasks' },
    { id: 'general', label: 'General' },
  ];

  const filtered = memories.filter(m => {
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesSearch = m.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const newMem: MemoryItem = {
      id: `mem-${Date.now()}`,
      content: newContent.trim(),
      category: newCategory,
      createdAt: 'Just now'
    };

    setMemories([newMem, ...memories]);
    setNewContent('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'user_preference': return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
      case 'fact': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'task': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-violet-400" />
                <h1 className="text-2xl font-bold text-zinc-100">Vector Memory Manager</h1>
              </div>
              <p className="text-sm text-zinc-400">Context and facts retrieved semantically by Jarvis during reasoning</p>
            </div>
            <Button
              onClick={() => setIsAdding(!isAdding)}
              className="gap-2 bg-violet-600 hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" />
              <span>Add Memory</span>
            </Button>
          </div>

          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="bg-zinc-900/90 border-violet-500/30 p-4 space-y-4">
                  <form onSubmit={handleAddMemory} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-300">Memory Content</label>
                      <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="e.g. User prefers Python for data tasks and Rust for web servers..."
                        className="w-full h-20 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">Category:</span>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value as any)}
                          className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded-md px-2 py-1.5 focus:outline-none"
                        >
                          <option value="user_preference">Preference</option>
                          <option value="fact">Fact</option>
                          <option value="task">Task</option>
                          <option value="general">General</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" className="bg-violet-600 hover:bg-violet-500">
                          Save to Qdrant
                        </Button>
                      </div>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(25,118,210,0.3)]'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Semantic query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Brain className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400 text-sm">No memories match the filter</p>
              </div>
            ) : (
              filtered.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card className="bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 p-4 space-y-3 h-full flex flex-col justify-between">
                    <p className="text-sm text-zinc-200 leading-relaxed">{item.content}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs">
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] capitalize ${getCategoryBadgeClass(item.category)}`}>
                        {item.category.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-3 text-zinc-500">
                        <span>{item.createdAt}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          aria-label="Delete memory"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
    </div>
  );
}
