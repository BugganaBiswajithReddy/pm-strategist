import React from 'react';
import { RoadmapResponse } from '../lib/gemini';
import { formatCurrencyRange } from '../lib/formatters';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { DollarSign, TrendingUp, PieChart as PieChartIcon, BarChart3, Activity, AlertTriangle } from 'lucide-react';
import { parseISO, format, addDays } from 'date-fns';

interface BudgetDashboardProps {
  roadmap: RoadmapResponse;
}

const COLORS = ['#ff4e00', '#ff6321', '#ff8c00', '#ffa500', '#ffd700'];

export default function BudgetDashboard({ roadmap }: BudgetDashboardProps) {
  const phaseData = roadmap.phases.map(p => {
    const budget = p.budget || 0;
    const estimated = p.tasks.reduce((sum, t) => sum + (t.cost || 0), 0);
    const actual = p.tasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.cost || 0), 0);
    const variance = budget - estimated;
    const utilization = budget > 0 ? (actual / budget) * 100 : 0;

    return {
      name: p.title,
      budget,
      estimated,
      actual,
      variance,
      utilization
    };
  });

  const totalBudget = roadmap.totalBudget || 0;
  const totalEstimated = phaseData.reduce((sum, p) => sum + p.estimated, 0);
  const totalActual = phaseData.reduce((sum, p) => sum + p.actual, 0);
  const totalVariance = totalBudget - totalEstimated;
  const currency = roadmap.currency || 'USD';

  // Calculate cumulative spending over time for each phase and overall
  const allTasks = roadmap.phases.flatMap(p => p.tasks);
  const allDates = Array.from(new Set(allTasks.filter(t => t.startDate).map(t => t.startDate))).sort();
  
  let overallCumulative = 0;
  const phaseCumulatives: Record<string, number> = {};
  roadmap.phases.forEach(p => phaseCumulatives[p.title] = 0);

  const cumulativeData = allDates.map(dateStr => {
    const date = parseISO(dateStr);
    const isValidDate = !isNaN(date.getTime());
    const tasksOnDate = allTasks.filter(t => t.startDate === dateStr);
    
    const dayTotal = tasksOnDate.reduce((sum, t) => sum + (t.cost || 0), 0);
    overallCumulative += dayTotal;
    
    const dataPoint: any = {
      date: isValidDate ? format(date, 'MMM dd') : dateStr,
      fullDate: isValidDate ? format(date, 'MMMM dd, yyyy') : dateStr,
      overall: overallCumulative,
    };

    roadmap.phases.forEach(phase => {
      const phaseTasksOnDate = phase.tasks.filter(t => t.startDate === dateStr);
      const phaseDayTotal = phaseTasksOnDate.reduce((sum, t) => sum + (t.cost || 0), 0);
      phaseCumulatives[phase.title] += phaseDayTotal;
      dataPoint[phase.title] = phaseCumulatives[phase.title];
    });

    return dataPoint;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a1a] border border-white/20 p-4 rounded-xl shadow-2xl backdrop-blur-xl">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">{payload[0].payload.fullDate || label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-8 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                <span className="text-xs text-white/60">{entry.name}</span>
              </div>
              <span className="text-xs font-bold text-white">
                {entry.value.toLocaleString()} {currency}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 text-[#ff4e00] mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Total Budget</span>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white">
            {formatCurrencyRange(totalBudget, currency)}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Total Estimated</span>
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white">
            {formatCurrencyRange(totalEstimated, currency)}
          </div>
        </div>
        <div className={`bg-white/5 border ${totalActual > totalBudget && totalBudget > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-white/10'} rounded-3xl p-6`}>
          <div className={`flex items-center gap-3 ${totalActual > totalBudget && totalBudget > 0 ? 'text-red-500' : 'text-green-500'} mb-2`}>
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Total Actual</span>
            {totalActual > totalBudget && totalBudget > 0 && (
              <span title="Total actual cost exceeds total budget" className="ml-auto">
                <AlertTriangle className="w-4 h-4" />
              </span>
            )}
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white">
            {formatCurrencyRange(totalActual, currency)}
          </div>
        </div>
      </div>

      {/* Cumulative Spending Chart */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
        <div className="flex items-center gap-3 text-white/40 mb-8">
          <Activity className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Cumulative Spending Timeline</span>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value.toLocaleString()}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="overall" 
                name="Overall Cumulative"
                stroke="#ff4e00" 
                strokeWidth={4}
                dot={{ r: 4, fill: '#ff4e00', strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              {roadmap.phases.map((phase, idx) => (
                <Line 
                  key={phase.title}
                  type="monotone" 
                  dataKey={phase.title} 
                  name={phase.title}
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Phase Budget Comparison */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex items-center gap-3 text-white/40 mb-8">
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Planned vs. Estimated Cost per Phase</span>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value.toLocaleString()}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                <Bar dataKey="budget" name="Planned Budget" fill="#ff4e00" radius={[4, 4, 0, 0]} />
                <Bar dataKey="estimated" name="Estimated Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Allocation Pie */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex items-center gap-3 text-white/40 mb-8">
            <PieChartIcon className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Budget Allocation by Phase</span>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={phaseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="budget"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {phaseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Budget Summary Table */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 overflow-hidden">
        <div className="flex items-center gap-3 text-white/40 mb-8">
          <Activity className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Phase Financial Summary</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Phase</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-white/40 text-right">Planned Budget</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-white/40 text-right">Estimated Cost</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-white/40 text-right">Actual Spent</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-white/40 text-right">Variance</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-white/40 text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {phaseData.map((phase) => {
                const isOverBudget = phase.budget > 0 && phase.actual > phase.budget;
                return (
                <tr key={phase.name} className={`group hover:bg-white/5 transition-colors ${isOverBudget ? 'bg-red-500/5' : ''}`}>
                  <td className="py-4 text-sm font-medium text-white">
                    <div className="flex items-center gap-2">
                      {phase.name}
                      {isOverBudget && (
                        <span title="Actual cost exceeds planned budget">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-sm text-white/60 text-right">{formatCurrencyRange(phase.budget, currency)}</td>
                  <td className="py-4 text-sm text-white/60 text-right">{formatCurrencyRange(phase.estimated, currency)}</td>
                  <td className={`py-4 text-sm text-right ${isOverBudget ? 'text-red-500 font-bold' : 'text-white/60'}`}>{formatCurrencyRange(phase.actual, currency)}</td>
                  <td className={`py-4 text-sm text-right font-bold ${phase.variance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrencyRange(phase.variance, currency)}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${phase.utilization > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(phase.utilization, 100)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold ${isOverBudget ? 'text-red-500' : 'text-white/40'}`}>{phase.utilization.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              )})}
              <tr className="bg-white/5 font-bold">
                <td className="py-4 text-sm text-white">Total Project</td>
                <td className="py-4 text-sm text-white text-right">{formatCurrencyRange(totalBudget, currency)}</td>
                <td className="py-4 text-sm text-white text-right">{formatCurrencyRange(totalEstimated, currency)}</td>
                <td className="py-4 text-sm text-white text-right">{formatCurrencyRange(totalActual, currency)}</td>
                <td className={`py-4 text-sm text-right ${totalVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrencyRange(totalVariance, currency)}
                </td>
                <td className="py-4 text-right">
                  <span className="text-[10px] font-bold text-white/40">
                    {totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(0) : 0}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
