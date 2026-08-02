import React from 'react';
import { motion } from 'motion/react';
import { 
  PieChart as PieChartIcon, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  CircleDot, 
  TrendingUp, 
  Layers, 
  ListTodo,
  Zap,
  Activity
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { RoadmapResponse } from '../lib/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProgressBreakdownViewProps {
  roadmap: RoadmapResponse | null;
}

export default function ProgressBreakdownView({ roadmap }: ProgressBreakdownViewProps) {
  const hasRoadmap = !!(roadmap && roadmap.phases && roadmap.phases.length > 0);

  // Extract all tasks
  const realTasks = hasRoadmap 
    ? roadmap.phases.flatMap(p => p.tasks || []) 
    : [];

  // Sample tasks if no roadmap loaded yet
  const tasks = realTasks.length > 0 ? realTasks : [
    { title: 'Market Research', status: 'done', priority: 'high' },
    { title: 'Architecture Specs', status: 'done', priority: 'high' },
    { title: 'UI Design Tokens', status: 'done', priority: 'medium' },
    { title: 'API Integration', status: 'in-progress', priority: 'high' },
    { title: 'Database Migration', status: 'in-progress', priority: 'medium' },
    { title: 'Auth Service', status: 'in-progress', priority: 'high' },
    { title: 'User Dashboard', status: 'todo', priority: 'medium' },
    { title: 'E2E Testing', status: 'todo', priority: 'low' },
    { title: 'Deployment Pipeline', status: 'todo', priority: 'medium' },
    { title: 'Analytics Setup', status: 'todo', priority: 'low' }
  ];

  const totalTasks = tasks.length;
  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgCount = tasks.filter(t => t.status === 'in-progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  const todoPct = totalTasks > 0 ? Math.round((todoCount / totalTasks) * 100) : 0;
  const inProgPct = totalTasks > 0 ? Math.round((inProgCount / totalTasks) * 100) : 0;
  const donePct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const pieData = [
    { name: 'To Do', value: todoCount, color: '#64748b', pct: todoPct },
    { name: 'In Progress', value: inProgCount, color: '#ff4e00', pct: inProgPct },
    { name: 'Completed', value: doneCount, color: '#10b981', pct: donePct },
  ];

  const priorityBreakdown = [
    { 
      priority: 'High Priority', 
      todo: tasks.filter(t => t.priority === 'high' && t.status === 'todo').length,
      inProgress: tasks.filter(t => t.priority === 'high' && t.status === 'in-progress').length,
      done: tasks.filter(t => t.priority === 'high' && t.status === 'done').length,
    },
    { 
      priority: 'Medium Priority', 
      todo: tasks.filter(t => t.priority === 'medium' && t.status === 'todo').length,
      inProgress: tasks.filter(t => t.priority === 'medium' && t.status === 'in-progress').length,
      done: tasks.filter(t => t.priority === 'medium' && t.status === 'done').length,
    },
    { 
      priority: 'Low Priority', 
      todo: tasks.filter(t => t.priority === 'low' && t.status === 'todo').length,
      inProgress: tasks.filter(t => t.priority === 'low' && t.status === 'in-progress').length,
      done: tasks.filter(t => t.priority === 'low' && t.status === 'done').length,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[#ff4e00]/20 border border-[#ff4e00]/40 rounded-2xl text-[#ff4e00]">
            <PieChartIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white">Progress Breakdown</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#ff4e00]/10 border border-[#ff4e00]/30 text-[#ff4e00] text-[10px] font-bold uppercase tracking-wider">
                Live Analytics
              </span>
            </div>
            <p className="text-xs text-[#e0d8d0]/60 mt-1">
              Task status distribution, completion rate, and priority velocity metrics
            </p>
          </div>
        </div>

        {!hasRoadmap && (
          <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-400 text-xs font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 animate-pulse shrink-0" />
            <span>Showing sample preview data. Speak a prompt to generate a live roadmap.</span>
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Completion Rate */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#e0d8d0]/60">Completion Rate</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{donePct}%</div>
          <div className="w-full bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${donePct}%` }}
              transition={{ duration: 0.8 }}
              className="bg-emerald-500 h-full rounded-full"
            />
          </div>
        </div>

        {/* Total Tasks */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#e0d8d0]/60">Total Tasks</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <ListTodo className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{totalTasks}</div>
          <span className="text-[10px] text-white/40 mt-2 block font-medium">Across all roadmap phases</span>
        </div>

        {/* In Progress */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#e0d8d0]/60">In Progress</span>
            <div className="p-2 rounded-xl bg-[#ff4e00]/10 text-[#ff4e00]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#ff4e00]">{inProgCount}</div>
          <span className="text-[10px] text-white/40 mt-2 block font-medium">{inProgPct}% of total scope</span>
        </div>

        {/* Completed */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#e0d8d0]/60">Completed</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400">{doneCount}</div>
          <span className="text-[10px] text-white/40 mt-2 block font-medium">{donePct}% verified done</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution Pie Chart */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieChartIcon className="w-5 h-5 text-[#ff4e00]" />
              <h3 className="text-lg font-bold text-white">Status Breakdown</h3>
            </div>
            <p className="text-xs text-[#e0d8d0]/50">Proportional breakdown of tasks by execution status</p>
          </div>

          <div className="relative w-full h-64 my-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0a0502]/95 border border-white/20 p-3 rounded-xl shadow-xl text-xs text-white">
                          <p className="font-bold flex items-center gap-1.5" style={{ color: data.color }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                            {data.name}
                          </p>
                          <p className="text-white/80 mt-1 font-medium">{data.value} tasks ({data.pct}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Circle Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-white">{donePct}%</span>
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Done</span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
            {pieData.map((item) => (
              <div key={item.name} className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold text-white/90">{item.name}</span>
                </div>
                <span className="text-lg font-black text-white">{item.value}</span>
                <span className="text-[10px] text-white/50">{item.pct}% of total</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Execution Velocity Bar Chart */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-[#ff4e00]" />
              <h3 className="text-lg font-bold text-white">Status by Priority Level</h3>
            </div>
            <p className="text-xs text-[#e0d8d0]/50">Distribution of tasks categorized by priority tier</p>
          </div>

          <div className="w-full h-64 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityBreakdown} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="priority" stroke="#ffffff50" tick={{ fill: '#ffffff70', fontSize: 11 }} />
                <YAxis stroke="#ffffff50" tick={{ fill: '#ffffff70', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0502', borderColor: '#ffffff20', borderRadius: '12px' }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Bar dataKey="done" name="Completed" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="inProgress" name="In Progress" fill="#ff4e00" radius={[6, 6, 0, 0]} />
                <Bar dataKey="todo" name="To Do" fill="#64748b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#10b981]" />
              <span className="text-white/80 font-medium">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff4e00]" />
              <span className="text-white/80 font-medium">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#64748b]" />
              <span className="text-white/80 font-medium">To Do</span>
            </div>
          </div>
        </div>
      </div>

      {/* Phase Progress Matrix */}
      {hasRoadmap && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#ff4e00]" />
              <h3 className="text-lg font-bold text-white">Phase Progress Breakdown</h3>
            </div>
            <span className="text-xs text-white/50 font-medium">{roadmap.phases.length} Phases Total</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {roadmap.phases.map((phase, idx) => {
              const pTasks = phase.tasks || [];
              const pTotal = pTasks.length;
              const pDone = pTasks.filter(t => t.status === 'done').length;
              const pInProg = pTasks.filter(t => t.status === 'in-progress').length;
              const pTodo = pTasks.filter(t => t.status === 'todo').length;
              const pPct = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;

              return (
                <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#ff4e00]/20 text-[#ff4e00] font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-white truncate max-w-[200px]">{phase.title}</h4>
                    </div>
                    <span className="text-xs font-black text-emerald-400">{pPct}%</span>
                  </div>

                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pPct}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/60 pt-1">
                    <span>{pTotal} tasks</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400">{pDone} Done</span>
                      <span className="text-[#ff4e00]">{pInProg} Active</span>
                      <span className="text-slate-400">{pTodo} Todo</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
