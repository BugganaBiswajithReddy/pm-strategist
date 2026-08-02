import React, { useEffect, useRef, useState } from 'react';
import { RoadmapResponse } from '../lib/gemini';
import * as d3 from 'd3';
import { Filter, X, ChevronDown } from 'lucide-react';

interface DependencyGraphProps {
  roadmap: RoadmapResponse;
}

interface Node {
  id: string;
  description: string;
  status: string;
  phase: string;
  owner: string;
  x: number;
  y: number;
  phaseIndex: number;
}

interface Link {
  source: Node;
  target: Node;
  sourceId: string;
  targetId: string;
}

export default function DependencyGraph({ roadmap }: DependencyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedPhase, setSelectedPhase] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);

  const phases = ['all', ...roadmap.phases.map(p => p.title)];
  const statuses = ['all', 'todo', 'in-progress', 'done'];

  useEffect(() => {
    if (!svgRef.current) return;

    // Filter raw tasks
    let rawNodes = roadmap.phases.flatMap((p, pIdx) =>
      p.tasks.map(t => ({
        id: t.id,
        description: t.description,
        status: t.status,
        phase: p.title,
        owner: t.owner,
        phaseIndex: pIdx,
        dependencies: t.dependencies || []
      }))
    );

    if (selectedPhase !== 'all') {
      rawNodes = rawNodes.filter(n => n.phase === selectedPhase);
    }
    if (selectedStatus !== 'all') {
      rawNodes = rawNodes.filter(n => n.status === selectedStatus);
    }

    // Build node map & compute static coordinates in structured DAG / Grid layout
    const phaseMap = new Map<string, typeof rawNodes>();
    rawNodes.forEach(n => {
      if (!phaseMap.has(n.phase)) {
        phaseMap.set(n.phase, []);
      }
      phaseMap.get(n.phase)!.push(n);
    });

    const activePhases = roadmap.phases.filter(p => phaseMap.has(p.title));
    const colWidth = 260;
    const rowHeight = 75;

    const nodes: Node[] = [];
    const nodeMap = new Map<string, Node>();

    activePhases.forEach((phase, colIdx) => {
      const phaseNodes = phaseMap.get(phase.title) || [];
      const startY = 100;

      phaseNodes.forEach((n, rowIdx) => {
        const x = colIdx * colWidth + 80;
        const y = startY + rowIdx * rowHeight;
        const nodeObj: Node = {
          id: n.id,
          description: n.description,
          status: n.status,
          phase: n.phase,
          owner: n.owner,
          x,
          y,
          phaseIndex: colIdx
        };
        nodes.push(nodeObj);
        nodeMap.set(n.id, nodeObj);
      });
    });

    // Build links between resolved nodes
    const links: Link[] = [];
    rawNodes.forEach(n => {
      const targetNode = nodeMap.get(n.id);
      if (!targetNode) return;
      n.dependencies.forEach(depId => {
        const sourceNode = nodeMap.get(depId);
        if (sourceNode) {
          links.push({
            source: sourceNode,
            target: targetNode,
            sourceId: sourceNode.id,
            targetId: targetNode.id
          });
        }
      });
    });

    // Auto-calculate bounding box to fit frame seamlessly without clipping
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    if (nodes.length === 0) {
      minX = 0; maxX = 800; minY = 0; maxY = 500;
    } else {
      nodes.forEach(n => {
        if (n.x - 30 < minX) minX = n.x - 30;
        if (n.x + 230 > maxX) maxX = n.x + 230; // space for text label
        if (n.y - 40 < minY) minY = n.y - 40;
        if (n.y + 50 > maxY) maxY = n.y + 50;
      });
    }

    const pad = 40;
    const vX = minX - pad;
    const vY = minY - pad;
    const vW = Math.max((maxX - minX) + pad * 2, 600);
    const vH = Math.max((maxY - minY) + pad * 2, 400);

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `${vX} ${vY} ${vW} ${vH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('width', '100%')
      .attr('height', '100%');

    svg.selectAll('*').remove();

    // Arrowhead marker definition
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead-static')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#ff4e00')
      .style('opacity', 0.8);

    // Phase Column Header Labels
    const headersG = svg.append('g').attr('class', 'phase-headers');
    activePhases.forEach((phase, colIdx) => {
      const x = colIdx * colWidth + 80;
      headersG.append('text')
        .attr('x', x)
        .attr('y', minY - 10)
        .attr('fill', '#ff4e00')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('text-transform', 'uppercase')
        .attr('letter-spacing', '0.1em')
        .attr('opacity', 0.8)
        .text(`Phase ${colIdx + 1}: ${phase.title.length > 20 ? phase.title.slice(0, 20) + '...' : phase.title}`);
    });

    // Helper functions for highlighting
    const isNodeHighlighted = (d: Node) => {
      if (!highlightedNodeId) return true;
      if (d.id === highlightedNodeId) return true;
      return links.some(l => 
        (l.source.id === highlightedNodeId && l.target.id === d.id) ||
        (l.target.id === highlightedNodeId && l.source.id === d.id)
      );
    };

    const isLinkHighlighted = (l: Link) => {
      if (!highlightedNodeId) return true;
      return l.source.id === highlightedNodeId || l.target.id === highlightedNodeId;
    };

    // Draw connecting bezier curves / arrows
    const linksG = svg.append('g').attr('class', 'links');
    linksG.selectAll('path')
      .data(links)
      .join('path')
      .attr('d', l => {
        const dx = l.target.x - l.source.x;
        if (Math.abs(dx) > 20) {
          const cx1 = l.source.x + dx * 0.5;
          const cy1 = l.source.y;
          const cx2 = l.source.x + dx * 0.5;
          const cy2 = l.target.y;
          return `M ${l.source.x} ${l.source.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${l.target.x} ${l.target.y}`;
        }
        return `M ${l.source.x} ${l.source.y} L ${l.target.x} ${l.target.y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#ff4e00')
      .attr('stroke-width', l => isLinkHighlighted(l) ? 2.5 : 1.5)
      .attr('stroke-opacity', l => isLinkHighlighted(l) ? 0.7 : 0.15)
      .attr('marker-end', 'url(#arrowhead-static)');

    // Draw static nodes
    const nodesG = svg.append('g').attr('class', 'nodes');
    const nodeGroup = nodesG.selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('cursor', 'pointer')
      .style('opacity', d => isNodeHighlighted(d) ? 1 : 0.15)
      .on('mouseover', (event, d) => {
        if (!tooltipRef.current) return;
        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style('opacity', 1)
          .html(`
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-4">
                <span class="text-[10px] font-mono text-[#ff4e00]">#${d.id.slice(-4)}</span>
                <span class="px-2 py-0.5 rounded bg-white/10 text-[9px] font-bold uppercase tracking-wider ${
                  d.status === 'done' ? 'text-emerald-400' : d.status === 'in-progress' ? 'text-[#ff4e00]' : 'text-blue-400'
                }">${d.status}</span>
              </div>
              <p class="text-sm font-semibold text-white">${d.description}</p>
              <div class="flex items-center justify-between pt-2 border-t border-white/10 text-[10px]">
                <span class="text-white/50 uppercase tracking-widest">${d.phase}</span>
                <span class="text-[#ff4e00] font-bold">${d.owner}</span>
              </div>
            </div>
          `);
      })
      .on('mousemove', (event) => {
        if (!tooltipRef.current) return;
        const [x, y] = d3.pointer(event, svgRef.current?.parentElement);
        d3.select(tooltipRef.current)
          .style('left', `${x + 20}px`)
          .style('top', `${y - 20}px`);
      })
      .on('mouseout', () => {
        if (!tooltipRef.current) return;
        d3.select(tooltipRef.current).style('opacity', 0);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        setHighlightedNodeId(prev => prev === d.id ? null : d.id);
      });

    // Node glow
    nodeGroup.append('circle')
      .attr('r', 12)
      .attr('fill', d => d.status === 'done' ? '#22c55e' : d.status === 'in-progress' ? '#ff4e00' : '#3b82f6')
      .attr('opacity', d => d.status === 'todo' ? 0.1 : 0.25)
      .attr('filter', 'blur(4px)');

    // Node core circle
    nodeGroup.append('circle')
      .attr('r', 8)
      .attr('fill', d => d.status === 'done' ? '#22c55e' : d.status === 'in-progress' ? '#ff4e00' : 'rgba(59,130,246,0.25)')
      .attr('stroke', d => d.status === 'todo' ? '#3b82f6' : '#ffffff')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.status === 'todo' ? '3,2' : 'none');

    // Node Text Labels
    const labelGroup = nodeGroup.append('g').attr('class', 'labels');

    labelGroup.append('text')
      .text(d => d.description.length > 24 ? d.description.slice(0, 24) + '...' : d.description)
      .attr('x', 16)
      .attr('y', 3)
      .attr('fill', '#ffffff')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('font-family', 'system-ui, sans-serif');

    labelGroup.append('text')
      .text(d => `${d.status.toUpperCase()} • ${d.owner}`)
      .attr('x', 16)
      .attr('y', 16)
      .attr('fill', d => d.status === 'done' ? '#4ade80' : d.status === 'in-progress' ? '#ff4e00' : '#60a5fa')
      .attr('font-size', '8.5px')
      .attr('font-weight', '700')
      .attr('letter-spacing', '0.04em');

  }, [roadmap, selectedPhase, selectedStatus, highlightedNodeId]);

  return (
    <div 
      className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 h-[700px] flex flex-col relative overflow-hidden"
      onClick={() => setHighlightedNodeId(null)}
    >
      {/* Tooltip */}
      <div 
        ref={tooltipRef}
        className="fixed pointer-events-none opacity-0 bg-[#0a0502]/95 backdrop-blur-xl border border-white/15 p-4 rounded-2xl shadow-2xl z-[100] min-w-[220px] transition-opacity duration-150"
      />

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#ff4e00]/10 border border-[#ff4e00]/20 rounded-xl">
            <Filter className="w-4 h-4 text-[#ff4e00]" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Dependency Network</h3>
            <p className="text-[11px] text-[#e0d8d0]/50 font-medium">Static DAG Layout & Sequential Task Links</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Phase Filter */}
          <div className="relative group">
            <select 
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-10 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:text-white hover:border-[#ff4e00]/50 transition-all focus:ring-0 cursor-pointer"
            >
              {phases.map(p => (
                <option key={p} value={p} className="bg-[#0a0502] text-white">{p === 'all' ? 'All Phases' : p}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative group">
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-10 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:text-white hover:border-[#ff4e00]/50 transition-all focus:ring-0 cursor-pointer"
            >
              {statuses.map(s => (
                <option key={s} value={s} className="bg-[#0a0502] text-white">{s === 'all' ? 'All Statuses' : s.replace('-', ' ')}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>

          {(selectedPhase !== 'all' || selectedStatus !== 'all') && (
            <button 
              onClick={() => {
                setSelectedPhase('all');
                setSelectedStatus('all');
              }}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-[#ff4e00] hover:border-[#ff4e00]/40 transition-all"
              title="Clear Filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="flex-1 min-h-0 relative w-full h-full">
        <svg ref={svgRef} className="w-full h-full block" />
        
        {/* Legend */}
        <div className="absolute bottom-2 right-2 p-3.5 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full border-[1.5px] border-dashed border-blue-500 bg-blue-500/20" />
            <span className="text-[9.5px] font-bold text-white/60 uppercase tracking-widest">Todo</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff4e00]" />
            <span className="text-[9.5px] font-bold text-white/60 uppercase tracking-widest">In Progress</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[9.5px] font-bold text-white/60 uppercase tracking-widest">Done</span>
          </div>
        </div>
      </div>
    </div>
  );
}
