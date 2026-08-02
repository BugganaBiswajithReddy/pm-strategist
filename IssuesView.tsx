import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Circle, Clock, User, MessageSquare, Trash2 } from 'lucide-react';
import { RoadmapResponse, Issue } from '../lib/gemini';
import { cn } from '../lib/utils';

interface IssuesViewProps {
  roadmap: RoadmapResponse | null;
  onUpdateIssue: (issueId: string, updatedIssue: Partial<Issue>) => void;
  onDeleteIssue: (issueId: string) => void;
}

export default function IssuesView({ roadmap, onUpdateIssue, onDeleteIssue }: IssuesViewProps) {
  const issues = roadmap?.issues || [];

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-white/20" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No Issues Reported</h3>
        <p className="text-sm text-white/40 max-w-xs">Raise an issue to track blockers and challenges in your roadmap.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {issues.map((issue) => (
          <motion.div
            key={issue.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#ff4e00]/30 transition-all relative overflow-hidden group",
              issue.severity === 'critical' ? "border-l-4 border-l-red-500" :
              issue.severity === 'high' ? "border-l-4 border-l-orange-500" :
              issue.severity === 'medium' ? "border-l-4 border-l-yellow-500" :
              "border-l-4 border-l-blue-500"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex flex-col gap-1">
                <span className={cn(
                  "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded w-fit",
                  issue.severity === 'critical' ? "bg-red-500/10 text-red-500" :
                  issue.severity === 'high' ? "bg-orange-500/10 text-orange-500" :
                  issue.severity === 'medium' ? "bg-yellow-500/10 text-yellow-500" :
                  "bg-blue-500/10 text-blue-500"
                )}>
                  {issue.severity}
                </span>
                <span className="text-[9px] font-mono text-white/20">#{issue.id.slice(-6)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateIssue(issue.id, { status: issue.status === 'open' ? 'resolved' : 'open' })}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    issue.status === 'resolved' ? "bg-green-500/20 text-green-500" : "bg-white/5 text-white/20 hover:text-white"
                  )}
                  title={issue.status === 'resolved' ? "Reopen Issue" : "Resolve Issue"}
                >
                  {issue.status === 'resolved' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onDeleteIssue(issue.id)}
                  className="p-2 bg-white/5 rounded-lg text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  title="Delete Issue"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-3 h-3 text-[#ff4e00]/60" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Task</span>
              </div>
              <p className="text-xs font-bold text-white line-clamp-1">{issue.taskDescription}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-3 h-3 text-[#ff4e00]/60" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Description</span>
              </div>
              <p className="text-xs text-[#e0d8d0]/70 leading-relaxed">{issue.description}</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                  <User className="w-3 h-3 text-white/40" />
                </div>
                <span className="text-[9px] text-white/40">{issue.reportedBy}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-white/20 font-mono">
                <Clock className="w-3 h-3" />
                {new Date(issue.createdAt).toLocaleDateString()}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
