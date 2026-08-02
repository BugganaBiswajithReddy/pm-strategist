/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Square, 
  Loader2, 
  ChevronRight, 
  ChevronDown,
  Target, 
  ClipboardList, 
  Lightbulb,
  History,
  MessageSquare,
  Download,
  FileText,
  User,
  Calendar,
  CheckCircle2,
  Check,
  Circle,
  Clock,
  AlertCircle,
  Timer,
  ShieldAlert,
  LayoutGrid,
  List,
  Link2,
  Menu,
  X,
  LogOut,
  Send,
  BarChart3,
  Map,
  Trash2,
  AlertTriangle,
  GanttChart as GanttChartIcon,
  Network,
  DollarSign,
  Upload,
  Share2,
  Users,
  MousePointer2,
  Flag,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { io } from 'socket.io-client';
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
  Line
} from 'recharts';
import * as d3 from 'd3';
import { generateRoadmap, chatWithAssistant, regenerateWithScenario, RoadmapResponse, Task, Risk, Milestone, Issue, normalizeRoadmapDepartments, normalizeDepartment } from './lib/gemini';
import { downloadMarkdown, downloadPDF } from './lib/export';
import { formatCurrencyRange, formatTimeRange, formatEffortRange, formatDurationRange } from './lib/formatters';
import GanttChart from './components/GanttChart';
import BudgetDashboard from './components/BudgetDashboard';
import DependencyGraph from './components/DependencyGraph';
import RiskMatrix from './components/RiskMatrix';
import KanbanBoard from './components/KanbanBoard';
import TaskModal from './components/TaskModal';
import IssueModal from './components/IssueModal';
import IssuesView from './components/IssuesView';
import ChatSidebar from './components/ChatSidebar';
import ResourceWorkload from './components/ResourceWorkload';
import ProgressBreakdownView from './components/ProgressBreakdownView';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  signInAnonymously,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp, 
  getDocFromServer, 
  doc,
  setDoc,
  deleteDoc 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Check if Firebase is properly configured with non-placeholder credentials
const isFirebaseConfigured = Boolean(
  firebaseConfig &&
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('remixed-') &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes('remixed-')
);

// Initialize Firebase safely
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = (app && firebaseConfig.firestoreDatabaseId) 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : (app ? getFirestore(app) : null);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0502] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-[#e0d8d0]/60 mb-6">
              {this.state.error?.message?.includes('{') 
                ? "A database error occurred. Please check your permissions." 
                : "An unexpected error occurred."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#ff4e00] text-white rounded-full text-sm font-bold hover:bg-[#ff6321] transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  roadmap?: RoadmapResponse;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [history, setHistory] = useState<(RoadmapResponse & { docId: string, createdAt: any })[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRegeneratingScenario, setIsRegeneratingScenario] = useState(false);

  const [textInput, setTextInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentRoadmap, setCurrentRoadmap] = useState<RoadmapResponse | null>(null);
  const [viewMode, setViewMode] = useState<'roadmap' | 'kanban' | 'resource' | 'issues' | 'gantt' | 'budget' | 'graph' | 'risks' | 'progress'>('roadmap');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showStatusGraph, setShowStatusGraph] = useState(true);
  const [fullScreenView, setFullScreenView] = useState<'gantt' | 'budget' | 'graph' | 'risks' | null>(null);
  
  // Task Management State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState<number | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(null);
  const [isNewTask, setIsNewTask] = useState(false);

  // Issue Management State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  // Scenario Planning State
  const [budgetMultiplier, setBudgetMultiplier] = useState(1);
  const [timelineMultiplier, setTimelineMultiplier] = useState(1);

  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number, y: number, userName: string }>>({});
  const socketRef = useRef<any>(null);

  const reverseAdjustments = (roadmap: RoadmapResponse): RoadmapResponse => {
    if (budgetMultiplier === 1 && timelineMultiplier === 1) return roadmap;
    
    const reversed = JSON.parse(JSON.stringify(roadmap)) as RoadmapResponse;
    reversed.phases.forEach(phase => {
      if (phase.budget) phase.budget /= budgetMultiplier;
      phase.tasks.forEach(task => {
        if (task.cost) task.cost /= budgetMultiplier;
        if (task.duration) task.duration /= timelineMultiplier;
        if (task.estimation?.value) {
          task.estimation.value /= timelineMultiplier;
        }
      });
    });
    
    if (reversed.totalBudget) reversed.totalBudget /= budgetMultiplier;
    return reversed;
  };

  const handleUpdateRoadmap = async (updatedRoadmap: RoadmapResponse, isAdjusted: boolean = false) => {
    const baseRoadmap = isAdjusted ? reverseAdjustments(updatedRoadmap) : updatedRoadmap;
    setCurrentRoadmap(baseRoadmap);
    broadcastUpdate(baseRoadmap);
    
    if (user && currentDocId) {
      try {
        await setDoc(doc(db, 'roadmaps', currentDocId), {
          ...baseRoadmap,
          updatedAt: Timestamp.now()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `roadmaps/${currentDocId}`);
      }
    }
  };

  const reverseTaskAdjustments = (task: Task): Task => {
    if (budgetMultiplier === 1 && timelineMultiplier === 1) return task;
    const reversed = { ...task };
    if (reversed.cost) reversed.cost /= budgetMultiplier;
    if (reversed.duration) reversed.duration /= timelineMultiplier;
    if (reversed.estimation?.value) {
      reversed.estimation = {
        ...reversed.estimation,
        value: reversed.estimation.value / timelineMultiplier
      };
    }
    return reversed;
  };

  const handleUpdateTask = (phaseIndex: number, taskIndex: number, updatedTask: Task) => {
    if (!currentRoadmap) return;
    const newRoadmap = { ...currentRoadmap };
    // updatedTask is adjusted from UI, reverse it before saving to base
    newRoadmap.phases[phaseIndex].tasks[taskIndex] = reverseTaskAdjustments(updatedTask);
    handleUpdateRoadmap(newRoadmap);
  };

  const handleAddTask = (phaseIndex: number) => {
    setSelectedPhaseIndex(phaseIndex);
    setIsNewTask(true);
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };

  const handleSaveNewTask = (newTask: Task) => {
    if (!currentRoadmap || selectedPhaseIndex === null) return;
    const newRoadmap = { ...currentRoadmap };
    newRoadmap.phases[selectedPhaseIndex].tasks.push(newTask);
    handleUpdateRoadmap(newRoadmap);
  };

  const handleDeleteTask = (phaseIndex: number, taskIndex: number) => {
    if (!currentRoadmap) return;
    const newRoadmap = { ...currentRoadmap };
    newRoadmap.phases[phaseIndex].tasks.splice(taskIndex, 1);
    handleUpdateRoadmap(newRoadmap);
  };

  const handleRaiseIssue = (newIssue: Issue) => {
    if (!currentRoadmap) return;
    const newRoadmap = { ...currentRoadmap };
    if (!newRoadmap.issues) newRoadmap.issues = [];
    newRoadmap.issues.push(newIssue);
    handleUpdateRoadmap(newRoadmap);
  };

  const handleUpdateIssue = (issueId: string, updatedFields: Partial<Issue>) => {
    if (!currentRoadmap || !currentRoadmap.issues) return;
    const newRoadmap = { ...currentRoadmap };
    newRoadmap.issues = newRoadmap.issues.map(issue => 
      issue.id === issueId ? { ...issue, ...updatedFields } : issue
    );
    handleUpdateRoadmap(newRoadmap);
  };

  const handleDeleteIssue = (issueId: string) => {
    if (!currentRoadmap || !currentRoadmap.issues) return;
    const newRoadmap = { ...currentRoadmap };
    newRoadmap.issues = newRoadmap.issues.filter(issue => issue.id !== issueId);
    handleUpdateRoadmap(newRoadmap);
  };

  // Scenario Planning Logic
  const adjustedRoadmap = useMemo(() => {
    if (!currentRoadmap) return null;
    
    const adjusted = JSON.parse(JSON.stringify(currentRoadmap)) as RoadmapResponse;
    
    adjusted.phases.forEach(phase => {
      if (phase.budget) phase.budget *= budgetMultiplier;
      phase.tasks.forEach(task => {
        if (task.cost) task.cost *= budgetMultiplier;
        if (task.duration) task.duration *= timelineMultiplier;
        if (task.estimation?.value) task.estimation.value *= timelineMultiplier;
        
        // Adjust startDate if it exists
        if (task.startDate && timelineMultiplier !== 1) {
          const start = new Date(task.startDate);
          if (!isNaN(start.getTime())) {
            const today = new Date();
            const diffTime = start.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const adjustedDiffDays = diffDays * timelineMultiplier;
            const adjustedStart = new Date(today);
            adjustedStart.setDate(today.getDate() + adjustedDiffDays);
            task.startDate = adjustedStart.toISOString().split('T')[0];
          }
        }
      });
    });

    if (adjusted.totalBudget) adjusted.totalBudget *= budgetMultiplier;
    
    return adjusted;
  }, [currentRoadmap, budgetMultiplier, timelineMultiplier]);

  const rawDisplayRoadmap = adjustedRoadmap || currentRoadmap;
  const displayRoadmap = useMemo(() => {
    if (!rawDisplayRoadmap) return null;
    return normalizeRoadmapDepartments(JSON.parse(JSON.stringify(rawDisplayRoadmap)));
  }, [rawDisplayRoadmap]);

  const handleRegenerateScenario = async () => {
    if (!currentRoadmap || isRegeneratingScenario) return;
    
    setIsRegeneratingScenario(true);
    try {
      // Pass the mathematically adjusted roadmap so Gemini sees the new target numbers
      const updatedRoadmap = await regenerateWithScenario(adjustedRoadmap || currentRoadmap, budgetMultiplier, timelineMultiplier);
      
      // Reset multipliers since the new roadmap is already generated with these constraints
      setBudgetMultiplier(1);
      setTimelineMultiplier(1);
      
      handleUpdateRoadmap(updatedRoadmap);
      
      if (user && currentDocId) {
        saveRoadmapToHistory(updatedRoadmap, currentDocId);
      }
      
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: `I've re-generated the roadmap to reflect your scenario constraints (Budget: ${budgetMultiplier}x, Timeline: ${timelineMultiplier}x). The strategy and tasks have been structurally adjusted.` 
      }]);
    } catch (error: any) {
      console.error("Failed to regenerate scenario:", error);
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429;
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: isQuotaError 
          ? "I'm currently experiencing high traffic and have hit my API rate limit. Please wait a moment and try adjusting the sliders again."
          : "I encountered an error while re-generating the roadmap for your scenario. Please try again." 
      }]);
    } finally {
      setIsRegeneratingScenario(false);
    }
  };

  // Socket.io initialization
  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on('roadmap-updated', (updatedRoadmap: RoadmapResponse) => {
      setCurrentRoadmap(updatedRoadmap);
    });

    socketRef.current.on('cursor-moved', (data: { userId: string, userName: string, x: number, y: number }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [data.userId]: { x: data.x, y: data.y, userName: data.userName }
      }));
    });

    socketRef.current.on('user-left', (userId: string) => {
      setRemoteCursors(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Join roadmap room when currentDocId changes
  useEffect(() => {
    if (currentDocId && socketRef.current) {
      socketRef.current.emit('join-roadmap', currentDocId);
    }
  }, [currentDocId]);

  // Broadcast updates
  const broadcastUpdate = (roadmap: RoadmapResponse) => {
    if (currentDocId && socketRef.current) {
      socketRef.current.emit('roadmap-update', { roadmapId: currentDocId, roadmap });
    }
  };

  // Track cursor
  const handleMouseMove = (e: React.MouseEvent) => {
    if (currentDocId && socketRef.current && user) {
      socketRef.current.emit('cursor-move', {
        roadmapId: currentDocId,
        userName: user.displayName || 'Anonymous',
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      });
    }
  };
  
  const updateTask = (phaseIdx: number, taskId: string, updates: Partial<Task>) => {
    if (!currentRoadmap) return;
    
    // Reverse scenario planning multipliers for the updates
    const adjustedUpdates = { ...updates };
    if (adjustedUpdates.cost !== undefined) {
      adjustedUpdates.cost = adjustedUpdates.cost / budgetMultiplier;
    }
    if (adjustedUpdates.duration !== undefined) {
      adjustedUpdates.duration = adjustedUpdates.duration / timelineMultiplier;
    }
    if (adjustedUpdates.estimation?.value !== undefined) {
      adjustedUpdates.estimation = {
        ...adjustedUpdates.estimation,
        value: adjustedUpdates.estimation.value / timelineMultiplier
      };
    }

    const newRoadmap = {
      ...currentRoadmap,
      phases: currentRoadmap.phases.map((phase, pIdx) => {
        if (pIdx !== phaseIdx) return phase;
        return {
          ...phase,
          tasks: phase.tasks.map(task => 
            task.id === taskId ? { ...task, ...adjustedUpdates } : task
          )
        };
      })
    };
    
    handleUpdateRoadmap(newRoadmap);
  };

  const updateRisk = (phaseIdx: number, riskId: string, updates: Partial<Risk>) => {
    if (!currentRoadmap) return;
    
    const newRoadmap = {
      ...currentRoadmap,
      phases: currentRoadmap.phases.map((phase, pIdx) => {
        if (pIdx !== phaseIdx) return phase;
        return {
          ...phase,
          risks: phase.risks.map(risk => 
            risk.id === riskId ? { ...risk, ...updates } : risk
          )
        };
      })
    };
    
    setCurrentRoadmap(newRoadmap);
    broadcastUpdate(newRoadmap);
  };

  const updateMilestone = (phaseIdx: number, milestoneName: string, updates: Partial<Milestone>) => {
    if (!currentRoadmap) return;
    
    const newRoadmap = {
      ...currentRoadmap,
      phases: currentRoadmap.phases.map((phase, pIdx) => {
        if (pIdx !== phaseIdx) return phase;
        return {
          ...phase,
          milestones: phase.milestones?.map(m => 
            m.name === milestoneName ? { ...m, ...updates } : m
          ) || []
        };
      })
    };
    
    setCurrentRoadmap(newRoadmap);
    broadcastUpdate(newRoadmap);
  };

  const handleDragStart = (e: React.DragEvent, pIdx: number, taskId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ pIdx, taskId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const { pIdx, taskId } = JSON.parse(data);
        updateTask(pIdx, taskId, { status: newStatus });
      }
    } catch (err) {
      console.error('Failed to parse drag data', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const calculateProgress = (tasks: Task[]) => {
    if (tasks.length === 0) return 0;
    
    const totalEffort = tasks.reduce((sum, t) => sum + (t.estimation?.value || 0), 0);
    const completedEffort = tasks
      .filter(t => t.status === 'done')
      .reduce((sum, t) => sum + (t.estimation?.value || 0), 0);
      
    if (totalEffort === 0) return 0;
    return Math.round((completedEffort / totalEffort) * 100);
  };

  const overallProgress = displayRoadmap 
    ? calculateProgress(displayRoadmap.phases.flatMap(p => p.tasks))
    : 0;

  // Firebase Auth & History
  useEffect(() => {
    if (!auth) {
      setIsAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.warn("Anonymous auth fallback notice:", err);
          setUser(null);
          setIsAuthReady(true);
        }
      } else {
        setUser(user);
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'roadmaps'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roadmaps = snapshot.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      })) as any;
      setHistory(roadmaps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'roadmaps');
    });

    return () => unsubscribe();
  }, [user]);

  // Test connection
  useEffect(() => {
    async function testConnection() {
      if (!db || !isFirebaseConfigured) return;
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        console.warn("Firestore connection notice:", error);
      }
    }
    testConnection();
  }, []);

  const toggleChecklistItem = async (index: number) => {
    if (!currentRoadmap) return;
    
    const updatedChecklist = currentRoadmap.completedChecklist || [];
    const newChecklist = updatedChecklist.includes(index) 
      ? updatedChecklist.filter(i => i !== index)
      : [...updatedChecklist, index];
      
    const updatedRoadmap = { ...currentRoadmap, completedChecklist: newChecklist };
    setCurrentRoadmap(updatedRoadmap);
    if (currentDocId) {
      await saveRoadmapToHistory(updatedRoadmap, currentDocId);
    }
  };

  const saveRoadmapToHistory = async (roadmap: RoadmapResponse, docId?: string) => {
    if (!user || !db) return;
    try {
      if (docId) {
        await setDoc(doc(db, 'roadmaps', docId), {
          ...roadmap,
          uid: user.uid,
          updatedAt: Timestamp.now()
        }, { merge: true });
      } else {
        const docRef = await addDoc(collection(db, 'roadmaps'), {
          ...roadmap,
          uid: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        setCurrentDocId(docRef.id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'roadmaps');
    }
  };

  const deleteRoadmap = async (docId: string) => {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, 'roadmaps', docId));
      if (currentDocId === docId) {
        setCurrentDocId(null);
        setCurrentRoadmap(null);
        setChatHistory([]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'roadmaps');
    }
  };

  const login = async () => {
    if (!auth) {
      alert("Firebase configuration is pending. Authentication will be enabled once Firebase project credentials are provided.");
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.message?.includes('popup-closed-by-user')
      ) {
        console.log("Sign-in popup closed by user.");
        return;
      }
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setCurrentRoadmap(null);
      setCurrentDocId(null);
      setChatHistory([]);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleProcessRequest = async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    setChatHistory(prev => [...prev, { role: 'user', content: text }]);
    
    try {
      if (!currentRoadmap) {
        // Initial roadmap generation
        const roadmap = await generateRoadmap(text);
        handleUpdateRoadmap(roadmap);
        
        const assistantMessage: ChatMessage = { 
          role: 'assistant', 
          content: roadmap.summary,
          roadmap 
        };
        
        setChatHistory(prev => [...prev, assistantMessage]);

        // Save to history
        if (user) {
          saveRoadmapToHistory(roadmap);
        }
      } else {
        // Chat with assistant
        const response = await chatWithAssistant(text, chatHistory, currentRoadmap);
        
        if (response.updatedRoadmap) {
          handleUpdateRoadmap(response.updatedRoadmap);
          // Save update to history
          if (user && currentDocId) {
            saveRoadmapToHistory(response.updatedRoadmap, currentDocId);
          }
        }
        
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
          roadmap: response.updatedRoadmap
        };
        
        setChatHistory(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error("Error processing request:", error);
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429;
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: isQuotaError
          ? "I'm currently experiencing high traffic and have hit my API rate limit. Please wait a moment and try again."
          : `I'm sorry, I encountered an error while strategizing your roadmap: ${error?.message || JSON.stringify(error)}. Please try again.` 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-[#e0d8d0] font-sans selection:bg-[#ff4e00]/30">
      {/* Floating Menu Toggle */}
      <button
        onClick={() => setIsMenuOpen(true)}
        className={cn(
          "fixed top-6 left-6 z-40 flex items-center gap-2.5 px-3.5 py-2.5 bg-[#0a0502]/80 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl hover:border-[#ff4e00]/60 hover:bg-white/10 text-white transition-all group",
          isMenuOpen && "opacity-0 pointer-events-none"
        )}
        title="Open Navigation Menu"
      >
        <Menu className="w-5 h-5 text-[#ff4e00] group-hover:scale-110 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-wider text-white/90 group-hover:text-white">Menu</span>
      </button>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#0a0502]/95 backdrop-blur-xl p-6 flex items-center justify-center"
          >
            <div className="max-w-4xl w-full h-[80vh] bg-white/5 border border-white/10 rounded-[40px] flex flex-col overflow-hidden">
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Roadmap History</h2>
                  <p className="text-sm text-[#e0d8d0]/60">Your previous strategic plans</p>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <History className="w-12 h-12 text-white/10 mb-4" />
                    <p className="text-[#e0d8d0]/40">No history found yet. Generate your first roadmap!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {history.map((item) => (
                      <div
                        key={item.docId}
                        onClick={() => {
                          setCurrentRoadmap(item);
                          setCurrentDocId(item.docId);
                          setChatHistory([{ role: 'assistant', content: item.summary, roadmap: item }]);
                          setShowHistory(false);
                        }}
                        className="text-left p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-[#ff4e00]/50 hover:bg-white/[0.08] transition-all group relative cursor-pointer"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this roadmap?')) {
                              deleteRoadmap(item.docId);
                            }
                          }}
                          className="absolute top-4 right-4 p-2 rounded-xl bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-2 rounded-xl bg-[#ff4e00]/10 text-[#ff4e00]">
                            <Map className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] text-[#e0d8d0]/40 font-mono">
                            {item.createdAt?.toDate().toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#ff4e00] transition-colors">
                          {item.projectName}
                        </h3>
                        <p className="text-xs text-[#e0d8d0]/60 line-clamp-2 leading-relaxed">
                          {item.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-[#0a0502] border-r border-white/10 z-50 p-6 pt-10 flex flex-col gap-6 overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#ff4e00] rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-black" />
                  </div>
                  <h2 className="text-xl font-serif italic text-white">Strategist</h2>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/20 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#e0d8d0]/40 px-1">User Account</h3>
                  <div className="space-y-2">
                    {user ? (
                      <>
                        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                          <img src={user.photoURL || ''} alt="Profile" className="w-8 h-8 rounded-full border border-white/20 shrink-0" referrerPolicy="no-referrer" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                            <p className="text-[10px] text-white/40 truncate">{user.email}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setIsMenuOpen(false);
                            setShowHistory(true);
                          }}
                          className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/90 hover:text-white transition-all group"
                        >
                          <div className="p-2 rounded-xl bg-white/5 text-[#ff4e00] group-hover:bg-white/10 shrink-0 transition-colors">
                            <History className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-bold text-sm leading-tight">History</p>
                            <p className="text-[10px] text-[#e0d8d0]/50 uppercase tracking-wider font-medium mt-0.5">Saved Roadmaps</p>
                          </div>
                        </button>
                        <button 
                          onClick={logout}
                          className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-white/90 hover:text-red-400 transition-all group"
                        >
                          <div className="p-2 rounded-xl bg-white/5 text-red-500 group-hover:bg-red-500/20 shrink-0 transition-colors">
                            <LogOut className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-bold text-sm leading-tight">Logout</p>
                            <p className="text-[10px] text-red-400/60 uppercase tracking-wider font-medium mt-0.5">End Active Session</p>
                          </div>
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={login}
                        className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#ff4e00] border border-[#ff4e00] text-black font-bold hover:bg-[#ff6321] transition-all shadow-lg shadow-[#ff4e00]/20"
                      >
                        <div className="p-2 rounded-xl bg-black/10 text-black shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-bold text-sm leading-tight uppercase tracking-wider">Login</p>
                          <p className="text-[10px] text-black/60 uppercase tracking-wider font-bold">Sign in with Google</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#e0d8d0]/40 px-1">Navigation Views</h3>
                  <div className="space-y-2">
                    {[
                      { id: 'roadmap', title: 'Roadmap View', subtitle: 'Main Task List & Phases', icon: List },
                      { id: 'kanban', title: 'Kanban Board', subtitle: 'Interactive Task Columns', icon: LayoutGrid },
                      { id: 'resource', title: 'Department Workload', subtitle: 'Department Allocation', icon: Users },
                      { id: 'gantt', title: 'Gantt Chart', subtitle: 'Project Timeline', icon: GanttChartIcon },
                      { id: 'budget', title: 'Financial Dashboard', subtitle: 'Budget & Cost Tracking', icon: DollarSign },
                      { id: 'graph', title: 'Dependency Network', subtitle: 'Task Linkages & Graph', icon: Network },
                      { id: 'risks', title: 'Risk Matrix', subtitle: 'Critical Risks & Mitigations', icon: AlertTriangle },
                      { id: 'issues', title: 'Issue Tracker', subtitle: 'Track & Resolve Blockers', icon: AlertCircle }
                    ].map((nav) => {
                      const IconComponent = nav.icon;
                      const isSelected = viewMode === nav.id;

                      return (
                        <button
                          key={nav.id}
                          onClick={() => {
                            setIsMenuOpen(false);
                            setFullScreenView(null);
                            setViewMode(nav.id as any);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all text-left border group relative overflow-hidden",
                            isSelected
                              ? "bg-[#ff4e00]/15 border-[#ff4e00]/50 text-white shadow-lg shadow-[#ff4e00]/10"
                              : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/80 hover:text-white"
                          )}
                        >
                          {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff4e00] rounded-r-full" />
                          )}
                          <div className={cn(
                            "p-2 rounded-xl transition-colors shrink-0",
                            isSelected ? "bg-[#ff4e00] text-black" : "bg-white/5 text-[#ff4e00] group-hover:bg-white/10"
                          )}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight truncate">{nav.title}</p>
                            <p className="text-[10px] text-[#e0d8d0]/50 uppercase tracking-wider font-medium truncate mt-0.5">{nav.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#e0d8d0]/40 px-1">Analytics Section</h3>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setFullScreenView(null);
                      setViewMode('progress');
                    }}
                    className={cn(
                      "w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all text-left border group relative overflow-hidden",
                      viewMode === 'progress'
                        ? "bg-[#ff4e00]/15 border-[#ff4e00]/50 text-white shadow-lg shadow-[#ff4e00]/10"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/80 hover:text-white"
                    )}
                  >
                    {viewMode === 'progress' && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff4e00] rounded-r-full" />
                    )}
                    <div className={cn(
                      "p-2 rounded-xl transition-colors shrink-0",
                      viewMode === 'progress' ? "bg-[#ff4e00] text-black" : "bg-white/5 text-[#ff4e00] group-hover:bg-white/10"
                    )}>
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-tight truncate">Progress Breakdown</p>
                      <p className="text-[10px] text-[#e0d8d0]/50 uppercase tracking-wider font-medium truncate mt-0.5">Task Status Distribution</p>
                    </div>
                  </button>

                  {(() => {
                    const allTasks = displayRoadmap?.phases?.flatMap(p => p.tasks || []) || [];
                    const totalTasks = allTasks.length;
                    const todoCount = allTasks.filter(t => t.status === 'todo').length;
                    const inProgCount = allTasks.filter(t => t.status === 'in-progress').length;
                    const doneCount = allTasks.filter(t => t.status === 'done').length;

                    const todoPct = totalTasks > 0 ? Math.round((todoCount / totalTasks) * 100) : 0;
                    const inProgPct = totalTasks > 0 ? Math.round((inProgCount / totalTasks) * 100) : 0;
                    const donePct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

                    const pieData = totalTasks > 0 ? [
                      { name: 'To Do', value: todoCount, color: '#64748b', pct: todoPct },
                      { name: 'In Progress', value: inProgCount, color: '#ff4e00', pct: inProgPct },
                      { name: 'Completed', value: doneCount, color: '#10b981', pct: donePct },
                    ] : [
                      { name: 'To Do', value: 1, color: '#334155', pct: 0 },
                      { name: 'In Progress', value: 0, color: '#ff4e00', pct: 0 },
                      { name: 'Completed', value: 0, color: '#10b981', pct: 0 },
                    ];

                    return (
                      <div 
                        onClick={() => {
                          setIsMenuOpen(false);
                          setFullScreenView(null);
                          setViewMode('progress');
                        }}
                        className="space-y-4 pt-1 cursor-pointer group"
                      >
                        {/* Circular Pie Chart */}
                        <div className="relative w-full h-40 flex items-center justify-center p-2 rounded-2xl bg-white/5 border border-white/5 group-hover:border-[#ff4e00]/30 transition-all">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={36}
                                outerRadius={56}
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-black text-white">{donePct}%</span>
                            <span className="text-[9px] uppercase tracking-widest text-[#e0d8d0]/50 font-bold">Done</span>
                          </div>
                        </div>

                        {/* Legend / Breakdown List */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
                          {[
                            { name: 'To Do', value: todoCount, color: '#64748b', pct: todoPct },
                            { name: 'In Progress', value: inProgCount, color: '#ff4e00', pct: inProgPct },
                            { name: 'Completed', value: doneCount, color: '#10b981', pct: donePct }
                          ].map((item) => (
                            <div key={item.name} className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/5">
                              <div className="flex items-center gap-1 mb-1 min-w-0">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-[9px] font-bold text-white/80 truncate">{item.name}</span>
                              </div>
                              <span className="text-xs font-black text-white">{item.value}</span>
                              <span className="text-[9px] text-white/40">{item.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {currentRoadmap && (
                <div className="mt-auto p-6 bg-[#ff4e00]/5 border border-[#ff4e00]/20 rounded-3xl">
                  <p className="text-[10px] uppercase font-bold text-[#ff4e00] mb-2">Active Project</p>
                  <p className="text-lg font-serif italic text-white leading-tight">{currentRoadmap.projectName}</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full Screen View Overlay */}
      <AnimatePresence>
        {fullScreenView && currentRoadmap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0a0502] z-[100] flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-[#ff4e00]/10 text-[#ff4e00]">
                  {fullScreenView === 'gantt' && <GanttChartIcon className="w-6 h-6" />}
                  {fullScreenView === 'budget' && <DollarSign className="w-6 h-6" />}
                  {fullScreenView === 'graph' && <Network className="w-6 h-6" />}
                  {fullScreenView === 'risks' && <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-2xl font-serif italic text-white capitalize">
                    {fullScreenView === 'budget' ? 'Financial Dashboard' : 
                     fullScreenView === 'risks' ? 'Risk Matrix & Warnings' : 
                     fullScreenView === 'graph' ? 'Dependency Network' : 'Project Timeline (Gantt)'}
                  </h2>
                  <p className="text-xs text-[#e0d8d0]/40 uppercase tracking-widest font-bold">
                    {currentRoadmap.projectName} • Full Screen View
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFullScreenView(null)}
                className="p-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all group"
              >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-12 custom-scrollbar">
              <div className="max-w-7xl mx-auto">
                {fullScreenView === 'gantt' && <GanttChart roadmap={displayRoadmap} />}
                {fullScreenView === 'budget' && <BudgetDashboard roadmap={displayRoadmap} />}
                {fullScreenView === 'risks' && <RiskMatrix roadmap={displayRoadmap} />}
                {fullScreenView === 'graph' && <DependencyGraph roadmap={displayRoadmap} />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Presentation Mode Overlay Removed */}
      <AnimatePresence>
        {false && (
          <div />
        )}
      </AnimatePresence>

      {/* Atmospheric Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#3a1510] rounded-full blur-[120px] opacity-40 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ff4e00] rounded-full blur-[150px] opacity-20" />
      </div>

      <main onMouseMove={handleMouseMove} className="relative z-10 max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Voice Control & Chat */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <header className="mb-4">
            <h1 className="text-4xl font-serif italic text-white mb-2">PM Strategist</h1>
            <p className="text-sm text-[#e0d8d0]/60 uppercase tracking-widest">Iterative Product Intelligence</p>
          </header>

          {/* Strategic Prompt Input Card */}
          <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#ff4e00]">
              <Sparkles className="w-4 h-4" />
              <span>Generate / Adjust Roadmap</span>
            </div>
            
            <p className="text-xs text-[#e0d8d0]/60">
              Enter a product idea or describe changes to refine your strategic roadmap.
            </p>

            <div className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && textInput.trim() && !isProcessing) {
                    e.preventDefault();
                    handleProcessRequest(textInput);
                    setTextInput('');
                  }
                }}
                placeholder="E.g., Build a AI-powered fitness coach app with social challenges..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff4e00]/50 min-h-[90px] resize-none transition-colors"
                disabled={isProcessing}
              />
              <button
                onClick={() => {
                  if (textInput.trim() && !isProcessing) {
                    handleProcessRequest(textInput);
                    setTextInput('');
                  }
                }}
                disabled={!textInput.trim() || isProcessing}
                className="w-full bg-[#ff4e00] hover:bg-[#ff4e00]/90 text-black py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    Strategizing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Generate Strategy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-widest text-[#e0d8d0]/40">
              <History className="w-4 h-4" />
              <span>Session History</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {chatHistory.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                  <MessageSquare className="w-12 h-12 mb-2" />
                  <p className="text-xs">No strategic sessions yet</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "p-3 rounded-2xl text-sm",
                    msg.role === 'user' ? "bg-white/10 ml-8" : "bg-[#ff4e00]/10 mr-8 border border-[#ff4e00]/20"
                  )}
                >
                  <p className={cn("font-bold text-[10px] uppercase mb-1", msg.role === 'user' ? "text-white/40" : "text-[#ff4e00]")}>
                    {msg.role}
                  </p>
                  <p className="leading-relaxed">{msg.content}</p>
                  {msg.roadmap && (
                    <button 
                      onClick={() => setCurrentRoadmap(msg.roadmap!)}
                      className="mt-2 text-[10px] uppercase font-bold text-[#ff4e00] hover:underline flex items-center gap-1"
                    >
                      View Roadmap <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Roadmap Visualization */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {currentRoadmap ? (
              <motion.div
                key={currentRoadmap.projectName}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                id="roadmap-container"
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                      <h2 className="text-5xl font-serif italic text-white">{currentRoadmap.projectName}</h2>
                      <div className="flex items-center gap-2 mt-4">
                        <span className="px-3 py-1 bg-[#ff4e00] text-black text-[10px] font-black uppercase rounded-full">Strategic Roadmap</span>
                        <span className="text-xs text-[#e0d8d0]/40">Generated by Gemini 3.1 Pro</span>
                      </div>
                      <div className="mt-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#e0d8d0]/40">Overall Progress</span>
                          <span className="text-[10px] font-mono text-[#ff4e00]">{overallProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${overallProgress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-[#ff4e00] shadow-[0_0_10px_rgba(255,78,0,0.5)]"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setViewMode('roadmap');
                          setFullScreenView(null);
                        }}
                        className={cn(
                          "p-3 rounded-full transition-all border flex items-center justify-center",
                          viewMode === 'roadmap'
                            ? "bg-[#ff4e00] text-black border-[#ff4e00]"
                            : "bg-white/5 border-white/10 text-[#e0d8d0]/60 hover:bg-white/10 hover:text-white"
                        )}
                        title="List View (Main Roadmap)"
                      >
                        <List className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => downloadMarkdown(currentRoadmap)}
                        className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10"
                        title="Export to Markdown"
                      >
                        <FileText className="w-5 h-5 text-[#e0d8d0]/60" />
                      </button>
                      <button 
                        onClick={() => downloadPDF(currentRoadmap)}
                        className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10"
                        title="Export Task Checklist PDF"
                      >
                        <Download className="w-5 h-5 text-[#e0d8d0]/60" />
                      </button>
                    </div>
                  </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-xl text-[#e0d8d0]/80 leading-relaxed font-light italic">
                    {displayRoadmap.summary}
                  </p>
                </div>

                {/* Scenario Planning Control Center */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ff4e00]/20 to-purple-500/20 rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative bg-[#0a0502]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 lg:p-8 flex flex-col xl:flex-row gap-8 items-start justify-between shadow-2xl">
                    <div className="flex items-center gap-5 shrink-0 xl:mt-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#ff4e00] to-[#ff8c00] rounded-2xl flex items-center justify-center shadow-lg shadow-[#ff4e00]/20">
                        <RefreshCw className={cn("w-7 h-7 text-black", isRegeneratingScenario && "animate-spin")} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white">Scenario Engine</h4>
                        <p className="text-[10px] text-[#ff4e00] font-bold uppercase tracking-widest mt-1">What-if Strategic Analysis</p>
                      </div>
                    </div>

                    <div className="flex-1 w-full flex flex-col gap-6 min-w-0 xl:min-w-[400px]">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-3 h-3 text-[#ff4e00]" />
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 whitespace-nowrap">Budget Multiplier</label>
                          </div>
                          <span className={cn(
                            "text-xs font-mono font-black px-2 py-1 rounded-lg shrink-0",
                            budgetMultiplier !== 1 ? "bg-[#ff4e00] text-black" : "text-white/40 bg-white/5"
                          )}>
                            {(budgetMultiplier * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2" 
                          step="0.1" 
                          value={budgetMultiplier}
                          onChange={(e) => setBudgetMultiplier(parseFloat(e.target.value))}
                          disabled={isRegeneratingScenario}
                          className={cn(
                            "w-full h-1.5 bg-white/10 rounded-full appearance-none transition-all",
                            isRegeneratingScenario ? "cursor-not-allowed opacity-50" : "cursor-pointer accent-[#ff4e00] hover:accent-[#ff8c00]"
                          )}
                        />
                        <div className="flex justify-between text-[8px] text-white/20 font-black uppercase tracking-tighter whitespace-nowrap gap-2">
                          <span>Lean (-50%)</span>
                          <span>Standard</span>
                          <span>Premium (+100%)</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-[#ff4e00]" />
                            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 whitespace-nowrap">Timeline Multiplier</label>
                          </div>
                          <span className={cn(
                            "text-xs font-mono font-black px-2 py-1 rounded-lg shrink-0",
                            timelineMultiplier !== 1 ? "bg-[#ff4e00] text-black" : "text-white/40 bg-white/5"
                          )}>
                            {(timelineMultiplier * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2" 
                          step="0.1" 
                          value={timelineMultiplier}
                          onChange={(e) => setTimelineMultiplier(parseFloat(e.target.value))}
                          disabled={isRegeneratingScenario}
                          className={cn(
                            "w-full h-1.5 bg-white/10 rounded-full appearance-none transition-all",
                            isRegeneratingScenario ? "cursor-not-allowed opacity-50" : "cursor-pointer accent-[#ff4e00] hover:accent-[#ff8c00]"
                          )}
                        />
                        <div className="flex justify-between text-[8px] text-white/20 font-black uppercase tracking-tighter whitespace-nowrap gap-2">
                          <span>Fast Track</span>
                          <span>Standard</span>
                          <span>Thorough</span>
                        </div>
                      </div>
                      
                      {/* Button directly under sliders */}
                      <div className="mt-2 flex">
                        {isRegeneratingScenario ? (
                          <div className="w-full px-6 py-4 bg-[#ff4e00]/20 border border-[#ff4e00]/30 text-[#ff4e00] rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Regenerating Strategy...
                          </div>
                        ) : (budgetMultiplier !== 1 || timelineMultiplier !== 1) ? (
                          <button 
                            onClick={handleRegenerateScenario}
                            className="w-full px-6 py-4 bg-[#ff4e00] hover:bg-[#ff8c00] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                            Apply Scenario
                          </button>
                        ) : (
                          <div className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-bold uppercase tracking-widest text-white/20 italic flex items-center justify-center">
                            Adjust sliders to simulate
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {viewMode === 'roadmap' ? (
                  <>
                    {/* Key Strategic Metrics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-[#ff4e00]/40 transition-all">
                        <div className="flex items-center justify-between text-white/40 mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff4e00]">Time to MVP</span>
                          <Timer className="w-4 h-4 text-[#ff4e00]" />
                        </div>
                        <p className="text-lg font-bold text-white tracking-tight">
                          {formatTimeRange(displayRoadmap.timeToMVP)}
                        </p>
                        <span className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Estimated Timeline</span>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-[#ff4e00]/40 transition-all">
                        <div className="flex items-center justify-between text-white/40 mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Total Budget</span>
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-lg font-bold text-white tracking-tight">
                          {formatCurrencyRange(
                            displayRoadmap.totalBudget || displayRoadmap.phases.reduce((sum, p) => sum + (p.budget || 0), 0),
                            displayRoadmap.currency || 'USD'
                          )}
                        </p>
                        <span className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Estimated Capital</span>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-[#ff4e00]/40 transition-all">
                        <div className="flex items-center justify-between text-white/40 mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Total Effort</span>
                          <Clock className="w-4 h-4 text-blue-400" />
                        </div>
                        <p className="text-lg font-bold text-white tracking-tight">
                          {formatEffortRange(
                            displayRoadmap.phases.flatMap(p => p.tasks).reduce((sum, t) => sum + (t.estimation?.value || 0), 0),
                            displayRoadmap.phases[0]?.tasks[0]?.estimation?.unit || 'h'
                          )}
                        </p>
                        <span className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Resource Workload</span>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-[#ff4e00]/40 transition-all">
                        <div className="flex items-center justify-between text-white/40 mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Roadmap Structure</span>
                          <Map className="w-4 h-4 text-purple-400" />
                        </div>
                        <p className="text-lg font-bold text-white tracking-tight">
                          {displayRoadmap.phases.length} Phases
                        </p>
                        <span className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Phased Execution</span>
                      </div>
                    </div>

                    {/* Starting Point & MVP Features */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#ff4e00]/5 border border-[#ff4e00]/20 rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-4 text-[#ff4e00]">
                      <Play className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">Where to Begin</span>
                    </div>
                    <p className="text-sm leading-relaxed text-[#e0d8d0]/90 mb-6">
                      {displayRoadmap.startingPoint}
                    </p>
                    
                    {displayRoadmap.kickstartChecklist && displayRoadmap.kickstartChecklist.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-[#ff4e00]/10">
                        <div className="flex items-center gap-2 text-[#ff4e00]/60 mb-2">
                          <ClipboardList className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">First Actions Checklist</span>
                        </div>
                        {displayRoadmap.kickstartChecklist.map((step, i) => {
                          const isCompleted = displayRoadmap.completedChecklist?.includes(i);
                          return (
                            <div 
                              key={i} 
                              className="flex items-start gap-3 group/step cursor-pointer"
                              onClick={() => toggleChecklistItem(i)}
                            >
                              <div className={cn(
                                "mt-1 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                                isCompleted 
                                  ? "border-[#ff4e00] bg-[#ff4e00]" 
                                  : "border-[#ff4e00]/30 group-hover/step:border-[#ff4e00]/60"
                              )}>
                                {isCompleted ? (
                                  <Check className="w-3 h-3 text-black" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff4e00] opacity-0 group-hover/step:opacity-40 transition-opacity" />
                                )}
                              </div>
                              <p className={cn(
                                "text-[11px] leading-relaxed transition-colors",
                                isCompleted ? "text-[#e0d8d0]/40 line-through" : "text-[#e0d8d0]/70 group-hover/step:text-[#e0d8d0]"
                              )}>
                                {step}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-4 text-white">
                      <Target className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">Core MVP Features</span>
                    </div>
                    <div className="space-y-4">
                      {displayRoadmap.mvpFeatures.map((feature, i) => (
                        <div key={i} className="group">
                          <h4 className="text-[11px] font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-[#ff4e00]" />
                            {feature.title}
                          </h4>
                          <p className="text-[10px] text-[#e0d8d0]/60 leading-relaxed pl-3 border-l border-white/5 group-hover:border-[#ff4e00]/30 transition-colors">
                            {feature.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Phase Navigation */}
                <div className="sticky top-4 z-20 bg-[#0a0502]/90 backdrop-blur-xl py-4 px-6 rounded-2xl border border-white/10 flex items-center gap-4 overflow-x-auto custom-scrollbar shadow-2xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#ff4e00] shrink-0 flex items-center gap-2">
                    <Map className="w-4 h-4" />
                    Roadmap
                  </div>
                  <div className="w-px h-6 bg-white/10 shrink-0" />
                  <div className="flex gap-2">
                    {displayRoadmap.phases.map((phase, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const element = document.getElementById(`phase-${idx}`);
                          if (element) {
                            const y = element.getBoundingClientRect().top + window.scrollY - 100;
                            window.scrollTo({ top: y, behavior: 'smooth' });
                          }
                        }}
                        className="whitespace-nowrap px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#e0d8d0]/60 hover:text-white hover:bg-white/10 hover:border-[#ff4e00]/50 transition-all flex items-center gap-2 group/nav"
                      >
                        <span className="text-[#ff4e00]/60 group-hover/nav:text-[#ff4e00] transition-colors">0{idx + 1}</span> {phase.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {displayRoadmap.phases.map((phase, idx) => (
                    <motion.div 
                      key={idx}
                      id={`phase-${idx}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-3xl p-8 transition-all duration-500 scroll-mt-24"
                    >
                      <div className="flex flex-col md:flex-row gap-8">
                        <div className="md:w-1/4">
                          <div className="relative inline-block">
                            <span className="text-6xl font-serif italic text-white/10 group-hover:text-[#ff4e00]/20 transition-colors duration-500">
                              0{idx + 1}
                            </span>
                            <div className="absolute -bottom-2 left-0 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${calculateProgress(phase.tasks)}%` }}
                                className="h-full bg-[#ff4e00]/40"
                              />
                            </div>
                          </div>
                          <h3 className="text-xl font-bold text-white mt-4 uppercase tracking-tighter">{phase.title}</h3>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-[#ff4e00] font-black uppercase tracking-[0.2em]">{phase.phase}</p>
                            <div className="flex flex-col items-end">
                              <span className="text-[9px] font-mono text-white/20">{calculateProgress(phase.tasks)}% Complete</span>
                              <span className="text-[8px] font-mono text-[#ff4e00]/40">
                                Total Effort: {formatEffortRange(phase.tasks.reduce((sum, t) => sum + (t.estimation?.value || 0), 0), phase.tasks[0]?.estimation?.unit || 'h')}
                              </span>
                              {phase.budget && (
                                <span className="text-[8px] font-mono text-green-500/60 mt-1">
                                  Budget: {formatCurrencyRange(phase.budget, displayRoadmap.currency || 'USD')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="md:w-3/4 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <div className="flex items-center gap-2 mb-3 text-[#ff4e00]">
                                <Target className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Strategic Goals</span>
                              </div>
                              <ul className="space-y-2">
                                {phase.goals.map((goal, i) => (
                                  <li key={i} className="text-sm text-[#e0d8d0]/70 flex items-start gap-2">
                                    <span className="w-1 h-1 rounded-full bg-[#ff4e00] mt-2 shrink-0" />
                                    {goal}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-3 text-[#ff4e00]">
                                <ClipboardList className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Key Tasks</span>
                              </div>
                              <div className="space-y-3">
                                {phase.tasks.map((task) => (
                                  <motion.div 
                                    key={task.id} 
                                    layout
                                    initial={false}
                                    animate={{ 
                                      scale: task.status === 'done' ? 0.98 : 1,
                                      opacity: task.status === 'done' ? 0.7 : 1,
                                      borderColor: task.status === 'in-progress' ? 'rgba(255, 78, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                      backgroundColor: task.status === 'in-progress' ? 'rgba(255, 78, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)'
                                    }}
                                    className={cn(
                                      "border rounded-xl p-4 group/task hover:border-[#ff4e00]/30 transition-colors relative overflow-hidden",
                                      task.priority === 'high' ? "border-l-4 border-l-red-500/50" :
                                      task.priority === 'medium' ? "border-l-4 border-l-yellow-500/50" :
                                      "border-l-4 border-l-blue-500/50"
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <button 
                                            onClick={() => {
                                              const nextStatus: Task['status'] = 
                                                task.status === 'todo' ? 'in-progress' : 
                                                task.status === 'in-progress' ? 'done' : 'todo';
                                              updateTask(idx, task.id, { status: nextStatus });
                                            }}
                                            className={cn(
                                              "relative w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300",
                                              task.status === 'done' ? "bg-[#ff4e00] border-[#ff4e00]" : "border-white/20 hover:border-[#ff4e00]"
                                            )}
                                          >
                                            <AnimatePresence mode="wait">
                                              {task.status === 'done' && (
                                                <motion.div
                                                  key="done"
                                                  initial={{ scale: 0.5, opacity: 0 }}
                                                  animate={{ scale: 1, opacity: 1 }}
                                                  exit={{ scale: 0.5, opacity: 0 }}
                                                  className="flex items-center justify-center"
                                                >
                                                  <motion.svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="w-3 h-3 text-black"
                                                  >
                                                    <motion.path
                                                      d="M20 6L9 17l-5-5"
                                                      initial={{ pathLength: 0 }}
                                                      animate={{ pathLength: 1 }}
                                                      transition={{ duration: 0.3, ease: "easeOut" }}
                                                    />
                                                  </motion.svg>
                                                </motion.div>
                                              )}
                                              {task.status === 'in-progress' && (
                                                <motion.div
                                                  key="in-progress"
                                                  initial={{ scale: 0 }}
                                                  animate={{ 
                                                    scale: [1, 1.5, 1],
                                                    opacity: [1, 0.4, 1]
                                                  }}
                                                  exit={{ scale: 0 }}
                                                  transition={{ 
                                                    repeat: Infinity, 
                                                    duration: 2,
                                                    ease: "easeInOut"
                                                  }}
                                                  className="w-1.5 h-1.5 rounded-full bg-[#ff4e00] shadow-[0_0_8px_rgba(255,78,0,0.8)]"
                                                />
                                              )}
                                            </AnimatePresence>
                                            
                                            {/* Subtle pulsing ring for in-progress */}
                                            {task.status === 'in-progress' && (
                                              <motion.div 
                                                layoutId={`pulse-${task.id}`}
                                                className="absolute inset-0 rounded-full border border-[#ff4e00]"
                                                animate={{ 
                                                  scale: [1, 1.4],
                                                  opacity: [0.5, 0]
                                                }}
                                                transition={{ 
                                                  repeat: Infinity, 
                                                  duration: 2,
                                                  ease: "easeOut"
                                                }}
                                              />
                                            )}
                                          </button>
                                          <div className="relative flex items-center gap-2">
                                            <span className="text-[9px] font-mono text-[#ff4e00]/40 shrink-0">#{task.id.slice(-4)}</span>
                                            <p className={cn(
                                              "text-sm font-medium transition-colors duration-500",
                                              task.status === 'done' ? "text-[#e0d8d0]/30" : "text-[#e0d8d0]"
                                            )}>
                                              {task.description}
                                            </p>
                                            <AnimatePresence>
                                              {task.status === 'done' && (
                                                <motion.div 
                                                  initial={{ width: 0 }}
                                                  animate={{ width: '100%' }}
                                                  exit={{ width: 0 }}
                                                  className="absolute left-0 top-1/2 h-[1px] bg-[#ff4e00]/40"
                                                />
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-4 mt-3">
                                          <div className="flex items-center gap-1.5" title="Department">
                                            <User className="w-3 h-3 text-[#ff4e00]/60" />
                                            <input 
                                              type="text" 
                                              value={task.owner}
                                              onChange={(e) => updateTask(idx, task.id, { owner: e.target.value })}
                                              className="bg-transparent border-none p-0 text-[10px] text-[#e0d8d0]/60 focus:ring-0 w-32 placeholder:text-white/10"
                                              placeholder="Department (Eng, Design...)"
                                            />
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3 text-[#ff4e00]/60" />
                                            <input 
                                              type="text" 
                                              value={task.deadline}
                                              onChange={(e) => updateTask(idx, task.id, { deadline: e.target.value })}
                                              className="bg-transparent border-none p-0 text-[10px] text-[#e0d8d0]/60 focus:ring-0 w-20 placeholder:text-white/10"
                                              placeholder="Set deadline..."
                                            />
                                          </div>
                                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 group-hover/task:border-[#ff4e00]/20 transition-all" title="Estimated Effort">
                                            <Timer className="w-3 h-3 text-[#ff4e00]/60" />
                                            <span className="text-[10px] font-bold text-[#e0d8d0]/90">
                                              {formatEffortRange(task.estimation?.value, task.estimation?.unit || 'h')}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 group-hover/task:border-[#ff4e00]/20 transition-all" title="Estimated Budget">
                                            <DollarSign className="w-3 h-3 text-emerald-400/80" />
                                            <span className="text-[10px] font-bold text-emerald-400">
                                              {formatCurrencyRange(task.cost, displayRoadmap.currency || 'USD')}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <Link2 className="w-3 h-3 text-[#ff4e00]/60" />
                                            <input 
                                              type="text" 
                                              value={task.dependencies.join(', ')}
                                              onChange={(e) => {
                                                const deps = e.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
                                                updateTask(idx, task.id, { dependencies: deps });
                                              }}
                                              className="bg-transparent border-none p-0 text-[10px] text-[#e0d8d0]/60 focus:ring-0 w-32 placeholder:text-white/10"
                                              placeholder="Deps (ID1, ID2)..."
                                            />
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            {task.status === 'todo' && <Circle className="w-3 h-3 text-white/20" />}
                                            {task.status === 'in-progress' && <Clock className="w-3 h-3 text-[#ff4e00]" />}
                                            {task.status === 'done' && <CheckCircle2 className="w-3 h-3 text-[#ff4e00]" />}
                                            <span className="text-[10px] uppercase font-bold text-[#ff4e00]/60">
                                              {task.status.replace('-', ' ')}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              onClick={() => {
                                                const priorities: Task['priority'][] = ['low', 'medium', 'high'];
                                                const nextPriority = priorities[(priorities.indexOf(task.priority) + 1) % priorities.length];
                                                updateTask(idx, task.id, { priority: nextPriority });
                                              }}
                                              className={cn(
                                                "flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider transition-all",
                                                task.priority === 'high' ? "bg-red-500/10 border-red-500/30 text-red-500" :
                                                task.priority === 'medium' ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" :
                                                "bg-blue-500/10 border-blue-500/30 text-blue-500"
                                              )}
                                            >
                                              <AlertCircle className="w-2.5 h-2.5" />
                                              {task.priority}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-3 text-[#ff4e00]/60">
                              <Flag className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Key Milestones</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {phase.milestones?.map((milestone, mIdx) => (
                                <div key={mIdx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between group/milestone hover:bg-white/[0.08] transition-colors">
                                  <div>
                                    <h4 className="text-sm font-bold text-white">{milestone.name}</h4>
                                    <p className="text-[10px] text-[#e0d8d0]/60 mt-1 font-mono">Target: {milestone.targetDate}</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const statuses: Milestone['status'][] = ['upcoming', 'in-progress', 'completed'];
                                      const next = statuses[(statuses.indexOf(milestone.status) + 1) % statuses.length];
                                      updateMilestone(idx, milestone.name, { status: next });
                                    }}
                                    className={cn(
                                      "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all",
                                      milestone.status === 'completed' ? "bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20" :
                                      milestone.status === 'in-progress' ? "bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20" :
                                      "bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20"
                                    )}
                                  >
                                    {milestone.status.replace('-', ' ')}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-3 text-[#ff4e00]/60">
                              <ShieldAlert className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Potential Risks & Mitigation</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {phase.risks.map((risk) => {
                                const severityLevels = ['very-low', 'low', 'medium', 'high', 'very-high'];
                                const score = (severityLevels.indexOf(risk.impact) + 1) * (severityLevels.indexOf(risk.probability) + 1);
                                const isCritical = score >= 16;
                                const isHigh = score >= 9 && score < 16;
                                
                                return (
                                  <div 
                                    key={risk.id} 
                                    className={cn(
                                      "border rounded-2xl p-5 space-y-4 transition-all hover:bg-white/[0.03]",
                                      isCritical ? "bg-red-500/10 border-red-500/30" : 
                                      isHigh ? "bg-orange-500/5 border-orange-500/20" : 
                                      "bg-white/5 border-white/10"
                                    )}
                                  >
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className={cn(
                                            "w-2 h-2 rounded-full animate-pulse",
                                            isCritical ? "bg-red-500" : isHigh ? "bg-orange-500" : "bg-blue-500"
                                          )} />
                                          <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">
                                            {risk.category || 'General Risk'}
                                          </span>
                                        </div>
                                        <div className="flex gap-1.5">
                                          <button
                                            onClick={() => {
                                              const levels: Risk['impact'][] = ['very-low', 'low', 'medium', 'high', 'very-high'];
                                              const next = levels[(levels.indexOf(risk.impact) + 1) % levels.length];
                                              updateRisk(idx, risk.id, { impact: next });
                                            }}
                                            className={cn(
                                              "px-2 py-0.5 rounded-md text-[8px] font-black uppercase border transition-all",
                                              risk.impact === 'very-high' ? "bg-red-600/30 border-red-600/50 text-red-500" :
                                              risk.impact === 'high' ? "bg-red-500/20 border-red-500/40 text-red-400" :
                                              risk.impact === 'medium' ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-500" :
                                              risk.impact === 'low' ? "bg-blue-500/20 border-blue-500/40 text-blue-400" :
                                              "bg-blue-600/10 border-blue-600/30 text-blue-500"
                                            )}
                                          >
                                            Impact: {risk.impact.replace('-', ' ')}
                                          </button>
                                          <button
                                            onClick={() => {
                                              const levels: Risk['probability'][] = ['very-low', 'low', 'medium', 'high', 'very-high'];
                                              const next = levels[(levels.indexOf(risk.probability) + 1) % levels.length];
                                              updateRisk(idx, risk.id, { probability: next });
                                            }}
                                            className={cn(
                                              "px-2 py-0.5 rounded-md text-[8px] font-black uppercase border transition-all",
                                              risk.probability === 'very-high' ? "bg-red-600/30 border-red-600/50 text-red-500" :
                                              risk.probability === 'high' ? "bg-red-500/20 border-red-500/40 text-red-400" :
                                              risk.probability === 'medium' ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-500" :
                                              risk.probability === 'low' ? "bg-blue-500/20 border-blue-500/40 text-blue-400" :
                                              "bg-blue-600/10 border-blue-600/30 text-blue-500"
                                            )}
                                          >
                                            Prob: {risk.probability.replace('-', ' ')}
                                          </button>
                                        </div>
                                      </div>
                                      <textarea 
                                        value={risk.description}
                                        onChange={(e) => updateRisk(idx, risk.id, { description: e.target.value })}
                                        className="bg-transparent border-none p-0 text-sm font-medium text-white focus:ring-0 w-full resize-none min-h-[40px] leading-relaxed"
                                        placeholder="Describe the risk..."
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1 pt-3 border-t border-white/5">
                                      <div className="flex items-center gap-2 mb-1">
                                        <ShieldAlert className="w-3 h-3 text-[#ff4e00]" />
                                        <span className="text-[9px] uppercase font-bold text-[#ff4e00] tracking-widest">Mitigation Strategy</span>
                                      </div>
                                      <textarea 
                                        value={risk.mitigation}
                                        onChange={(e) => updateRisk(idx, risk.id, { mitigation: e.target.value })}
                                        className="bg-transparent border-none p-0 text-xs text-[#e0d8d0]/60 italic focus:ring-0 w-full resize-none min-h-[40px] leading-relaxed"
                                        placeholder="How to mitigate..."
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-3 text-white/40">
                              <MessageSquare className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Included Features</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {phase.features.map((feature, i) => (
                                <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-[#e0d8d0]/60">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-2 text-white/40">
                              <Lightbulb className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">PM Rationale</span>
                            </div>
                            <p className="text-sm italic text-[#e0d8d0]/60 leading-relaxed">
                              {phase.pmRationale}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                    </div>
                  </>
                ) : viewMode === 'kanban' ? (
                  <KanbanBoard 
                    roadmap={adjustedRoadmap || currentRoadmap} 
                    onUpdateTask={handleUpdateTask}
                    onAddTask={handleAddTask}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={(pIdx, tIdx, task) => {
                      setSelectedPhaseIndex(pIdx);
                      setSelectedTaskIndex(tIdx);
                      setSelectedTask(task);
                      setIsNewTask(false);
                      setIsTaskModalOpen(true);
                    }}
                  />
                ) : viewMode === 'resource' ? (
                  <ResourceWorkload roadmap={adjustedRoadmap || currentRoadmap} />
                ) : viewMode === 'gantt' ? (
                  <GanttChart roadmap={adjustedRoadmap || currentRoadmap} />
                ) : viewMode === 'budget' ? (
                  <BudgetDashboard roadmap={adjustedRoadmap || currentRoadmap} />
                ) : viewMode === 'risks' ? (
                  <RiskMatrix roadmap={adjustedRoadmap || currentRoadmap} />
                ) : viewMode === 'issues' ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-xl">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">Issues Tracker</h2>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Manage and resolve task blockers</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsIssueModalOpen(true)}
                        className="px-6 py-3 bg-red-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Raise New Issue
                      </button>
                    </div>
                    <IssuesView 
                      roadmap={currentRoadmap} 
                      onUpdateIssue={handleUpdateIssue}
                      onDeleteIssue={handleDeleteIssue}
                    />
                  </div>
                ) : viewMode === 'progress' ? (
                  <ProgressBreakdownView roadmap={adjustedRoadmap || currentRoadmap} />
                ) : (
                  <DependencyGraph roadmap={adjustedRoadmap || currentRoadmap} />
                )}
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Play className="w-10 h-10 text-white/20" />
                </div>
                <h2 className="text-3xl font-serif italic text-white/40">Ready for your vision</h2>
                <p className="text-[#e0d8d0]/30 max-w-md mt-4">
                  Speak your project idea to generate a professional, iterative roadmap designed by AI Product Management intelligence.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Remote Cursors */}
      {Object.entries(remoteCursors).map(([id, cursor]) => (
        <motion.div
          key={id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, x: cursor.x * window.innerWidth, y: cursor.y * window.innerHeight }}
          className="fixed pointer-events-none z-[9999] flex flex-col items-center"
        >
          <MousePointer2 className="w-4 h-4 text-[#ff4e00] fill-[#ff4e00]" />
          <span className="bg-[#ff4e00] text-black text-[8px] font-bold px-1 rounded whitespace-nowrap">
            {cursor.userName}
          </span>
        </motion.div>
      ))}



      {/* New Components */}
      <ChatSidebar 
        roadmap={displayRoadmap} 
        onUpdateRoadmap={handleUpdateRoadmap} 
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        isNew={isNewTask}
        onSave={(task) => {
          if (isNewTask) {
            handleSaveNewTask(task);
          } else if (selectedPhaseIndex !== null && selectedTaskIndex !== null) {
            handleUpdateTask(selectedPhaseIndex, selectedTaskIndex, task);
          }
        }}
        onDelete={() => {
          if (selectedPhaseIndex !== null && selectedTaskIndex !== null) {
            handleDeleteTask(selectedPhaseIndex, selectedTaskIndex);
          }
        }}
      />

      <IssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        roadmap={currentRoadmap}
        onSave={handleRaiseIssue}
        userEmail={user?.email || 'Anonymous'}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 78, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 78, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
