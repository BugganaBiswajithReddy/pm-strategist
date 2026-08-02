import React, { useState, useEffect } from 'react';
import { Task } from '../lib/gemini';
import { formatCurrencyRange, formatDurationRange, formatEffortRange, formatTimeRange } from '../lib/formatters';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Save, 
  Trash2, 
  Clock, 
  User, 
  AlertCircle, 
  ChevronDown,
  Calendar,
  DollarSign
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (updatedTask: Task) => void;
  onDelete?: () => void;
  isNew?: boolean;
}

export default function TaskModal({ isOpen, onClose, task, onSave, onDelete, isNew }: TaskModalProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
    } else if (isNew) {
      setEditedTask({
        id: `task-${Math.random().toString(36).substr(2, 9)}`,
        description: '',
        owner: 'Engineering',
        deadline: 'Week 1',
        status: 'todo',
        priority: 'medium',
        estimation: { value: 1, unit: 'hours' },
        dependencies: [],
        startDate: new Date().toISOString().split('T')[0],
        duration: 1,
        cost: 0
      });
    }
  }, [task, isNew, isOpen]);

  if (!isOpen || !editedTask) return null;

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-xl bg-[#0a0502] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#ff4e00]/10 rounded-xl">
                <AlertCircle className="w-4 h-4 text-[#ff4e00]" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">
                {isNew ? 'Add New Task' : 'Edit Task'}
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/20 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Task Description</label>
              <textarea 
                value={editedTask.description}
                onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-[#ff4e00]/50 transition-all outline-none min-h-[100px] resize-none"
                placeholder="What needs to be done?"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Owner / Department */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Department</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    type="text"
                    value={editedTask.owner}
                    onChange={(e) => setEditedTask({ ...editedTask, owner: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:border-[#ff4e00]/50 transition-all outline-none"
                    placeholder="e.g., Engineering, Design, QA"
                  />
                </div>
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Deadline</label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    type="text"
                    value={editedTask.deadline}
                    onChange={(e) => setEditedTask({ ...editedTask, deadline: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:border-[#ff4e00]/50 transition-all outline-none"
                    placeholder="e.g., Week 2"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Status</label>
                <select 
                  value={editedTask.status}
                  onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value as Task['status'] })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-[#ff4e00]/50 transition-all outline-none appearance-none"
                >
                  <option value="todo">Todo</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Priority</label>
                <select 
                  value={editedTask.priority}
                  onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as Task['priority'] })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-[#ff4e00]/50 transition-all outline-none appearance-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Start Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    type="date"
                    value={editedTask.startDate}
                    onChange={(e) => setEditedTask({ ...editedTask, startDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:border-[#ff4e00]/50 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Duration (Days)</label>
                  <span className="text-[10px] font-mono text-[#ff4e00]/80 bg-[#ff4e00]/10 px-2 py-0.5 rounded-full border border-[#ff4e00]/20">
                    Range: {formatDurationRange(editedTask.duration)}
                  </span>
                </div>
                <input 
                  type="number"
                  value={editedTask.duration}
                  onChange={(e) => setEditedTask({ ...editedTask, duration: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-[#ff4e00]/50 transition-all outline-none"
                />
              </div>

              {/* Cost */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Estimated Cost</label>
                  <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                    Range: {formatCurrencyRange(editedTask.cost)}
                  </span>
                </div>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    type="number"
                    value={editedTask.cost}
                    onChange={(e) => setEditedTask({ ...editedTask, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:border-[#ff4e00]/50 transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-white/5 flex items-center justify-between gap-4">
            {onDelete && !isNew && (
              <button 
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all text-xs font-bold uppercase tracking-widest"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <button 
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-white/40 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onSave(editedTask);
                  onClose();
                }}
                className="flex items-center gap-2 px-6 py-2 bg-[#ff4e00] text-black rounded-xl hover:bg-[#ff4e00]/90 transition-all text-xs font-bold uppercase tracking-widest"
              >
                <Save className="w-4 h-4" />
                Save Task
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
