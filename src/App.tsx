import React, { useState, useEffect, useRef } from "react";
import { 
  Github, 
  Terminal, 
  Database, 
  Brain, 
  User, 
  Plus, 
  Search, 
  Trash, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Save, 
  RefreshCw, 
  Sliders, 
  Settings, 
  Key, 
  LogOut, 
  MessageSquare, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  Layers, 
  Wifi, 
  Cloud, 
  FileText, 
  X, 
  Activity, 
  Zap, 
  Sparkles,
  Info
} from "lucide-react";
import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";

// Initial static data for the simulated Firestore engine
const INITIAL_COLLECTIONS: Record<string, Record<string, any>> = {
  users_main: {
    "zQ9rL1xM8nB2p5V7": {
      display_name: "Akif Demir",
      email_status: "verified",
      email: "akif@demir.dev",
      role: "administrator",
      metadata: JSON.stringify({
        last_login: "2026-07-16T10:45:12Z",
        ip_address: "192.168.1.1",
        device: "MacBook Pro M2"
      }, null, 2)
    },
    "xK3mR8uW2p1L5v9Y": {
      display_name: "Ece Yılmaz",
      email_status: "verified",
      email: "ece@yilmaz.co",
      role: "developer",
      metadata: JSON.stringify({
        last_login: "2026-07-16T13:20:00Z",
        ip_address: "85.105.42.11",
        device: "Windows Desktop"
      }, null, 2)
    }
  },
  orders_active: {
    "order_908317": {
      item: "Enterprise License",
      status: "completed",
      price: "$499.00",
      user: "akif@demir.dev",
      timestamp: "2026-07-16T04:12:00Z"
    },
    "order_128941": {
      item: "Pro Plan Subscription",
      status: "processing",
      price: "$49.00",
      user: "ece@yilmaz.co",
      timestamp: "2026-07-16T06:05:00Z"
    }
  },
  product_catalog: {
    "prod_001": {
      name: "Nexus Micro Core",
      type: "Serverless Compute",
      price: "$12.00/mo",
      stock: "Unlimited",
      details: "High availability Docker compute clusters with pre-warmed runtimes."
    },
    "prod_002": {
      name: "Spanner Bridge Gateway",
      type: "Database Service",
      price: "$89.00/mo",
      stock: "98 left",
      details: "Ultra-low latency globally replicated router for transaction scale."
    }
  },
  app_logs: {
    "log_984102": {
      level: "info",
      message: "User Akif Demir logged in successfully.",
      service: "auth_gateway",
      timestamp: "2026-07-16T06:40:12Z"
    },
    "log_984103": {
      level: "warn",
      message: "High latency detected on us-east-1 connection during Firestore syncing.",
      service: "db_sync",
      timestamp: "2026-07-16T06:41:00Z"
    }
  }
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thoughts?: string;
  timestamp: Date;
}

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<"explorer" | "copilot" | "settings">("explorer");

  // User custom Gemini API Key State
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem("user_gemini_api_key") || "";
  });
  const [geminiInput, setGeminiInput] = useState<string>(() => {
    return localStorage.getItem("user_gemini_api_key") || "";
  });
  
  // Custom Firebase Configuration (Local Storage cached)
  const [useRealFirebase, setUseRealFirebase] = useState<boolean>(false);
  const [firebaseConfig, setFirebaseConfig] = useState({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    databaseURL: ""
  });
  const [firebaseStatus, setFirebaseStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [firebaseError, setFirebaseError] = useState<string>("");
  
  // Simulated Authentication & User Profile
  const [user, setUser] = useState<{
    displayName: string;
    email: string;
    photoURL: string;
    isMock: boolean;
  }>({
    displayName: "Akif Demir",
    email: "akif@demir.dev",
    photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
    isMock: true
  });

  // Local/Simulated DB State
  const [collections, setCollections] = useState<Record<string, Record<string, any>>>(() => {
    const saved = localStorage.getItem("nexus_collections");
    return saved ? JSON.parse(saved) : INITIAL_COLLECTIONS;
  });

  // Explorer Selection State
  const [selectedCollection, setSelectedCollection] = useState<string>("users_main");
  const [selectedDocId, setSelectedDocId] = useState<string>("zQ9rL1xM8nB2p5V7");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editedDocData, setEditedDocData] = useState<Record<string, string>>({});
  const [editDocId, setEditDocId] = useState<string>("");
  const [jsonError, setJsonError] = useState<string>("");

  // New Collection / Document Modals
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocId, setNewDocId] = useState("");
  const [newDocFields, setNewDocFields] = useState<Array<{ key: string; value: string }>>([
    { key: "display_name", value: "" },
    { key: "email", value: "" }
  ]);

  // Deployment Simulator State
  const [repoName, setRepoName] = useState("nexus-v2-stable");
  const [deployUrl, setDeployUrl] = useState("nexus-app-gamma.vercel.app");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);
  const [deployStep, setDeployStep] = useState("");
  const [buildLogs, setBuildLogs] = useState<string[]>([
    "Initial build log ready.",
    "> Repository loaded successfully.",
    "> Firebase sync checked: ONLINE.",
    "> Production pipeline configured on Vercel."
  ]);

  // AI Thinking Copilot Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("nexus_chat_history");
    return saved ? JSON.parse(saved) : [
      {
        id: "welcome",
        role: "assistant",
        content: "Merhaba! Ben senin yüksek düşünme (High Thinking) modlu Cloud & Firebase asistanınım. GitHub'dan Vercel'e otomatik yükleme adımları, Firestore veritabanı kuralları, veri şeması oluşturma veya Firestore sorguları yazma konusunda sana yardımcı olabilirim. Nasıl başlayacağız?",
        timestamp: new Date()
      }
    ];
  });
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [visibleThoughts, setVisibleThoughts] = useState<Record<string, boolean>>({});

  // Firestore DB stats
  const [dbStats, setDbStats] = useState({
    reads: 14210,
    writes: 1845,
    storage: 420
  });

  // Log auto-scroll reference
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load Saved Firebase Config
  useEffect(() => {
    const savedConfig = localStorage.getItem("nexus_firebase_config");
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setFirebaseConfig(parsed);
      // Auto enable if valid looking project
      if (parsed.projectId && parsed.apiKey) {
        setUseRealFirebase(true);
      }
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("nexus_collections", JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    localStorage.setItem("nexus_chat_history", JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Terminal scroll to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [buildLogs, isDeploying]);

  // Chat scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Firebase Real Connection handler
  useEffect(() => {
    if (!useRealFirebase) {
      setFirebaseStatus("disconnected");
      return;
    }

    try {
      setFirebaseStatus("connecting");
      setFirebaseError("");
      
      const configOk = firebaseConfig.apiKey && firebaseConfig.projectId;
      if (!configOk) {
        throw new Error("API Key ve Project ID alanları zorunludur.");
      }

      // Check if already initialized
      let app;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }

      const db = getFirestore(app);
      setFirebaseStatus("connected");

      // Set up simple listener on selected collection if real db is active
      const unsubscribe = onSnapshot(collection(db, selectedCollection), (snapshot) => {
        const liveDocs: Record<string, any> = {};
        snapshot.forEach((doc) => {
          liveDocs[doc.id] = doc.data();
        });
        
        // Update our collections state with real data
        setCollections(prev => ({
          ...prev,
          [selectedCollection]: liveDocs
        }));

        // Adjust stats
        setDbStats(prev => ({
          ...prev,
          reads: prev.reads + snapshot.docs.length,
          writes: prev.writes + 1
        }));
      }, (err) => {
        console.error("Firestore Listen error:", err);
        setFirebaseError(`Firestore bağlantı hatası: ${err.message}`);
        setFirebaseStatus("error");
      });

      return () => unsubscribe();
    } catch (err: any) {
      console.error("Firebase init failed:", err);
      setFirebaseError(err.message || "Firebase SDK başlatılamadı.");
      setFirebaseStatus("error");
    }
  }, [useRealFirebase, firebaseConfig, selectedCollection]);

  // Setup Document details when selection changes
  useEffect(() => {
    const colData = collections[selectedCollection] || {};
    const docData = colData[selectedDocId];
    if (docData) {
      const dataCopy = { ...docData };
      setEditedDocData(dataCopy);
      setEditDocId(selectedDocId);
    } else {
      // Pick first doc if selected doc doesn't exist
      const keys = Object.keys(colData);
      if (keys.length > 0) {
        setSelectedDocId(keys[0]);
      } else {
        setEditedDocData({});
        setEditDocId("");
      }
    }
  }, [selectedCollection, selectedDocId, collections]);

  // Save changes to Document (Mock or Real)
  const handleUpdateDocument = async () => {
    if (!editDocId) return;

    try {
      if (useRealFirebase) {
        const app = getApp();
        const db = getFirestore(app);
        
        // Convert input string properties back if possible
        const cleanedData: Record<string, any> = {};
        Object.entries(editedDocData).forEach(([k, v]) => {
          const valStr = v as string;
          if (k === "metadata" || k === "details") {
            try {
              cleanedData[k] = JSON.parse(valStr);
            } catch {
              cleanedData[k] = valStr;
            }
          } else {
            cleanedData[k] = valStr;
          }
        });

        await setDoc(doc(db, selectedCollection, editDocId), cleanedData);
        // Stats
        setDbStats(prev => ({ ...prev, writes: prev.writes + 1 }));
        addLog(`> REAL FIRESTORE: updated document '${editDocId}' inside collection '${selectedCollection}'.`);
      } else {
        // Mock Update
        setCollections(prev => ({
          ...prev,
          [selectedCollection]: {
            ...prev[selectedCollection],
            [editDocId]: editedDocData
          }
        }));
        setDbStats(prev => ({ ...prev, writes: prev.writes + 1 }));
        addLog(`> LOCAL SANDBOX: updated document '${editDocId}' inside collection '${selectedCollection}'.`);
      }
      
      // Toast notice
      alert("Belge başarıyla güncellendi!");
    } catch (err: any) {
      console.error("Update Doc error:", err);
      alert(`Güncelleme başarısız: ${err.message}`);
    }
  };

  // Delete Document (Mock or Real)
  const handleDeleteDocument = async (docId: string) => {
    if (!confirm(`'${docId}' belgesini silmek istediğinize emin misiniz?`)) return;

    try {
      if (useRealFirebase) {
        const app = getApp();
        const db = getFirestore(app);
        await deleteDoc(doc(db, selectedCollection, docId));
        addLog(`> REAL FIRESTORE: deleted document '${docId}' from '${selectedCollection}'.`);
      } else {
        // Mock Delete
        const copy = { ...collections[selectedCollection] };
        delete copy[docId];
        setCollections(prev => ({
          ...prev,
          [selectedCollection]: copy
        }));
        addLog(`> LOCAL SANDBOX: deleted document '${docId}' from '${selectedCollection}'.`);
      }

      // Select another document if deleted one was active
      if (selectedDocId === docId) {
        const remaining = Object.keys(collections[selectedCollection] || {}).filter(k => k !== docId);
        if (remaining.length > 0) {
          setSelectedDocId(remaining[0]);
        } else {
          setSelectedDocId("");
        }
      }
    } catch (err: any) {
      alert(`Silme başarısız: ${err.message}`);
    }
  };

  // Create New Document
  const handleCreateDocument = async () => {
    if (!newDocId.trim()) {
      alert("Lütfen bir Belge ID girin.");
      return;
    }

    const docObj: Record<string, string> = {};
    newDocFields.forEach(f => {
      if (f.key.trim()) {
        docObj[f.key.trim()] = f.value;
      }
    });

    try {
      if (useRealFirebase) {
        const app = getApp();
        const db = getFirestore(app);
        await setDoc(doc(db, selectedCollection, newDocId), docObj);
        addLog(`> REAL FIRESTORE: created document '${newDocId}' inside '${selectedCollection}'.`);
      } else {
        // Mock Create
        setCollections(prev => ({
          ...prev,
          [selectedCollection]: {
            ...prev[selectedCollection],
            [newDocId]: docObj
          }
        }));
        addLog(`> LOCAL SANDBOX: created document '${newDocId}' inside '${selectedCollection}'.`);
      }

      setSelectedDocId(newDocId);
      setShowNewDocModal(false);
      setNewDocId("");
      setNewDocFields([{ key: "display_name", value: "" }, { key: "email", value: "" }]);
    } catch (err: any) {
      alert(`Belge oluşturma başarısız: ${err.message}`);
    }
  };

  // Add a new collection
  const handleCreateCollection = () => {
    const formattedName = newCollectionName.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!formattedName) {
      alert("Lütfen geçerli bir koleksiyon adı girin.");
      return;
    }

    if (collections[formattedName]) {
      alert("Bu koleksiyon zaten mevcut.");
      return;
    }

    setCollections(prev => ({
      ...prev,
      [formattedName]: {
        "initial_doc": {
          created_at: new Date().toISOString(),
          description: `Koleksiyon '${formattedName}' başlatıldı.`
        }
      }
    }));

    setSelectedCollection(formattedName);
    setSelectedDocId("initial_doc");
    setShowNewCollectionModal(false);
    setNewCollectionName("");
    addLog(`> Created collection '${formattedName}' on local sandbox.`);
  };

  // Helper log generator
  const addLog = (message: string) => {
    setBuildLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Git Push & Vercel deployment simulation pipeline
  const triggerGitHubPush = () => {
    if (isDeploying) return;
    setIsDeploying(true);
    setDeployProgress(0);
    setBuildLogs([]);
    
    const logs = [
      "⚡ GitHub Webhook detected commit push on main branch...",
      "> Commit ID: cf78da1 (Adjust database connections & UI optimization)",
      "> Triggering Vercel deployment pipeline automation...",
      "☁️ Initializing Vercel Build Container in Frankfurt Region (fra1-c)...",
      "📦 Injecting environment variables: GEMINI_API_KEY, APP_URL...",
      "> Pulling latest build image...",
      "⚙️ Running installation command: 'npm install'...",
      "✔ All dependencies resolved. Bundled Node modules mapped successfully.",
      "🚀 Starting build compilation: 'npm run build'...",
      "ℹ tsx server.ts mapping validated for server-side endpoints...",
      "ℹ esbuild server.ts compilation triggered to dist/server.cjs...",
      "✔ Build compiled successfully in 12.4s.",
      "🧹 Running linting operations: 'npm run lint'...",
      "✔ Type check completed. No TypeScript syntax or type issues discovered.",
      "🔥 Deploying build assets to Firestore security rule groups...",
      "✔ firestore.rules synchronized successfully with Firebase project.",
      "⚡ Deploying production bundle to Edge Network routing layers...",
      "🎉 Deployment successfully propagated to Edge Server: nexus-app-gamma.vercel.app",
      "✔ Site status: ONLINE. Synchronization with cloud firestore active."
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setBuildLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logs[currentLogIndex]}`]);
        setDeployProgress(Math.floor(((currentLogIndex + 1) / logs.length) * 100));
        setDeployStep(logs[currentLogIndex].slice(0, 40) + "...");
        currentLogIndex++;
      } else {
        clearInterval(interval);
        setIsDeploying(false);
        setDeployProgress(100);
        setDeployStep("Deployment Completed!");
        setDbStats(prev => ({
          ...prev,
          writes: prev.writes + 3
        }));
        // Update Deploy URL randomly to show dynamic push
        const randomCommit = Math.random().toString(36).substring(2, 7);
        setDeployUrl(`nexus-app-${randomCommit}.vercel.app`);
      }
    }, 600);
  };

  // Handle Send Chat to Gemini High Thinking API
  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput;
    setChatInput("");
    setIsChatLoading(true);

    const newUserMessage: Message = {
      id: Math.random().toString(),
      role: "user",
      content: userText,
      timestamp: new Date()
    };

    const updatedHistory = [...chatMessages, newUserMessage];
    setChatMessages(updatedHistory);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      if (geminiApiKey) {
        headers["x-gemini-key"] = geminiApiKey;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: updatedHistory.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Sunucu ile iletişim kurulamadı.");
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: Math.random().toString(),
        role: "assistant",
        content: data.content,
        thoughts: data.thoughts, // The extracted high-level thoughts
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Auto expand thoughts for the latest message
      if (data.thoughts) {
        setVisibleThoughts(prev => ({
          ...prev,
          [assistantMessage.id]: true
        }));
      }

      setDbStats(prev => ({
        ...prev,
        reads: prev.reads + 1
      }));
    } catch (err: any) {
      console.error("AI chat failed:", err);
      const errorMessage: Message = {
        id: Math.random().toString(),
        role: "assistant",
        content: `Hata oluştu: ${err.message || "Gemini API yanıt vermedi."}. Lütfen API Anahtarınızın (.env.example veya Secrets ayarlarında) doğru şekilde yapılandırıldığından emin olun. Ayrıca Firestore Sandbox modunu kullanarak işlemlerinize devam edebilirsiniz.`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Toggle visible thoughts card
  const toggleThoughts = (msgId: string) => {
    setVisibleThoughts(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  // Save Settings Config
  const handleSaveConfig = () => {
    localStorage.setItem("nexus_firebase_config", JSON.stringify(firebaseConfig));
    alert("Firebase bağlantı ayarları başarıyla kaydedildi!");
    setUseRealFirebase(true);
  };

  // Clear Chat history
  const handleClearChat = () => {
    if (confirm("Sohbet geçmişini silmek istiyor musunuz?")) {
      setChatMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Sohbet geçmişi temizlendi. Gemini 3.1 Pro yüksek düzeyli düşünme motoruyla yeni bir sorgu başlatabilirsiniz.",
          timestamp: new Date()
        }
      ]);
    }
  };

  // Filtered documents inside current collection based on query
  const colDocs = collections[selectedCollection] || {};
  const filteredDocIds = Object.keys(colDocs).filter(docId => {
    if (!searchQuery.trim()) return true;
    const matchId = docId.toLowerCase().includes(searchQuery.toLowerCase());
    const dataStr = JSON.stringify(colDocs[docId]).toLowerCase();
    const matchContent = dataStr.includes(searchQuery.toLowerCase());
    return matchId || matchContent;
  });

  return (
    <div id="nexus_app" className="min-h-screen bg-[#020617] text-slate-100 font-sans relative flex flex-col justify-between overflow-x-hidden selection:bg-blue-500/30">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Glassmorphic Navigation Header */}
      <nav id="navbar" className="relative z-10 h-16 flex items-center justify-between px-6 bg-white/5 backdrop-blur-xl border-b border-white/10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/10">
            <Layers className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                CloudNexus Deployer & Firestore
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 border border-blue-500/30 text-blue-400 tracking-wider uppercase">
                Active Pro
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Automated GitHub Integration Console</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg border border-white/5">
          <button 
            onClick={() => setActiveTab("explorer")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === "explorer" ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"}`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Firestore Explorer</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("copilot")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === "copilot" ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"}`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span className="flex items-center space-x-1">
              <span>Thinking Copilot</span>
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping"></span>
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("settings")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === "settings" ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"}`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings & APIs</span>
          </button>
        </div>

        {/* User Auth Info & Actions */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex flex-col items-end text-xs">
            <span className="font-semibold text-slate-200">{user.displayName}</span>
            <span className="text-[10px] text-slate-400">{user.email}</span>
          </div>
          <div className="relative group">
            <img 
              src={user.photoURL} 
              alt={user.displayName} 
              className="w-9 h-9 rounded-full border-2 border-white/10 shadow-md group-hover:border-blue-400/50 transition-all cursor-pointer"
            />
            <div className="absolute right-0 top-11 bg-[#0f172a] border border-white/10 rounded-lg p-3 shadow-2xl hidden group-hover:block w-48 z-50">
              <p className="text-xs text-slate-400 font-medium mb-1">User Connection</p>
              <div className="h-px bg-white/10 my-2"></div>
              <p className="text-[10px] text-slate-400 break-all">{user.email}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                  {useRealFirebase ? "Live Firestore" : "Local Sandbox"}
                </span>
                <button 
                  onClick={() => {
                    setUser({
                      displayName: "Öğretici Kullanıcı",
                      email: "guest@nexus.io",
                      photoURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80",
                      isMock: true
                    });
                  }}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  Switch User
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container - Desktop-First Grid */}
      <main className="relative z-10 flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden max-w-[1600px] w-full mx-auto">
        
        {/* Left Side: Pipeline, GitHub Push Simulator & Real-time Console */}
        <aside id="pipeline_sidebar" className="col-span-12 lg:col-span-4 flex flex-col space-y-6">
          
          {/* GitHub Vercel Deploy Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl shadow-black/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Github className="w-5 h-5 text-slate-200" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Auto-Deployment</h3>
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${isDeploying ? "bg-amber-400 animate-ping" : "bg-green-400"}`}></span>
            </div>

            <div className="space-y-4">
              {/* Repository Section */}
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">GitHub Repository</p>
                    <p className="text-sm font-mono font-medium text-blue-300 flex items-center space-x-1.5 mt-0.5">
                      <span>{repoName}</span>
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      const newRepo = prompt("GitHub Repository adını güncelleyin:", repoName);
                      if (newRepo) setRepoName(newRepo);
                    }}
                    className="text-slate-400 hover:text-white p-1"
                    title="Edit Repo"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-500/10 border border-green-500/20 text-green-400 uppercase">
                    Connected (main)
                  </span>
                  <span className="text-[10px] text-slate-500">Auto-push hook setup</span>
                </div>
              </div>

              {/* Vercel live hosting section */}
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Live URL (Vercel Edge)</p>
                <a 
                  href={`https://${deployUrl}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-sm font-semibold text-slate-200 mt-0.5 flex items-center hover:text-blue-400 hover:underline transition-all"
                >
                  <span className="truncate">{deployUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5 shrink-0" />
                </a>
                <p className="text-[9px] text-slate-400 mt-1.5 flex items-center">
                  <CheckCircle2 className="w-3 h-3 text-green-400 mr-1 shrink-0" />
                  <span>Son Push: 2 dakika önce</span>
                </p>
              </div>

              {/* Firebase Online integration engine info */}
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Firebase Sync Engine</p>
                    <p className="text-xs font-mono text-amber-400 mt-0.5">
                      {useRealFirebase ? firebaseConfig.projectId || "real-firestore" : "local-sandbox-firestore"}
                    </p>
                  </div>
                  <Cloud className="w-4 h-4 text-orange-400 shrink-0" />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded ${useRealFirebase ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-blue-500/10 border border-blue-500/20 text-blue-400"}`}>
                    {useRealFirebase ? "Real Firestore Syncing" : "Simulated Local DB"}
                  </span>
                  <span className="text-slate-500">Auto Save enabled</span>
                </div>
              </div>
            </div>

            {/* Active Progress Bar or Trigger Push Button */}
            <div className="mt-5 pt-3 border-t border-white/5">
              {isDeploying ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-amber-400 animate-pulse">{deployStep}</span>
                    <span>%{deployProgress}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${deployProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={triggerGitHubPush}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.98] rounded-xl text-xs font-bold text-white flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/10 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>GitHub Push ve Vercel Build Başlat</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Terminal / Build Logs Container */}
          <div className="flex-1 min-h-[250px] bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col shadow-xl shadow-black/30">
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Vercel Build Console</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
              </div>
            </div>

            {/* Logs list */}
            <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 space-y-1.5 pr-1 max-h-[300px]">
              {buildLogs.map((log, index) => {
                let colorClass = "text-slate-300";
                if (log.includes("✔") || log.includes("Success")) colorClass = "text-green-400";
                if (log.includes("⚡") || log.includes("Triggering")) colorClass = "text-blue-400 font-semibold";
                if (log.includes("🎉")) colorClass = "text-indigo-400 font-bold";
                if (log.includes("🔥") || log.includes("warn")) colorClass = "text-amber-400";
                
                return (
                  <div key={index} className={`break-words ${colorClass}`}>
                    {log}
                  </div>
                );
              })}
              {isDeploying && (
                <div className="text-amber-400 animate-pulse flex items-center space-x-1 mt-1">
                  <span className="inline-block w-1.5 h-3 bg-amber-400 animate-blink"></span>
                  <span>Compiling assets...</span>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>

            <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
              <span>Sync Mode: WebSocket Stream</span>
              <span>Buffer: 100%</span>
            </div>
          </div>

        </aside>

        {/* Right Side Area: Explorer Panels or Gemini Assistant */}
        <section id="workspace_main" className="col-span-12 lg:col-span-8 flex flex-col space-y-6">
          
          {/* Top Database Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow hover:bg-white/10 transition-all">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Firestore Reads</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-light tracking-tight">{dbStats.reads.toLocaleString()}</span>
                <span className="text-xs font-semibold text-green-400">+12%</span>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow hover:bg-white/10 transition-all">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Firestore Writes</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-light tracking-tight">{dbStats.writes.toLocaleString()}</span>
                <span className="text-xs font-semibold text-slate-500">-2%</span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow hover:bg-white/10 transition-all">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Connected Region</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-lg font-light tracking-tight truncate">us-east-1 (N. Virginia)</span>
              </div>
            </div>
          </div>

          {/* Dynamic Content View depending on Tab */}
          {activeTab === "explorer" && (
            <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/40 min-h-[500px]">
              
              {/* Explorer Header */}
              <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/5">
                <div>
                  <h2 className="text-lg font-semibold flex items-center space-x-2">
                    <Database className="w-5 h-5 text-blue-400" />
                    <span>Firestore collections</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Database: <span className="font-mono text-blue-300">{useRealFirebase ? "Real Firestore Production (Online)" : "Local Storage Sandbox Mode"}</span>
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="Search documents..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-blue-500 w-48 transition-all placeholder:text-slate-500"
                    />
                  </div>
                  <button 
                    onClick={() => setShowNewDocModal(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Document</span>
                  </button>
                </div>
              </div>

              {/* Collections & Documents Inner Split Grid */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-white/10">
                
                {/* Left Panel: Collections selection & Documents listing */}
                <div className="w-full md:w-5/12 flex flex-col bg-black/10">
                  
                  {/* Collections List Row */}
                  <div className="p-3 border-b border-white/10 bg-black/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Collections</span>
                      <button 
                        onClick={() => setShowNewCollectionModal(true)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add collection</span>
                      </button>
                    </div>

                    {/* Collection items */}
                    <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                      {Object.keys(collections).map(colName => (
                        <button
                          key={colName}
                          onClick={() => {
                            setSelectedCollection(colName);
                            // Set selected doc to first doc in selected collection
                            const docs = Object.keys(collections[colName] || {});
                            if (docs.length > 0) {
                              setSelectedDocId(docs[0]);
                            } else {
                              setSelectedDocId("");
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCollection === colName ? "bg-blue-600 text-white shadow-md" : "bg-white/5 hover:bg-white/10 text-slate-300"}`}
                        >
                          {colName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Documents List inside selected collection */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[300px] md:max-h-[450px]">
                    <div className="flex justify-between items-center px-1 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Documents ({filteredDocIds.length})</span>
                      <span className="text-[10px] text-slate-500">Select to inspect</span>
                    </div>

                    {filteredDocIds.length === 0 ? (
                      <div className="p-8 text-center bg-white/2 rounded-xl border border-white/5">
                        <AlertCircle className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">Belge bulunamadı.</p>
                      </div>
                    ) : (
                      filteredDocIds.map(docId => {
                        const isActive = selectedDocId === docId;
                        const docPreview = collections[selectedCollection]?.[docId] || {};
                        const displayText = docPreview.display_name || docPreview.name || docPreview.item || docPreview.message || "No label field";
                        
                        return (
                          <div 
                            key={docId}
                            onClick={() => setSelectedDocId(docId)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer relative group flex items-center justify-between ${isActive ? "bg-white/10 border-white/20 shadow-md" : "bg-white/3 border-transparent hover:bg-white/5 hover:border-white/5"}`}
                          >
                            <div className="truncate pr-4 flex-1">
                              <p className="text-xs font-mono font-medium text-blue-300 truncate">{docId}</p>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">{displayText}</p>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDocument(docId);
                              }}
                              className="text-slate-500 hover:text-red-400 p-1.5 rounded-md hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Delete Doc"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Panel: Active Document Explorer, JSON display & live edit inputs */}
                <div className="flex-1 flex flex-col bg-black/20 overflow-hidden">
                  {selectedDocId && collections[selectedCollection]?.[selectedDocId] ? (
                    <div className="flex-1 flex flex-col overflow-y-auto">
                      
                      {/* Doc Header */}
                      <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Document ID:</span>
                          <span className="text-xs font-mono font-bold text-blue-300">{selectedDocId}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400">
                          / {selectedCollection} / {selectedDocId}
                        </span>
                      </div>

                      {/* Doc field fields fields inputs editor */}
                      <div className="p-5 space-y-4 flex-1">
                        
                        <div className="grid grid-cols-2 gap-4">
                          {Object.keys(editedDocData).map(fieldName => {
                            const isMetadata = fieldName === "metadata" || fieldName === "details";
                            return (
                              <div key={fieldName} className={`${isMetadata ? "col-span-2" : "col-span-1"} space-y-1`}>
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{fieldName}</label>
                                  <button 
                                    onClick={() => {
                                      const confirmDeleteField = confirm(`Delete field '${fieldName}'?`);
                                      if (confirmDeleteField) {
                                        const copy = { ...editedDocData };
                                        delete copy[fieldName];
                                        setEditedDocData(copy);
                                      }
                                    }}
                                    className="text-[9px] text-red-400 hover:underline"
                                  >
                                    Delete field
                                  </button>
                                </div>
                                {isMetadata ? (
                                  <textarea
                                    value={editedDocData[fieldName] || ""}
                                    onChange={(e) => setEditedDocData({ ...editedDocData, [fieldName]: e.target.value })}
                                    rows={5}
                                    className="w-full text-xs font-mono bg-black/40 p-3 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500/50 leading-relaxed text-slate-200"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={editedDocData[fieldName] || ""}
                                    onChange={(e) => setEditedDocData({ ...editedDocData, [fieldName]: e.target.value })}
                                    className="w-full text-xs bg-black/40 p-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500/50 text-slate-200"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Add Field Inline */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                          <button
                            onClick={() => {
                              const newField = prompt("Yeni alan adını (Key) girin:");
                              if (newField && newField.trim()) {
                                if (editedDocData[newField.trim()] !== undefined) {
                                  alert("Bu alan zaten mevcut.");
                                  return;
                                }
                                setEditedDocData({ ...editedDocData, [newField.trim()]: "" });
                              }
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Yeni Alan Ekle</span>
                          </button>
                        </div>

                        {/* Document raw JSON preview */}
                        <div className="space-y-1.5 pt-3 border-t border-white/5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Raw Document Payload (JSON)</label>
                          <pre className="text-[11px] text-slate-300 bg-black/60 p-4 rounded-xl border border-white/5 font-mono overflow-x-auto max-h-[160px]">
                            {JSON.stringify(editedDocData, null, 2)}
                          </pre>
                        </div>

                      </div>

                      {/* Action buttons */}
                      <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-end space-x-3 shrink-0">
                        <button 
                          onClick={() => {
                            // Reset state
                            const colData = collections[selectedCollection] || {};
                            setEditedDocData({ ...(colData[selectedDocId] || {}) });
                          }}
                          className="px-4 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5 transition-all"
                        >
                          Değişiklikleri Geri Al
                        </button>
                        <button 
                          onClick={handleUpdateDocument}
                          className="px-4 py-2 bg-white text-black font-bold rounded-lg text-xs hover:bg-slate-200 active:scale-95 transition-all flex items-center space-x-1 shadow cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Belgeyi Güncelle</span>
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                      <Database className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
                      <p className="text-sm font-semibold text-slate-300">İncelenecek Belge Yok</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">Sol listeden bir belge seçin veya yeni bir belge oluşturarak Firestore veritabanını test edin.</p>
                      <button 
                        onClick={() => setShowNewDocModal(true)}
                        className="mt-4 px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 rounded-xl text-xs font-semibold transition-all"
                      >
                        İlk Belgeyi Oluştur
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* AI Thinking Copilot Tab View */}
          {activeTab === "copilot" && (
            <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/40 min-h-[500px]">
              
              {/* Chat Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Brain className="w-4.5 h-4.5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold flex items-center space-x-2">
                      <span>Gemini 3.1 Pro Copilot</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300 font-bold tracking-widest uppercase">
                        High Thinking Mode Active
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Firebase schema, deployment diagnostics, and automated code advisor</p>
                  </div>
                </div>
                
                <button 
                  onClick={handleClearChat}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-slate-300 border border-white/5 hover:border-white/10 transition-all"
                >
                  Clear Chat
                </button>
              </div>

              {/* Inline API Key Warning Banner if missing */}
              {!geminiApiKey && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-2.5">
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-300">Gemini API Anahtarı Bulunamadı</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Thinking Copilot asistanını kullanabilmek için bir Gemini API Anahtarı girmeniz gerekir. 
                        <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline inline-flex items-center space-x-0.5 ml-1">
                          <span>Google AI Studio'dan Ücretsiz Al</span>
                          <span className="text-[9px]">↗</span>
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <input 
                      type="password"
                      placeholder="API Anahtarını Yapıştırın (AIzaSy...)"
                      value={geminiInput}
                      onChange={(e) => setGeminiInput(e.target.value)}
                      className="flex-1 sm:w-48 bg-black/50 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-amber-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => {
                        if (!geminiInput.trim()) {
                          alert("Lütfen geçerli bir API anahtarı girin!");
                          return;
                        }
                        setGeminiApiKey(geminiInput.trim());
                        localStorage.setItem("user_gemini_api_key", geminiInput.trim());
                        alert("API Anahtarı başarıyla kaydedildi! Copilot artık aktif.");
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              )}

              {/* Chat message listing */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[380px] md:max-h-[440px] bg-black/10">
                {chatMessages.map((msg) => {
                  const isAssistant = msg.role === "assistant";
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col space-y-2 ${isAssistant ? "items-start" : "items-end"}`}
                    >
                      {/* Sender label */}
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                        {isAssistant ? (
                          <>
                            <Brain className="w-3 h-3 text-purple-400" />
                            <span className="font-semibold">NEXUS AI COPIOLET</span>
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 text-blue-400" />
                            <span className="font-semibold">SEN (DEVELOPER)</span>
                          </>
                        )}
                        <span className="text-slate-500">•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Chat bubble body */}
                      <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                        isAssistant 
                          ? "bg-white/5 border border-white/10 text-slate-200" 
                          : "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                      }`}>
                        
                        {/* If assistant and has thinking process, show it as an elegant toggle */}
                        {isAssistant && msg.thoughts && (
                          <div className="mb-3 bg-black/40 border border-purple-500/20 rounded-xl overflow-hidden">
                            <button 
                              onClick={() => toggleThoughts(msg.id)}
                              className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-bold text-purple-300 bg-purple-500/10 hover:bg-purple-500/15 transition-all"
                            >
                              <span className="flex items-center space-x-1.5">
                                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                                <span>AI Düşünme Aşamaları (High Thinking Log)</span>
                              </span>
                              {visibleThoughts[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            
                            {visibleThoughts[msg.id] && (
                              <div className="p-3 text-[10px] font-mono leading-relaxed text-slate-400 border-t border-purple-500/10 max-h-[140px] overflow-y-auto whitespace-pre-wrap select-text selection:bg-purple-500/30">
                                {msg.thoughts}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actual Message text */}
                        <div className="whitespace-pre-wrap text-slate-100 select-text font-sans">
                          {msg.content}
                        </div>

                      </div>
                    </div>
                  );
                })}

                {isChatLoading && (
                  <div className="flex flex-col space-y-2 items-start animate-pulse">
                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                      <Brain className="w-3 h-3 text-purple-400 animate-spin" />
                      <span className="font-semibold">NEXUS AI COPIOLET DÜŞÜNÜYOR...</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-slate-400 max-w-[85%] flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-200"></div>
                      <span className="text-[10px] font-mono">Gemini 3.1 Pro is computing with deep reasoning...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form bar */}
              <div className="p-4 bg-white/5 border-t border-white/10 flex items-center space-x-3 bg-black/20">
                <input 
                  type="text" 
                  placeholder="Firestore kuralları nasıl yazılır? Vercel build logu nasıl çözülür?..." 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-purple-500 text-slate-200 placeholder:text-slate-500"
                  disabled={isChatLoading}
                />
                <button 
                  onClick={handleSendChat}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-md cursor-pointer"
                  disabled={isChatLoading || !chatInput.trim()}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Sor</span>
                </button>
              </div>

            </div>
          )}

          {/* Settings Tab View (Firebase Real Connection Setup) */}
          {activeTab === "settings" && (
            <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col shadow-2xl shadow-black/40 space-y-6">
              
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-base font-semibold flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <span>Firestore Connection Configurations</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Connect CloudNexus Dashboard directly to your live, online Firebase app or remain on offline local sandbox.
                </p>
              </div>

              {/* Connection Status Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                firebaseStatus === "connected" 
                  ? "bg-green-500/10 border-green-500/20 text-green-300"
                  : firebaseStatus === "connecting"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                  : firebaseStatus === "error"
                  ? "bg-red-500/10 border-red-500/20 text-red-300"
                  : "bg-white/5 border-white/10 text-slate-400"
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    firebaseStatus === "connected" ? "bg-green-500" :
                    firebaseStatus === "connecting" ? "bg-amber-500 animate-pulse" :
                    firebaseStatus === "error" ? "bg-red-500" : "bg-slate-500"
                  }`} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">
                      {firebaseStatus === "connected" ? "Real Firebase Live Connected" :
                       firebaseStatus === "connecting" ? "Establishing connection to Google Cloud..." :
                       firebaseStatus === "error" ? "Connection Failed" : "Offline Sandbox Mode"}
                    </p>
                    <p className="text-[11px] mt-0.5 opacity-80">
                      {firebaseStatus === "connected" ? `Syncing collections of '${firebaseConfig.projectId}' in real-time.` :
                       firebaseStatus === "connecting" ? "Synchronizing credential keys and SSL parameters..." :
                       firebaseStatus === "error" ? firebaseError : "All data read/write transactions are safely cached in localStorage."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setUseRealFirebase(!useRealFirebase)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition-all ${
                      useRealFirebase 
                        ? "bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/20" 
                        : "bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/20"
                    }`}
                  >
                    {useRealFirebase ? "Disconnect Live" : "Connect Live"}
                  </button>
                </div>
              </div>

              {/* Firebase Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Firebase API Key</label>
                  <input 
                    type="password" 
                    placeholder="AIzaSyA..."
                    value={firebaseConfig.apiKey}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                    className="w-full text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Firebase Auth Domain</label>
                  <input 
                    type="text" 
                    placeholder="my-project.firebaseapp.com"
                    value={firebaseConfig.authDomain}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, authDomain: e.target.value })}
                    className="w-full text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project ID</label>
                  <input 
                    type="text" 
                    placeholder="my-project-id"
                    value={firebaseConfig.projectId}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                    className="w-full text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage Bucket</label>
                  <input 
                    type="text" 
                    placeholder="my-project.appspot.com"
                    value={firebaseConfig.storageBucket}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, storageBucket: e.target.value })}
                    className="w-full text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">App ID</label>
                  <input 
                    type="text" 
                    placeholder="1:123456789:web:abcdef..."
                    value={firebaseConfig.appId}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, appId: e.target.value })}
                    className="w-full text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Database Realtime URL (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="https://my-project.firebaseio.com"
                    value={firebaseConfig.databaseURL}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, databaseURL: e.target.value })}
                    className="w-full text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Explanation note */}
              <div className="p-4 bg-white/3 rounded-xl border border-white/5 text-slate-400 text-xs leading-relaxed flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-300">Nasıl Kullanılır?</p>
                  <p className="mt-1">
                    Bu konsol hem yerel simülatör (Sandbox) hem de gerçek çevrimiçi (online) Firebase projesi ile çalışır. Kendi Firebase Console projenizden aldığınız Web SDK Yapılandırmasını (Firebase Config JSON) yukarıya girerek kaydettiğinizde, sistem otomatik olarak gerçek Firestore veritabanınıza bağlanarak verileri canlı olarak sekronize eder.
                  </p>
                </div>
              </div>

              {/* Gemini API Key Configuration Section */}
              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center space-x-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Gemini 3.1 Pro API Yapılandırması</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Thinking Copilot sohbet asistanının model sorgularını çalıştırabilmesi için kendi API Anahtarınızı bağlayın.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-1 w-full">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Gemini API Anahtarı</span>
                        {geminiApiKey ? (
                          <span className="text-green-400 font-semibold lowercase tracking-normal">✓ Bağlı ve Aktif</span>
                        ) : (
                          <span className="text-rose-400 font-semibold lowercase tracking-normal">✗ API Anahtarı Yok</span>
                        )}
                      </label>
                      <input 
                        type="password" 
                        placeholder="AIzaSyA..."
                        value={geminiInput}
                        onChange={(e) => setGeminiInput(e.target.value)}
                        className="w-full text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-purple-500 text-purple-200"
                      />
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 w-full md:w-auto justify-end">
                      {geminiApiKey && (
                        <button
                          onClick={() => {
                            if (confirm("API anahtarını silmek istiyor musunuz?")) {
                              setGeminiApiKey("");
                              setGeminiInput("");
                              localStorage.removeItem("user_gemini_api_key");
                            }
                          }}
                          className="px-4 py-2.5 border border-rose-500/20 hover:bg-rose-500/10 text-rose-300 rounded-lg text-xs font-medium transition-all"
                        >
                          Temizle
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setGeminiApiKey(geminiInput.trim());
                          localStorage.setItem("user_gemini_api_key", geminiInput.trim());
                          alert("Gemini API Anahtarı başarıyla güncellendi!");
                        }}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs hover:shadow-lg transition-all cursor-pointer"
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/10 text-slate-400 text-xs leading-relaxed">
                    <p className="font-semibold text-purple-300 flex items-center space-x-1.5 mb-1">
                      <Info className="w-3.5 h-3.5" />
                      <span>Gemini API Anahtarı Nasıl Alınır?</span>
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 mt-1 text-[11px] text-slate-300">
                      <li>
                        <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline inline-flex items-center space-x-0.5">
                          <span>Google AI Studio</span>
                          <span className="text-[9px]">↗</span>
                        </a> adresine gidin.
                      </li>
                      <li>Google hesabınızla giriş yapın ve sol üstteki <strong>"Get API Key"</strong> butonuna tıklayın.</li>
                      <li><strong>"Create API Key"</strong> seçeneğini seçin, ardından anahtarınızı kopyalayıp yukarıdaki alana yapıştırın ve Kaydet butonuna basın.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/5">
                <button 
                  onClick={() => {
                    if (confirm("Yapılandırmayı sıfırlamak istiyor musunuz?")) {
                      setFirebaseConfig({
                        apiKey: "",
                        authDomain: "",
                        projectId: "",
                        storageBucket: "",
                        messagingSenderId: "",
                        appId: "",
                        databaseURL: ""
                      });
                      setUseRealFirebase(false);
                      localStorage.removeItem("nexus_firebase_config");
                    }
                  }}
                  className="px-4 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5"
                >
                  Sıfırla
                </button>
                <button 
                  onClick={handleSaveConfig}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs hover:shadow-lg transition-all cursor-pointer"
                >
                  Bağlantıyı Kaydet ve Aktive Et
                </button>
              </div>

            </div>
          )}

        </section>

      </main>

      {/* Bottom Bar Info Panel */}
      <footer className="relative z-10 h-10 border-t border-white/10 bg-black/40 flex items-center justify-between px-6 text-[10px] text-slate-400 shrink-0">
        <div className="flex space-x-4">
          <span>Region: fra1-c (Frankfurt)</span>
          <span className="hidden sm:inline">•</span>
          <span>Node Version: v18.17.0</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-slate-500 font-mono">Build pipeline: Active GitHub Webhooks</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></span>
            <span>Syncing with Cloud Firestore...</span>
          </span>
        </div>
      </footer>

      {/* MODAL: Create New Document */}
      {showNewDocModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowNewDocModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center space-x-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span>Create New Document</span>
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Document ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. custom_doc_id"
                  value={newDocId}
                  onChange={(e) => setNewDocId(e.target.value)}
                  className="w-full text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 text-slate-200"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Fields (Key/Value list)</label>
                  <button 
                    onClick={() => setNewDocFields([...newDocFields, { key: "", value: "" }])}
                    className="text-[10px] text-blue-400 hover:underline"
                  >
                    + Add Field
                  </button>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {newDocFields.map((field, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="key" 
                        value={field.key}
                        onChange={(e) => {
                          const updated = [...newDocFields];
                          updated[idx].key = e.target.value;
                          setNewDocFields(updated);
                        }}
                        className="w-1/3 text-xs font-mono bg-black/40 p-2 rounded-lg border border-white/10 focus:outline-none text-slate-200"
                      />
                      <input 
                        type="text" 
                        placeholder="value" 
                        value={field.value}
                        onChange={(e) => {
                          const updated = [...newDocFields];
                          updated[idx].value = e.target.value;
                          setNewDocFields(updated);
                        }}
                        className="flex-1 text-xs bg-black/40 p-2 rounded-lg border border-white/10 focus:outline-none text-slate-200"
                      />
                      <button 
                        onClick={() => setNewDocFields(newDocFields.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300 text-xs p-1"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/5">
                <button 
                  onClick={() => setShowNewDocModal(false)}
                  className="px-4 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateDocument}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-500 shadow-md cursor-pointer"
                >
                  Create Document
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create New Collection */}
      {showNewCollectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button 
              onClick={() => setShowNewCollectionModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">
              Create New Collection
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Collection Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. transactions_live"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 text-slate-200"
                />
                <p className="text-[9px] text-slate-500 mt-1">Lowercase characters, digits, and underscores only.</p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/5">
                <button 
                  onClick={() => setShowNewCollectionModal(false)}
                  className="px-4 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateCollection}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-500 shadow-md cursor-pointer"
                >
                  Add Collection
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
