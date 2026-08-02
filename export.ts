import { RoadmapResponse } from './gemini';
import { formatCurrencyRange, formatEffortRange, formatTimeRange } from './formatters';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

export function downloadMarkdown(roadmap: RoadmapResponse) {
  let md = `# ${roadmap.projectName}\n\n`;
  md += `## Summary\n${roadmap.summary}\n\n`;
  md += `## Where to Begin\n${roadmap.startingPoint}\n\n`;
  if (roadmap.kickstartChecklist && roadmap.kickstartChecklist.length > 0) {
    md += `### Kickstart Checklist\n`;
    roadmap.kickstartChecklist.forEach(step => md += `- [ ] ${step}\n`);
    md += `\n`;
  }
  md += `## Core MVP Features\n`;
  roadmap.mvpFeatures.forEach(f => md += `- **${f.title}**: ${f.description}\n`);
  md += `\n---\n\n`;
  
  roadmap.phases.forEach((phase, idx) => {
    md += `### Phase ${idx + 1}: ${phase.title} (${phase.phase})\n`;
    md += `#### Strategic Goals\n`;
    phase.goals.forEach(g => md += `- ${g}\n`);
    md += `\n#### Included Features\n`;
    phase.features.forEach(f => md += `- ${f}\n`);
    md += `\n#### Key Tasks\n`;
    phase.tasks.forEach(t => {
      const statusIcon = t.status === 'done' ? '[x]' : '[ ]';
      md += `${statusIcon} **${t.description}**\n`;
      md += `   - Owner: ${t.owner}\n`;
      md += `   - Deadline: ${formatTimeRange(t.deadline)}\n`;
      md += `   - Estimation: ${formatEffortRange(t.estimation?.value, t.estimation?.unit)}\n`;
      if (t.cost) md += `   - Cost: ${formatCurrencyRange(t.cost, roadmap.currency)}\n`;
      md += `   - Status: ${t.status}\n\n`;
    });
    md += `\n#### PM Rationale\n${phase.pmRationale}\n\n`;
    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${roadmap.projectName.replace(/\s+/g, '_')}_Roadmap.md`);
}

export async function downloadPDF(roadmap: RoadmapResponse) {
  if (!roadmap) return;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const marginTop = 15;
  const marginBottom = 18;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = marginTop;

  // Helper function to check vertical space and add new page if needed
  const checkSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - marginBottom) {
      pdf.addPage();
      y = marginTop;
      return true;
    }
    return false;
  };

  // Helper to draw horizontal divider line
  const drawDivider = () => {
    checkSpace(6);
    pdf.setDrawColor(226, 232, 240); // slate 200
    pdf.setLineWidth(0.3);
    pdf.line(marginLeft, y, pageWidth - marginRight, y);
    y += 6;
  };

  // 1. Document Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(15, 23, 42); // slate 900
  pdf.text(roadmap.projectName, marginLeft, y);
  y += 7;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(234, 88, 12); // orange accent
  pdf.text('PROJECT TASK CHECKLIST & IMPLEMENTATION REPORT', marginLeft, y);
  y += 6;

  // Metadata summary card
  pdf.setFillColor(248, 250, 252); // slate 50
  pdf.setDrawColor(226, 232, 240); // slate 200
  pdf.setLineWidth(0.3);
  pdf.roundedRect(marginLeft, y, contentWidth, 18, 2, 2, 'FD');

  // Stats calculation
  let totalTasks = 0;
  let doneTasks = 0;
  roadmap.phases?.forEach((p) => {
    p.tasks?.forEach((t) => {
      totalTasks++;
      if (t.status === 'done') doneTasks++;
    });
  });
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(51, 65, 85);
  pdf.text(`Estimated Timeline: ${roadmap.timeToMVP || 'N/A'}`, marginLeft + 5, y + 6);
  pdf.text(`Task Progress: ${doneTasks}/${totalTasks} (${progressPercent}%)`, marginLeft + 65, y + 6);
  pdf.text(`Date Exported: ${new Date().toLocaleDateString()}`, marginLeft + 125, y + 6);

  if (roadmap.currency && roadmap.phases?.some(p => p.budget)) {
    const totalBudget = roadmap.phases.reduce((sum, p) => sum + (p.budget || 0), 0);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Estimated Budget: ${totalBudget.toLocaleString()} ${roadmap.currency}`, marginLeft + 5, y + 13);
  } else {
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Status: Active Strategy`, marginLeft + 5, y + 13);
  }

  y += 24;

  // 2. Executive Summary
  checkSpace(15);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('1. EXECUTIVE SUMMARY & STARTING POINT', marginLeft, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(51, 65, 85);
  const summaryLines = pdf.splitTextToSize(roadmap.summary || '', contentWidth);
  summaryLines.forEach((line: string) => {
    checkSpace(4.5);
    pdf.text(line, marginLeft, y);
    y += 4.5;
  });
  y += 2;

  // Starting point
  if (roadmap.startingPoint) {
    checkSpace(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Recommended Starting Point:', marginLeft, y);
    y += 4.5;

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    const startLines = pdf.splitTextToSize(roadmap.startingPoint, contentWidth - 4);
    startLines.forEach((line: string) => {
      checkSpace(4.5);
      pdf.text(line, marginLeft + 2, y);
      y += 4.5;
    });
    y += 3;
  }

  // Kickstart Checklist
  if (roadmap.kickstartChecklist && roadmap.kickstartChecklist.length > 0) {
    checkSpace(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Kickstart Action Items:', marginLeft, y);
    y += 5;

    roadmap.kickstartChecklist.forEach((item) => {
      checkSpace(6);
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.4);
      pdf.rect(marginLeft, y - 3, 3.5, 3.5, 'S');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(51, 65, 85);
      const lines = pdf.splitTextToSize(item, contentWidth - 8);
      lines.forEach((l: string, idx: number) => {
        if (idx > 0) checkSpace(4.5);
        pdf.text(l, marginLeft + 6, idx === 0 ? y : y + idx * 4.5);
      });
      y += lines.length * 4.5 + 2;
    });
    y += 2;
  }

  drawDivider();

  // 3. Core MVP Features
  if (roadmap.mvpFeatures && roadmap.mvpFeatures.length > 0) {
    checkSpace(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text('2. CORE MVP FEATURES', marginLeft, y);
    y += 6;

    roadmap.mvpFeatures.forEach((feat) => {
      checkSpace(10);
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.4);
      pdf.rect(marginLeft, y - 3, 3.5, 3.5, 'S');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(feat.title, marginLeft + 6, y);
      y += 4.5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      const descLines = pdf.splitTextToSize(feat.description, contentWidth - 6);
      descLines.forEach((line: string) => {
        checkSpace(4.5);
        pdf.text(line, marginLeft + 6, y);
        y += 4.5;
      });
      y += 3;
    });

    drawDivider();
  }

  // 4. Phase-by-Phase Tasks Checklist
  checkSpace(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('3. PHASES & TASK EXECUTION CHECKLIST', marginLeft, y);
  y += 7;

  roadmap.phases?.forEach((phase, phaseIdx) => {
    checkSpace(16);

    // Phase header box
    pdf.setFillColor(241, 245, 249); // slate 100
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(marginLeft, y, contentWidth, 10, 1.5, 1.5, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`Phase ${phaseIdx + 1}: ${phase.title} (${phase.phase})`, marginLeft + 4, y + 6.5);

    if (phase.budget) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Budget: ${phase.budget.toLocaleString()} ${roadmap.currency || 'USD'}`, pageWidth - marginRight - 4, y + 6.5, { align: 'right' });
    }

    y += 14;

    // Goals summary line
    if (phase.goals && phase.goals.length > 0) {
      checkSpace(6);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Strategic Goals: ' + phase.goals.join(' • '), marginLeft + 2, y);
      y += 6;
    }

    // Tasks list
    phase.tasks?.forEach((task) => {
      const descLines = pdf.splitTextToSize(task.description, contentWidth - 10);
      const neededH = descLines.length * 4.5 + 8;
      checkSpace(neededH);

      const boxY = y - 3;
      if (task.status === 'done') {
        // Green box with white checkmark
        pdf.setFillColor(16, 185, 129);
        pdf.setDrawColor(16, 185, 129);
        pdf.rect(marginLeft, boxY, 4, 4, 'FD');

        pdf.setDrawColor(255, 255, 255);
        pdf.setLineWidth(0.5);
        pdf.line(marginLeft + 0.8, boxY + 2, marginLeft + 1.6, boxY + 3.1);
        pdf.line(marginLeft + 1.6, boxY + 3.1, marginLeft + 3.2, boxY + 0.9);
      } else if (task.status === 'in-progress') {
        // Orange outline with center dot
        pdf.setDrawColor(234, 88, 12);
        pdf.setLineWidth(0.4);
        pdf.rect(marginLeft, boxY, 4, 4, 'S');

        pdf.setFillColor(234, 88, 12);
        pdf.circle(marginLeft + 2, boxY + 2, 0.9, 'F');
      } else {
        // Empty square
        pdf.setDrawColor(148, 163, 184);
        pdf.setLineWidth(0.4);
        pdf.rect(marginLeft, boxY, 4, 4, 'S');
      }

      // Task Description
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(15, 23, 42);
      descLines.forEach((line: string, idx: number) => {
        if (idx > 0) checkSpace(4.5);
        pdf.text(line, marginLeft + 7, idx === 0 ? y : y + idx * 4.5);
      });

      y += descLines.length * 4.5 + 1;

      // Task Details line
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);

      const priorityText = `Priority: ${task.priority.toUpperCase()}`;
      const statusText = `Status: ${task.status.toUpperCase()}`;
      const ownerText = `Dept: ${task.owner || 'Unassigned'}`;
      const estText = `Effort: ${task.estimation?.value || 0}${task.estimation?.unit || 'h'}`;
      const deadlineText = `Deadline: ${task.deadline}`;

      pdf.text(`[${task.id.slice(-4)}] ${ownerText}  |  ${deadlineText}  |  ${estText}  |  ${priorityText}  |  ${statusText}`, marginLeft + 7, y);

      y += 6;
    });

    y += 3;
  });

  drawDivider();

  // 5. Department Workload Allocation
  checkSpace(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('4. DEPARTMENT WORKLOAD ALLOCATION', marginLeft, y);
  y += 7;

  const deptMap: Record<string, { totalTasks: number; doneTasks: number; totalHours: number }> = {};
  roadmap.phases?.forEach(phase => {
    phase.tasks?.forEach(task => {
      const dept = task.owner?.trim() || 'Unassigned / General';
      if (!deptMap[dept]) {
        deptMap[dept] = { totalTasks: 0, doneTasks: 0, totalHours: 0 };
      }
      deptMap[dept].totalTasks += 1;
      if (task.status === 'done') deptMap[dept].doneTasks += 1;
      deptMap[dept].totalHours += (task.estimation?.value || 0);
    });
  });

  Object.entries(deptMap).forEach(([deptName, stats]) => {
    checkSpace(10);
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(marginLeft, y - 2, contentWidth, 8.5, 1, 1, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`Department: ${deptName}`, marginLeft + 4, y + 3.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      `Tasks: ${stats.doneTasks}/${stats.totalTasks} Done  |  Total Effort: ${stats.totalHours} hrs`,
      pageWidth - marginRight - 4,
      y + 3.5,
      { align: 'right' }
    );

    y += 10.5;
  });

  drawDivider();

  // 6. Project Risks & Mitigation Strategy
  checkSpace(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('5. STRATEGIC RISKS & MITIGATION MATRIX', marginLeft, y);
  y += 7;

  interface FlattenedRisk {
    phaseTitle: string;
    description: string;
    mitigation: string;
    category: string;
    impact: string;
    probability: string;
  }

  const allRisks: FlattenedRisk[] = [];
  roadmap.phases?.forEach((phase) => {
    phase.risks?.forEach((risk) => {
      allRisks.push({
        phaseTitle: phase.title,
        description: risk.description,
        mitigation: risk.mitigation,
        category: risk.category || 'General',
        impact: risk.impact || 'medium',
        probability: risk.probability || 'medium',
      });
    });
  });

  if (allRisks.length === 0) {
    checkSpace(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text('No explicit critical risks documented for this project.', marginLeft, y);
    y += 6;
  } else {
    allRisks.forEach((risk) => {
      const descLines = pdf.splitTextToSize(`Risk: ${risk.description}`, contentWidth - 8);
      const mitLines = pdf.splitTextToSize(`Mitigation: ${risk.mitigation}`, contentWidth - 8);
      const neededHeight = (descLines.length + mitLines.length) * 4.5 + 9;

      checkSpace(neededHeight);

      // Risk card box
      pdf.setFillColor(254, 242, 242); // subtle light red background
      pdf.setDrawColor(252, 165, 165); // light red border
      pdf.setLineWidth(0.3);
      pdf.roundedRect(marginLeft, y - 2, contentWidth, neededHeight - 2, 1.5, 1.5, 'FD');

      // Risk header tag
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(185, 28, 28);
      pdf.text(
        `[${risk.category.toUpperCase()}] Impact: ${risk.impact.toUpperCase()} | Probability: ${risk.probability.toUpperCase()} (${risk.phaseTitle})`,
        marginLeft + 4,
        y + 2.5
      );

      let currentY = y + 7;

      // Risk description text
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(30, 41, 59);
      descLines.forEach((line: string) => {
        pdf.text(line, marginLeft + 4, currentY);
        currentY += 4.5;
      });

      // Mitigation strategy text
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(51, 65, 85);
      mitLines.forEach((line: string) => {
        pdf.text(line, marginLeft + 4, currentY);
        currentY += 4.5;
      });

      y += neededHeight + 3;
    });
  }

  // 5. Add Footers and Page Numbers across all pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `${roadmap.projectName} — Implementation Task Checklist Report`,
      marginLeft,
      pageHeight - 6
    );
    pdf.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - marginRight,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  // Save PDF
  pdf.save(`${roadmap.projectName.replace(/\s+/g, '_')}_Checklist.pdf`);
}

