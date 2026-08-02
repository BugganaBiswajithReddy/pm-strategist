import React, { useMemo } from 'react';
import { RoadmapResponse, Task } from '../lib/gemini';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';
import { User, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ResourceWorkloadProps {
  roadmap: RoadmapResponse;
}

export default function ResourceWorkload({ roadmap }: ResourceWorkloadProps) {
  const workloadData = useMemo(() => {
    const owners: Record<string, { name: string; totalHours: number; taskCount: number; tasks: Task[] }> = {};

    roadmap.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        if (!owners[task.owner]) {
          owners[task.owner] = { name: task.owner, totalHours: 0, taskCount: 0, tasks: [] };
        }
        
        // Convert estimation to hours (rough approximation)
        let hours = task.estimation?.value || 0;
        const unit = task.estimation?.unit?.toLowerCase() || '';
        if (unit.includes('day')) hours *= 8;
        if (unit.includes('week')) hours *= 40;
        if (unit.includes('point')) hours *= 4; // 1 point = 4h approx

        owners[task.owner].totalHours += hours;
        owners[task.owner].taskCount += 1;
        owners[task.owner].tasks.push(task);
      });
    });

    return Object.values(owners).sort((a, b) => b.totalHours - a.totalHours);
  }, [roadmap]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = workloadData.find(d => d.name === label);
      return (
        <div className="bg-[#0a0502]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl z-[100] min-w-[200px]">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-[#ff4e00]/20 flex items-center justify-center">
              <User className="w-4 h-4 text-[#ff4e00]" />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest">{label}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Department Allocation</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 font-medium uppercase tracking-widest">Total Effort</span>
              <span className="text-xs font-bold text-white">{payload[0].value} Hours</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 font-medium uppercase tracking-widest">Task Count</span>
              <span className="text-xs font-bold text-white">{data?.taskCount} Tasks</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 h-full flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#ff4e00]/10 rounded-xl">
            <Users className="w-4 h-4 text-[#ff4e00]" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">Department Workload</h3>
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Department Allocation Analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Optimal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Overloaded</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={workloadData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 'bold' }}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 'bold' }}
              label={{ value: 'TOTAL HOURS', angle: -90, position: 'insideLeft', fill: '#ffffff20', fontSize: 10, fontWeight: 'bold' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
            <Bar dataKey="totalHours" radius={[6, 6, 0, 0]} barSize={40}>
              {workloadData.map((entry, index) => {
                const color = entry.totalHours > 80 ? '#ef4444' : entry.totalHours > 40 ? '#eab308' : '#22c55e';
                return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.8} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workloadData.map((resource) => (
          <div key={resource.name} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-[#ff4e00]/30 transition-all">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                resource.totalHours > 80 ? "bg-red-500/20 text-red-500" : 
                resource.totalHours > 40 ? "bg-yellow-500/20 text-yellow-500" : 
                "bg-green-500/20 text-green-500"
              )}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-widest">{resource.name}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{resource.taskCount} Tasks Assigned</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">{resource.totalHours}h</p>
              <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Total Effort</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
