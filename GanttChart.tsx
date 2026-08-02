import React from 'react';
import { RoadmapResponse, Task } from '../lib/gemini';
import { formatDurationRange } from '../lib/formatters';
import { motion } from 'motion/react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';

interface GanttChartProps {
  roadmap: RoadmapResponse;
}

export default function GanttChart({ roadmap }: GanttChartProps) {
  const allTasks = roadmap.phases.flatMap(p => p.tasks);
  
  // Find min and max dates
  const dates = allTasks
    .map(t => t.startDate ? parseISO(t.startDate) : new Date())
    .filter(d => !isNaN(d.getTime()));
    
  if (dates.length === 0) return (
    <div className="flex items-center justify-center h-64 text-white/40 italic">
      No date information available for Gantt chart.
    </div>
  );

  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allTasks.map(t => {
    const start = t.startDate ? parseISO(t.startDate) : new Date();
    if (isNaN(start.getTime())) return minDate.getTime();
    return addDays(start, t.duration || 1).getTime();
  })));

  const totalDays = Math.max(1, differenceInDays(maxDate, minDate) + 7);
  const dayWidth = 40;

  return (
    <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-3xl p-6">
      <div style={{ width: totalDays * dayWidth + 200 }}>
        {/* Timeline Header */}
        <div className="flex border-b border-white/10 pb-4 mb-4">
          <div className="w-[200px] shrink-0 font-bold text-[#ff4e00] text-xs uppercase tracking-widest">Task</div>
          <div className="flex relative h-8 w-full">
            {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, i) => (
              <div 
                key={i} 
                className="absolute text-[10px] text-white/20 border-l border-white/5 h-full pl-2"
                style={{ left: i * 7 * dayWidth }}
              >
                Week {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-4">
          {roadmap.phases.map((phase, pIdx) => (
            <div key={pIdx} className="space-y-2">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 px-2 py-1 bg-white/5 rounded w-fit">
                {phase.title}
              </div>
              {phase.tasks.map((task, tIdx) => {
                let start = task.startDate ? parseISO(task.startDate) : minDate;
                if (isNaN(start.getTime())) start = minDate;
                const offset = differenceInDays(start, minDate) * dayWidth;
                const width = (task.duration || 1) * dayWidth;

                return (
                  <div key={task.id} className="flex items-center group">
                    <div className="w-[200px] shrink-0 text-xs text-white/60 truncate pr-4 group-hover:text-white transition-colors">
                      {task.description}
                    </div>
                    <div className="relative h-6 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width }}
                        style={{ left: offset }}
                        className={`absolute h-full rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-lg ${
                          task.status === 'done' ? 'bg-green-500/50' :
                          task.status === 'in-progress' ? 'bg-[#ff4e00]' :
                          'bg-blue-500/50'
                        }`}
                      >
                        {formatDurationRange(task.duration)}
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
