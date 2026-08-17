'use client';

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MessageSquare, Brain, Settings, History, Plus, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

const navigation = [
  { name: 'Conversations', href: '/workspace', icon: MessageSquare },
  { name: 'History', href: '/history', icon: History },
  { name: 'Memory', href: '/memory', icon: Brain },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout } = useAuthStore();

  return (
    <motion.aside
      initial={{ width: collapsed ? 64 : 256 }}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-zinc-950/80 backdrop-blur-sm border-r border-zinc-800 flex flex-col',
        'transition-all duration-200 ease-in-out'
      )}
      style={{ width: collapsed ? '64px' : '256px' }}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-800">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: collapsed ? 0 : 1, x: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          {!collapsed && <span className="font-semibold text-xl text-zinc-100">Jarvis</span>}
        </motion.div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="text-zinc-400 hover:text-zinc-100"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="nav-items"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/workspace' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <div className="flex flex-col items-center space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/workspace' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'p-2 rounded-lg transition-all duration-150',
                    isActive
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                  )}
                >
                  <item.icon className="h-5 w-5 mx-auto" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="new-chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Button className="w-full gap-2" onClick={() => { /* TODO: Implement new conversation */ }}>
                <Plus className="h-4 w-4" />
                <span>New Conversation</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="logout"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Button variant="ghost" className="w-full gap-2 mt-2 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={logout}>
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}