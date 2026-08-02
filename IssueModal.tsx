import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Send, ClipboardList } from 'lucide-react';
import { RoadmapResponse, Issue } from '../lib/gemini';
import { cn } from '../lib/utils';

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  roadmap: RoadmapResponse | null;
  onSave: (issue: Issue) => void;
  userEmail: string;
}

export default function IssueModal({ isOpen, onClose, roadmap, onSave, userEmail }: IssueModalProps) {
  const [taskId, setTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Issue['severity']>('medium');

  const allTasks = roadmap?.phases?.flatMap(p => p.tasks) || [];

  const handleSave = () => {
    if (!taskId || !description) return;

    const selectedTask = allTasks.find(t => t.id === taskId);

    const newIssue: Issue = {
      id: `issue-${Date.now()}`,
      taskId,
      taskDescription: selectedTask?.description || 'Unknown Task',
      description,
      severity,
      status: 'open',
      reportedBy: userEmail,
      createdAt: new Date().toISOString()
    };

    onSave(newIssue);
    setTaskId('');
    setDescription('');
    setSeverity('medium');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[#0a0502] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Raise Issue</h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Report a task blocker</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ff4e00]">Select Task</label>
                <div className="relative">
                  <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <select
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-[#ff4e00]/50 transition-all appearance-none"
                  >
                    <option value="" className="bg-[#0a0502]">Select a task...</option>
                    {allTasks.map(task => (
                      <option key={task.id} value={task.id} className="bg-[#0a0502]">
                        {task.description.slice(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ff4e00]">Issue Description</label>
                </div>
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-[#ff4e00]/50 transition-all min-h-[120px] resize-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ff4e00]">Severity Level</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setSeverity(level)}
                      className={cn(
                        "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                        severity === level 
                          ? level === 'critical' ? "bg-red-500 border-red-500 text-white" :
                            level === 'high' ? "bg-orange-500 border-orange-500 text-white" :
                            level === 'medium' ? "bg-yellow-500 border-yellow-500 text-white" :
                            "bg-blue-500 border-blue-500 text-white"
                          : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/5 border-t border-white/5 flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!taskId || !description}
                className="flex-1 py-4 rounded-2xl bg-[#ff4e00] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-[#ff4e00]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Raise Issue
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
