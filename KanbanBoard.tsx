import React, { useState } from 'react';
import { RoadmapResponse, Task, RoadmapPhase } from '../lib/gemini';
import { formatCurrencyRange, formatEffortRange, formatTimeRange } from '../lib/formatters';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MoreVertical, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Circle,
  GripVertical,
  DollarSign,
  Timer
} from 'lucide-react';
import { cn } from '../lib/utils';

interface KanbanBoardProps {
  roadmap: RoadmapResponse;
  onUpdateTask: (phaseIndex: number, taskIndex: number, updatedTask: Task) => void;
  onAddTask: (phaseIndex: number) => void;
  onDeleteTask: (phaseIndex: number, taskIndex: number) => void;
  onEditTask?: (phaseIndex: number, taskIndex: number, task: Task) => void;
}

export default function KanbanBoard({ roadmap, onUpdateTask, onAddTask, onDeleteTask, onEditTask }: KanbanBoardProps) {
  const statuses: Task['status'][] = ['todo', 'in-progress', 'done'];

  const getTasksByStatus = (status: Task['status']) => {
    const allTasks: { phaseIndex: number; taskIndex: number; task: Task }[] = [];
    roadmap.phases.forEach((phase, pIdx) => {
      phase.tasks.forEach((task, tIdx) => {
        if (task.status === status) {
          allTasks.push({ phaseIndex: pIdx, taskIndex: tIdx, task });
        }
      });
    });
    return allTasks;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[600px]">
      {statuses.map((status) => (
        <div key={status} className="flex flex-col gap-4 bg-white/5 rounded-3xl p-4 border border-white/10">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                status === 'todo' ? "bg-blue-500" : status === 'in-progress' ? "bg-[#ff4e00]" : "bg-green-500"
              )} />
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">
                {status.replace('-', ' ')}
              </h3>
              <span className="text-[10px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                {getTasksByStatus(status).length}
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {getTasksByStatus(status).map(({ phaseIndex, taskIndex, task }) => (
              <motion.div
                key={task.id}
                layoutId={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-[#0a0502] border border-white/10 rounded-2xl p-4 hover:border-[#ff4e00]/30 transition-all cursor-pointer relative"
                onClick={() => onEditTask?.(phaseIndex, taskIndex, task)}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                      task.priority === 'high' ? "bg-red-500/10 text-red-500" :
                      task.priority === 'medium' ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-blue-500/10 text-blue-500"
                    )}>
                      {task.priority}
                    </span>
                    <span className="text-[9px] font-mono text-white/20">#{task.id.slice(-4)}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTask(phaseIndex, taskIndex);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-red-500"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-xs font-medium text-[#e0d8d0] mb-3 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] font-mono text-[#ff4e00]/80 bg-[#ff4e00]/10 px-2 py-0.5 rounded-full border border-[#ff4e00]/20 flex items-center gap-1">
                    <Timer className="w-2.5 h-2.5" />
                    {formatEffortRange(task.estimation?.value, task.estimation?.unit)}
                  </span>
                  {task.cost ? (
                    <span className="text-[9px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1">
                      <DollarSign className="w-2.5 h-2.5" />
                      {formatCurrencyRange(task.cost, roadmap.currency)}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#ff4e00]/20 flex items-center justify-center">
                      <User className="w-3 h-3 text-[#ff4e00]" />
                    </div>
                    <span className="text-[10px] text-white/40 font-medium">{task.owner}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/20">
                    <Clock className="w-3 h-3" />
                    <span className="text-[9px] font-mono">{formatTimeRange(task.deadline)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {status === 'todo' && (
              <button 
                onClick={() => onAddTask(0)} // Default to first phase for now
                className="w-full py-3 border border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-white/20 hover:text-[#ff4e00] hover:border-[#ff4e00]/30 hover:bg-[#ff4e00]/5 transition-all group"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Add Task</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
