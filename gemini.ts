import { GoogleGenAI, ThinkingLevel, Type, Modality } from "@google/genai";

let aiClientInstance: GoogleGenAI | null = null;
let aiInitializationPromise: Promise<GoogleGenAI> | null = null;

export async function getAIClient(): Promise<GoogleGenAI> {
  if (aiClientInstance) return aiClientInstance;
  
  if (aiInitializationPromise) return aiInitializationPromise;

  aiInitializationPromise = (async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.geminiKey) {
          aiClientInstance = new GoogleGenAI({ apiKey: data.geminiKey });
          return aiClientInstance;
        }
      }
    } catch (e) {
      console.warn("Could not fetch API key from server, falling back to build env", e);
    }
    
    // Fallback to build-time environment variable if server fetch fails
    const fallbackKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined);
    aiClientInstance = new GoogleGenAI({ apiKey: fallbackKey || "" });
    return aiClientInstance;
  })();

  return aiInitializationPromise;
}

// Helper for retrying API calls on transient errors
async function generateContentWithRetry(ai: GoogleGenAI, params: Parameters<GoogleGenAI['models']['generateContent']>[0]) {
  const modelsToTry = [params.model, "gemini-2.5-flash"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini API call failed (model: ${model}, attempt: ${attempt + 1}):`, err?.message || err);
        // Short pause before retrying
        await new Promise(r => setTimeout(r, 800));
      }
    }
  }
  throw lastError;
}

export interface Task {
  id: string;
  description: string;
  owner: string;
  deadline: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  estimation: {
    value: number;
    unit: string;
  };
  dependencies: string[]; // Array of task IDs
  startDate?: string; // ISO date string
  duration?: number; // estimated duration in days
  cost?: number; // estimated cost for this task
}

export interface Issue {
  id: string;
  taskId: string;
  taskDescription: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'resolved' | 'closed';
  reportedBy: string;
  createdAt: string;
}

export type RiskCategory = 'technical' | 'market' | 'operational' | 'financial' | 'legal' | 'other';
export type RiskLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

export interface Risk {
  id: string;
  description: string;
  mitigation: string;
  category: RiskCategory;
  impact: RiskLevel;
  probability: RiskLevel;
}

export interface MVPFeature {
  title: string;
  description: string;
}

export interface Milestone {
  name: string;
  targetDate: string;
  status: 'upcoming' | 'in-progress' | 'completed';
}

export interface RoadmapPhase {
  phase: string;
  title: string;
  goals: string[];
  tasks: Task[];
  features: string[];
  pmRationale: string;
  risks: Risk[];
  budget?: number; // estimated budget for this phase
  milestones: Milestone[];
}

export interface RoadmapResponse {
  projectName: string;
  summary: string;
  clientImpact: string;
  techStack: string[];
  timeToMVP: string;
  startingPoint: string;
  kickstartChecklist: string[];
  completedChecklist?: number[];
  mvpFeatures: MVPFeature[];
  phases: RoadmapPhase[];
  totalBudget?: number;
  currency?: string;
  milestones: Milestone[];
  issues?: Issue[];
}

export function normalizeDepartment(rawOwner: string): string {
  if (!rawOwner || !rawOwner.trim()) return 'Engineering';
  const owner = rawOwner.trim();
  const lower = owner.toLowerCase();

  if (/^(engineering|eng|qa|design|product|marketing|operations|sales|data|security|legal|hr|finance|infra|infrastructure)$/i.test(owner)) {
    if (lower === 'eng' || lower === 'engineering') return 'Engineering';
    if (lower === 'qa') return 'QA';
    if (lower === 'design') return 'Design';
    if (lower === 'product') return 'Product';
    if (lower === 'marketing') return 'Marketing';
    if (lower === 'operations') return 'Operations';
    if (lower === 'sales') return 'Sales';
    if (lower === 'data') return 'Data & Analytics';
    if (lower === 'security') return 'Security';
    if (lower === 'legal') return 'Legal';
    if (lower === 'hr') return 'HR';
    if (lower === 'finance') return 'Finance';
    if (lower === 'infra' || lower === 'infrastructure') return 'Infrastructure';
  }

  if (lower.includes('dev') || lower.includes('engineer') || lower.includes('frontend') || lower.includes('backend') || lower.includes('fullstack') || lower.includes('architect') || lower.includes('coder') || lower.includes('tech lead')) {
    if (lower.includes('qa') || lower.includes('test')) return 'QA';
    if (lower.includes('devops') || lower.includes('cloud') || lower.includes('sre') || lower.includes('infra')) return 'Infrastructure';
    return 'Engineering';
  }

  if (lower.includes('qa') || lower.includes('test') || lower.includes('quality')) return 'QA';
  if (lower.includes('design') || lower.includes('ux') || lower.includes('ui') || lower.includes('creative') || lower.includes('art')) return 'Design';
  if (lower.includes('product') || lower.includes('pm') || lower.includes('owner')) return 'Product';
  if (lower.includes('market') || lower.includes('copy') || lower.includes('content') || lower.includes('seo')) return 'Marketing';
  if (lower.includes('data') || lower.includes('analytics') || lower.includes('bi') || lower.includes('sql')) return 'Data & Analytics';
  if (lower.includes('ops') || lower.includes('operations') || lower.includes('scrum') || lower.includes('project manager')) return 'Operations';
  if (lower.includes('sec') || lower.includes('compliance')) return 'Security';
  if (lower.includes('sales') || lower.includes('account') || lower.includes('business dev')) return 'Sales';

  return owner;
}

export function normalizeRoadmapDepartments(roadmap: RoadmapResponse): RoadmapResponse {
  if (!roadmap || !roadmap.phases) return roadmap;
  roadmap.phases.forEach((phase) => {
    phase.tasks?.forEach((task) => {
      task.owner = normalizeDepartment(task.owner);
    });
  });
  return roadmap;
}

const roadmapSchema = {
  type: Type.OBJECT,
  properties: {
    projectName: { type: Type.STRING },
    summary: { type: Type.STRING },
    clientImpact: { type: Type.STRING, description: "How this project helps the clients and the value proposition" },
    techStack: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Proposed architecture and technology stack" },
    timeToMVP: { type: Type.STRING, description: "Estimated time range to show a basic solution/MVP (e.g., '10 - 20 Weeks' or '2 - 4 Months')" },
    startingPoint: { type: Type.STRING },
    kickstartChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
    mvpFeatures: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["title", "description"]
      } 
    },
    phases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          phase: { type: Type.STRING },
          title: { type: Type.STRING },
          goals: { type: Type.ARRAY, items: { type: Type.STRING } },
          tasks: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                description: { type: Type.STRING },
                owner: { type: Type.STRING, description: "Department name (e.g. Engineering, Design, QA, Product, Marketing, Operations)" },
                deadline: { type: Type.STRING, description: "Relative deadline (e.g., Week 1, Day 3)" },
                status: { type: Type.STRING, enum: ["todo", "in-progress", "done"] },
                priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
                estimation: { 
                  type: Type.OBJECT,
                  properties: {
                    value: { type: Type.NUMBER },
                    unit: { type: Type.STRING, description: "e.g., hours, points, days" }
                  },
                  required: ["value", "unit"]
                },
                dependencies: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs of tasks this task depends on" },
                startDate: { type: Type.STRING, description: "Estimated start date in YYYY-MM-DD format" },
                duration: { type: Type.NUMBER, description: "Estimated duration in days" },
                cost: { type: Type.NUMBER, description: "Estimated cost for this task" }
              },
              required: ["id", "description", "owner", "deadline", "status", "priority", "estimation", "dependencies", "startDate", "duration", "cost"]
            } 
          },
          features: { type: Type.ARRAY, items: { type: Type.STRING } },
          pmRationale: { type: Type.STRING },
          risks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                description: { type: Type.STRING },
                mitigation: { type: Type.STRING },
                category: { type: Type.STRING, enum: ["technical", "market", "operational", "financial", "legal", "other"] },
                impact: { type: Type.STRING, enum: ["very-low", "low", "medium", "high", "very-high"] },
                probability: { type: Type.STRING, enum: ["very-low", "low", "medium", "high", "very-high"] }
              },
              required: ["id", "description", "mitigation", "category", "impact", "probability"]
            }
          },
          budget: { type: Type.NUMBER, description: "Estimated budget for this phase" },
          milestones: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                targetDate: { type: Type.STRING, description: "Target date in YYYY-MM-DD format" },
                status: { type: Type.STRING, enum: ["upcoming", "in-progress", "completed"] }
              },
              required: ["name", "targetDate", "status"]
            }
          }
        },
        required: ["phase", "title", "goals", "tasks", "features", "pmRationale", "risks", "budget", "milestones"]
      }
    },
    totalBudget: { type: Type.NUMBER },
    currency: { type: Type.STRING, description: "Currency code (e.g., USD, EUR)" },
    milestones: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          targetDate: { type: Type.STRING, description: "Target date in YYYY-MM-DD format" },
          status: { type: Type.STRING, enum: ["upcoming", "in-progress", "completed"] }
        },
        required: ["name", "targetDate", "status"]
      },
      description: "Global milestones for the entire roadmap, including milestones from each phase."
    },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          taskId: { type: Type.STRING },
          taskDescription: { type: Type.STRING },
          description: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
          status: { type: Type.STRING, enum: ["open", "resolved", "closed"] },
          reportedBy: { type: Type.STRING },
          createdAt: { type: Type.STRING }
        },
        required: ["id", "taskId", "taskDescription", "description", "severity", "status", "reportedBy", "createdAt"]
      }
    }
  },
  required: ["projectName", "summary", "clientImpact", "techStack", "timeToMVP", "startingPoint", "kickstartChecklist", "mvpFeatures", "phases", "totalBudget", "currency", "milestones"]
};

export async function generateRoadmap(prompt: string): Promise<RoadmapResponse> {
  const ai = await getAIClient();
  const response = await generateContentWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: `Act as a world-class IT Consulting Firm Solution Architect and Product Manager. The user wants to build: "${prompt}". 
    Generate a highly sophisticated, iterative roadmap structured as a formal client pitch.
    
    CRITICAL: Be extremely concise and actionable. Avoid verbose explanations and fluff. Focus on direct strategic insights.
    
    ENHANCEMENTS:
    1. MARKET & CLIENT IMPACT: Briefly identify target personas and pain points. Provide a strong 'clientImpact' statement on business value.
    2. ARCHITECTURE: Define 'techStack' (array of strings).
    3. TIME TO MVP: Provide a clear 'timeToMVP' estimate range (e.g. '10 - 20 Weeks' or '2 - 4 Months').
    
    ESTIMATION PRINCIPLE: Ensure time and budget estimates represent realistic ranges (e.g., 10 - 20 days, $10,000 - $20,000) rather than fixed single values.
    4. STRATEGIC POSITIONING: Conduct a concise SWOT analysis.
    5. SUCCESS METRICS: List 3-5 high-impact KPIs.
    6. EXECUTION: Define 'startingPoint' and a 3-5 step 'kickstartChecklist'.
    7. MVP CORE: Granular list of non-negotiable features with 'title' and 'description'.
    8. ITERATIVE PHASES: 3-4 logical phases (MVP, V2, Scale).
    
    For each phase, provide:
    1. Title
    2. Strategic Goals
    3. Key Tasks (description, department name like 'Engineering', 'Design', 'QA', 'Product', 'Marketing', 'Operations' as task owner - DO NOT use individual job roles like 'Frontend Developer' or 'QA Engineer'), relative deadline, priority, estimation, dependencies, startDate, duration, cost).
    4. Specific Features
    5. PM Rationale (Direct and strategic).
    6. Potential Risks (2-3 specific risks with mitigation, category, impact, probability).
    7. Phase Budget
    8. Milestones (1-2 key milestones).
    
    Also provide 'totalBudget', 'currency', and global 'milestones'.
    
    Keep the summary strategically dense, punchy, and professional.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: roadmapSchema
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  return normalizeRoadmapDepartments(parsed);
}

export interface ChatResponse {
  message: string;
  updatedRoadmap?: RoadmapResponse;
}

export async function chatWithAssistant(
  message: string,
  history: { role: 'user' | 'assistant', content: string }[],
  currentRoadmap: RoadmapResponse | null
): Promise<ChatResponse> {
  const ai = await getAIClient();
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
  
  contents.push({ role: 'user', parts: [{ text: message }] });

  const systemInstruction = `You are a world-class IT Consulting Firm Solution Architect and Product Manager.
You help the user refine their roadmap, analyze risks, and brainstorm features.

CRITICAL: Be concise, direct, and actionable. Avoid verbose explanations. Focus on strategic insights. DO NOT repeat yourself or provide redundant information.
Task 'owner' fields MUST strictly be high-level department names (e.g., 'Engineering', 'Design', 'QA', 'Product', 'Marketing', 'Operations') and NOT specific individual roles like 'Frontend Developer' or 'QA Engineer'.

${currentRoadmap ? `Current Roadmap Context: ${JSON.stringify(currentRoadmap)}` : 'No roadmap generated yet.'}
If the user asks to modify the roadmap (add tasks, change phases, etc.) or generate a new one, you MUST return the fully updated roadmap JSON in the \`updatedRoadmap\` field. Otherwise, just answer their question in the \`message\` field.

CRITICAL REQUIREMENTS FOR ROADMAP JSON:
1. clientImpact: Direct value proposition.
2. techStack: Proposed architecture.
3. timeToMVP: Clear estimate.
Always populate these fields when updating the roadmap.`;

  const response = await generateContentWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: contents as any,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING, description: "Your conversational response to the user" },
          updatedRoadmap: roadmapSchema
        },
        required: ["message"]
      }
    }
  });

  const resData: ChatResponse = JSON.parse(response.text || "{}");
  if (resData.updatedRoadmap) {
    resData.updatedRoadmap = normalizeRoadmapDepartments(resData.updatedRoadmap);
  }
  return resData;
}

export async function regenerateWithScenario(
  adjustedRoadmap: RoadmapResponse,
  budgetMultiplier: number,
  timelineMultiplier: number
): Promise<RoadmapResponse> {
  const scenarioDescription = `
    SCENARIO CONSTRAINTS:
    - Target Budget: ${adjustedRoadmap.totalBudget} ${adjustedRoadmap.currency} (${budgetMultiplier}x of original)
    - Target Timeline: ${timelineMultiplier}x of original
    
    INSTRUCTIONS:
    The provided 'Current Roadmap' JSON already contains the accurately scaled mathematical budgets (costs) and durations for all tasks. 
    DO NOT change the numerical budget or duration values. Your job is ONLY to adjust the qualitative strategy, features, technologies, and descriptions to justify these new numbers.
    
    1. If Budget Multiplier < 1: Explain the leaner strategy, focus on essential features, open-source tech, and MVP functionality.
    2. If Budget Multiplier > 1: Explain the premium strategy, enterprise tech, scalable architecture, and comprehensive features.
    3. If Timeline Multiplier < 1: Explain the fast-tracked approach, parallelized execution, and aggressive scoping.
    4. If Timeline Multiplier > 1: Explain the thorough validation, deep testing, extended quality assurance, and unhurried execution.
    
    Maintain the existing numerical task budgets and durations exactly as provided in the JSON, but adjust the STRATEGY, TECH STACK, and TASKS descriptions.
  `;

  const ai = await getAIClient();
  const response = await generateContentWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: `Act as a world-class IT Consulting Firm Solution Architect and Product Manager. 
    Existing roadmap for: "${adjustedRoadmap.projectName}".
    
    Current Roadmap (With Pre-Calculated Budget Math): ${JSON.stringify(adjustedRoadmap)}
    
    ${scenarioDescription}
    
    CRITICAL: Be concise and actionable. Return ONLY the updated JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: roadmapSchema
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  return normalizeRoadmapDepartments(parsed);
}
