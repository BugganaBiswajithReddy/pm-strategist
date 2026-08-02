import React, { useState, useRef, useEffect } from 'react';
import { RoadmapResponse, chatWithAssistant, ChatResponse } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  X, 
  MessageSquare,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

interface ChatSidebarProps {
  roadmap: RoadmapResponse | null;
  onUpdateRoadmap: (updatedRoadmap: RoadmapResponse, isAdjusted?: boolean) => void;
}

export default function ChatSidebar({ roadmap, onUpdateRoadmap }: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isLoading]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await chatWithAssistant(userMessage, history, roadmap);
      
      setHistory(prev => [...prev, { role: 'assistant', content: response.message }]);
      
      if (response.updatedRoadmap) {
        onUpdateRoadmap(response.updatedRoadmap, true);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setHistory(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 p-4 bg-[#ff4e00] text-black rounded-2xl shadow-2xl hover:scale-110 transition-all group",
          isOpen && "scale-0 opacity-0"
        )}
      >
        <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0a0502] border-l border-white/10 z-[100] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#ff4e00]/10 rounded-xl">
                  <Bot className="w-5 h-5 text-[#ff4e00]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white">PM Strategist</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Contextual AI Advice</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/20 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
            >
              {history.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 text-[#ff4e00]/40" />
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed max-w-[200px] mx-auto">
                    Ask me anything about your roadmap. I can suggest features, analyze risks, or even update the plan for you.
                  </p>
                </div>
              )}

              {history.map((msg, i) => (
                <div 
                  key={i}
                  className={cn(
                    "flex gap-4",
                    msg.role === 'user' ? "flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                    msg.role === 'user' ? "bg-white/10" : "bg-[#ff4e00]/20"
                  )}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white/60" /> : <Bot className="w-4 h-4 text-[#ff4e00]" />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' ? "bg-white/5 text-white/80" : "bg-white/5 text-white border border-white/5"
                  )}>
                    <div className="markdown-body">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-[#ff4e00]/20 flex items-center justify-center shrink-0 animate-pulse">
                    <Bot className="w-4 h-4 text-[#ff4e00]" />
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-[#ff4e00] animate-spin" />
                    <span className="text-xs text-white/40 font-medium uppercase tracking-widest">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-white/5 bg-white/5">
              <div className="relative">
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask for advice or changes..."
                  className="w-full bg-[#0a0502] border border-white/10 rounded-2xl pl-4 pr-12 py-4 text-sm text-white focus:border-[#ff4e00]/50 transition-all outline-none resize-none min-h-[60px] max-h-[200px]"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  className="absolute right-3 bottom-3 p-2 bg-[#ff4e00] text-black rounded-xl hover:bg-[#ff4e00]/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-[9px] text-white/20 text-center uppercase tracking-widest font-bold">
                AI can update your roadmap directly based on your requests
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
