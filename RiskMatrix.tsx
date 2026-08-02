import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Shield, 
  AlertCircle,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Activity
} from 'lucide-react';
import { RoadmapResponse, Risk } from '../lib/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RiskMatrixProps {
  roadmap: RoadmapResponse;
}

const severityLevels = ['very-low', 'low', 'medium', 'high', 'very-high'];

const getSeverityScore = (level: string) => severityLevels.indexOf(level) + 1;

const getRiskColor = (impact: string, probability: string) => {
  const score = getSeverityScore(impact) * getSeverityScore(probability);
  if (score >= 16) return 'text-red-500 bg-red-500/10 border-red-500/20';
  if (score >= 9) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
  if (score >= 4) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
  return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
};

const getRiskHex = (impact: string, probability: string) => {
  const score = getSeverityScore(impact) * getSeverityScore(probability);
  if (score >= 16) return '#ef4444'; // red-500
  if (score >= 9) return '#f97316'; // orange-500
  if (score >= 4) return '#eab308'; // yellow-500
  return '#3b82f6'; // blue-500
};

export default function RiskMatrix({ roadmap }: RiskMatrixProps) {
  const [sortBy, setSortBy] = useState<'score' | 'impact' | 'probability'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const allRisks = roadmap.phases.flatMap((p, pIdx) => 
    p.risks.map(r => ({ ...r, phaseTitle: p.title, phaseIdx: pIdx }))
  );

  const sortedRisks = [...allRisks].sort((a, b) => {
    let valA: number;
    let valB: number;

    if (sortBy === 'score') {
      valA = getSeverityScore(a.impact) * getSeverityScore(a.probability);
      valB = getSeverityScore(b.impact) * getSeverityScore(b.probability);
    } else if (sortBy === 'impact') {
      valA = getSeverityScore(a.impact);
      valB = getSeverityScore(b.impact);
    } else { // probability
      valA = getSeverityScore(a.probability);
      valB = getSeverityScore(b.probability);
    }

    if (sortOrder === 'asc') {
      return valA - valB;
    } else {
      return valB - valA;
    }
  });

  const matrixData = Array.from({ length: 5 }, (_, i) => 
    Array.from({ length: 5 }, (_, j) => {
      const impact = severityLevels[4 - i]; // Y-axis: Impact (High to Low)
      const probability = severityLevels[j]; // X-axis: Probability (Low to High)
      return allRisks.filter(r => r.impact === impact && r.probability === probability);
    })
  );

  return (
    <div className="space-y-12 pb-20">
      {/* Risk Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Risks', value: allRisks.length, icon: AlertTriangle, color: 'text-white' },
          { label: 'Critical', value: allRisks.filter(r => getSeverityScore(r.impact) * getSeverityScore(r.probability) >= 16).length, icon: ShieldAlert, color: 'text-red-500' },
          { label: 'High Exposure', value: allRisks.filter(r => {
              const score = getSeverityScore(r.impact) * getSeverityScore(r.probability);
              return score >= 9 && score < 16;
            }).length, icon: AlertCircle, color: 'text-orange-500' },
          { label: 'Mitigated', value: 0, icon: ShieldCheck, color: 'text-green-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <div className={cn("flex items-center gap-3 mb-2", stat.color)}>
              <stat.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{stat.label}</span>
            </div>
            <div className="text-3xl font-black text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Risk Matrix Visual */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif italic text-white">Heat Map</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Critical</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /> High</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Medium</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Low</div>
            </div>
          </div>

          <div className="relative bg-white/5 border border-white/10 rounded-[40px] p-12 backdrop-blur-xl overflow-hidden">
            {/* Axis Labels */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 whitespace-nowrap">
              Impact Severity
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/20 whitespace-nowrap">
              Probability of Occurrence
            </div>

            <div className="grid grid-cols-5 gap-2 h-[400px]">
              {matrixData.map((row, i) => 
                row.map((cellRisks, j) => {
                  const impact = severityLevels[4 - i];
                  const probability = severityLevels[j];
                  const color = getRiskHex(impact, probability);
                  
                  return (
                    <div 
                      key={`${i}-${j}`}
                      className="relative rounded-xl border border-white/5 flex items-center justify-center transition-all hover:scale-[1.02] group"
                      style={{ 
                        backgroundColor: `${color}10`,
                        borderColor: cellRisks.length > 0 ? `${color}40` : undefined
                      }}
                    >
                      {cellRisks.length > 0 && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex flex-wrap justify-center gap-1 p-2"
                        >
                          {cellRisks.map((risk, idx) => (
                            <div 
                              key={idx}
                              className="w-3 h-3 rounded-full shadow-lg"
                              style={{ backgroundColor: color }}
                              title={risk.description}
                            />
                          ))}
                        </motion.div>
                      )}
                      
                      {/* Cell Tooltip on Hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex items-center justify-center z-10">
                         <div className="bg-black/90 border border-white/20 px-3 py-1.5 rounded-lg text-[9px] font-bold text-white uppercase tracking-wider whitespace-nowrap shadow-2xl">
                           {impact} / {probability}
                         </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Risk Registry List */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-serif italic text-white">Risk Registry</h3>
            <div className="flex items-center gap-2">
              <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                {(['score', 'impact', 'probability'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={cn(
                      "px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all",
                      sortBy === key ? "bg-[#ff4e00] text-black" : "text-white/40 hover:text-white"
                    )}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/40 hover:text-white transition-all"
                title={sortOrder === 'asc' ? "Sort Ascending" : "Sort Descending"}
              >
                {sortOrder === 'asc' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
            {sortedRisks.map((risk, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/[0.08] transition-all group"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    getRiskColor(risk.impact, risk.probability)
                  )}>
                    {risk.impact} Impact
                  </div>
                  <div className="text-[9px] font-mono text-white/20">
                    PHASE {risk.phaseIdx + 1}
                  </div>
                </div>
                
                <h4 className="text-sm font-bold text-white mb-2 group-hover:text-[#ff4e00] transition-colors">
                  {risk.description}
                </h4>
                
                <div className="space-y-3 mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-start gap-3">
                    <Shield className="w-3 h-3 text-[#ff4e00] mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#ff4e00] mb-1">Mitigation Strategy</p>
                      <p className="text-xs text-[#e0d8d0]/60 leading-relaxed italic">
                        {risk.mitigation}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-6">
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-bold text-white/20 tracking-tighter">Probability</span>
                    <span className="text-[10px] font-bold text-white/60">{risk.probability}</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-bold text-white/20 tracking-tighter">Category</span>
                    <span className="text-[10px] font-bold text-white/60 capitalize">{risk.category || 'General'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
