import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Upload, 
  Terminal as TermIcon, 
  History as HistIcon, 
  TrendingUp, 
  Cpu, 
  Settings, 
  FileText, 
  Download, 
  Send, 
  Bot, 
  Search, 
  Filter, 
  FileCode, 
  LogOut, 
  AlertTriangle, 
  CheckCircle, 
  Globe, 
  ChevronRight,
  User,
  Sliders,
  ShieldCheck,
  Server
} from "lucide-react";
import "./App.css";

// Import API client and Types
import { 
  api, 
  BASE_URL,
  tokenManager, 
  AnalysisReport, 
  HistoryItem, 
  WorkspaceSettings, 
  UserResponse 
} from "./services/api.ts";

import { useAuth } from "./context/AuthContext.tsx";
import { AuthPage } from "./components/AuthPage.tsx";


function App() {
  // Authentication State via Context
  const { isAuthenticated, user: currentUser, logout } = useAuth();

  // Navigation and Workspace State
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  
  // Scanner state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  
  // Reports and AI state
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeResultTab, setActiveResultTab] = useState<string>("overview");
  
  // AI Chat Assistant State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "ai" | "user"; text: string; timestamp: string }>>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatTyping, setIsChatTyping] = useState<boolean>(false);

  // Filters and Search for History/Analytics
  const [historySearch, setHistorySearch] = useState<string>("");
  const [historyFilter, setHistoryFilter] = useState<string>("ALL");
  const [analyticsFilterType, setAnalyticsFilterType] = useState<string>("ALL");

  // Settings & System configuration state
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>({
    active_ai_model: "gemini-1.5-pro",
    max_file_size_mb: 50,
    automatic_virustotal_lookup: true
  });
  const [adminUsersList, setAdminUsersList] = useState<UserResponse[]>([]);

  // Notifications and system feeds
  const [notifications, setNotifications] = useState<any[]>([]);

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalScans: 0,
    threatsDetected: 0,
    avgRiskScore: 0,
    peFilesScanned: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logTerminalEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll helpers
  useEffect(() => {
    if (logTerminalEndRef.current) {
      logTerminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [scanLogs]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatTyping]);

  // Fetch Telemetry datasets from API contract
  const fetchDashboardStats = async () => {
    try {
      const data = await api.dashboard.getStats();
      setStats({
        totalScans: data.total_scans,
        threatsDetected: data.threats_detected,
        avgRiskScore: data.avg_risk_score,
        peFilesScanned: data.pe_binaries_scanned
      });
    } catch (err) {
      console.error("Dashboard stats sync failed:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await api.history.getHistoryLogs({ 
        q: historySearch, 
        threat_level: historyFilter 
      });
      setHistory(data);
    } catch (err) {
      console.error("Failed to sync history logs:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await api.settings.getSettings();
      setWorkspaceSettings(data);
    } catch (err) {
      console.error("Failed to pull workspace configurations:", err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const data = await api.admin.listUsers();
      setAdminUsersList(data);
    } catch (err) {
      console.error("Admin user list pull failed:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await api.notifications.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to retrieve system feeds:", err);
    }
  };

  // Sync profile data on authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardStats();
      fetchHistory();
      fetchSettings();
      fetchAdminData();
      fetchNotifications();
    }
  }, [isAuthenticated, historyFilter, historySearch]);

  const handleLogout = async () => {
    await logout();
    setSelectedReport(null);
    setActiveTab("dashboard");
  };

  // Scanner Event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const startScan = async (selectedFile: File) => {
    if (!selectedFile) return;
    
    // File Size Validation
    const maxSizeBytes = workspaceSettings.max_file_size_mb * 1024 * 1024;
    if (selectedFile.size > maxSizeBytes) {
      setIsScanning(true);
      setScanLogs([
        `[ERROR] Upload rejected: File size (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB) exceeds allowed limit of ${workspaceSettings.max_file_size_mb} MB.`,
        `[!] Adjust max file size threshold inside Workspace Settings.`
      ]);
      setScanProgress(0);
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setSelectedReport(null);
    setAiExplanation("");
    setChatMessages([]);
    setScanLogs([
      `[*] Initializing connection gateway...`,
      `[*] Target sample selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`
    ]);

    try {
      // Step 1: Upload via XHR for progress tracking
      setScanLogs(prev => [...prev, "[*] Initiating payload upload sequence..."]);
      
      const uploadPromise = new Promise<{ task_id: string; status: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("file", selectedFile);

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setScanProgress(Math.round(pct * 0.4)); // upload counts as first 40%
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              resolve({ task_id: xhr.responseText, status: "Processing" });
            }
          } else {
            reject(new Error(`Upload failed with status code ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Connection error during upload.")));
        xhr.open("POST", `${BASE_URL}/api/files/upload`);
        
        const token = tokenManager.getAccessToken();
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }
        xhr.send(formData);
      });

      const uploadResult = await uploadPromise;
      setScanLogs(prev => [
        ...prev, 
        `[+] Payload received by server. Task ID generated: ${uploadResult.task_id.substring(0, 16)}...`,
        `[*] Spawning static parser thread (pefile & Shannon entropy analyzers)...`
      ]);
      setScanProgress(40);

      // Simulated logging step for aesthetics matching the contract parsing
      const logSteps = [
        { text: "[*] Parsing Portable Executable header structure...", progress: 55 },
        { text: "[*] Computing file entropy levels and section boundaries...", progress: 70 },
        { text: "[*] Scanning YARA heuristics & matched IOC signatures...", progress: 85 },
        { text: "[*] Finalizing telemetry report compilation...", progress: 95 }
      ];

      for (const step of logSteps) {
        await new Promise(r => setTimeout(r, 600));
        setScanLogs(prev => [...prev, step.text]);
        setScanProgress(step.progress);
      }

      // Step 2: Fetch report results (automatically handles mock fallback internally)
      const results = await api.analysis.getResults(uploadResult.task_id);
      
      setScanLogs(prev => [...prev, "[SUCCESS] Dissection completed. Data synchronized."]);
      setScanProgress(100);

      setTimeout(() => {
        setSelectedReport(results);
        setIsScanning(false);
        setFile(null);
        fetchHistory();
        fetchDashboardStats();
      }, 500);

    } catch (err: any) {
      console.error(err);
      setScanLogs(prev => [
        ...prev,
        `[ERROR] Dissection task failed. Reason: ${err.message || "Connection timed out."}`
      ]);
      setIsScanning(false);
    }
  };

  const loadPastReport = async (reportHash: string) => {
    try {
      const report = await api.analysis.getResults(reportHash);
      setSelectedReport(report);
      setAiExplanation("");
      setChatMessages([]);
      setActiveResultTab("overview");
      setActiveTab("scanner");
    } catch (err) {
      console.error("Failed to load archive report:", err);
    }
  };

  // AI Diagnostic Generator using api.ts AI explain service
  const generateAiReport = async (reportHash: string) => {
    setIsGeneratingAi(true);
    try {
      const data = await api.ai.explainReport(reportHash);
      setAiExplanation(data.explanation);
      
      setChatMessages([
        {
          sender: "ai",
          text: `Telemetry report generated. I have resolved the heuristic and structural patterns for **${selectedReport?.filename}** (Threat score: ${selectedReport?.risk_score}/100). Ask me anything regarding the threat tactics or DLL imports.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } catch (err) {
      setAiExplanation("Reasoning server error. Unable to translate telemetry data.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Chat queries consuming api.ts AI chat assistant service
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedReport) return;

    const userMsg = {
      sender: "user" as const,
      text: chatInput,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatTyping(true);

    try {
      const response = await api.ai.askAssistant(selectedReport.id, userMsg.text);
      setChatMessages(prev => [...prev, {
        sender: "ai",
        text: response.reply,
        timestamp: new Date(response.timestamp).toLocaleTimeString()
      }]);
    } catch (err) {
      setChatMessages(prev => [...prev, {
        sender: "ai",
        text: "Error: Chat gateway timeout. Failed to connect to engine.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  // Save Settings consuming api.ts settings PUT service
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.settings.updateSettings(workspaceSettings);
      setWorkspaceSettings(updated);
      alert("System configuration thresholds applied.");
    } catch (err) {
      alert("Failed to apply settings configurations.");
    }
  };

  // CSV/JSON logs downloader
  const handleExportText = () => {
    if (!selectedReport) return;
    
    const reportText = `======================================================
SANSEC AI SECURITY ANALYSIS SUMMARY
======================================================
Compiled On  : ${new Date(selectedReport.timestamp).toLocaleString()}
Target Name  : ${selectedReport.filename}
Format Tag   : ${selectedReport.file_type}
Risk Factor  : ${selectedReport.risk_score}/100 [${selectedReport.threat_level}]
Entropy      : ${selectedReport.entropy}

HASE LISTS:
- MD5    : ${selectedReport.hashes.md5}
- SHA256 : ${selectedReport.hashes.sha256}

MITRE ATT&CK BEHAVIORS:
${selectedReport.mitre_mappings.map(m => `- ${m.id}: ${m.technique} (${m.tactic})`).join("\n") || "- None"}
`;

    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SANSEC_REPORT_${selectedReport.filename.replace(/\.[^/.]+$/, "")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Compute stats distribution for analytics
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSearch = item.filename.toLowerCase().includes(historySearch.toLowerCase()) ||
                            item.id.toLowerCase().includes(historySearch.toLowerCase());
      
      if (historyFilter === "ALL") return matchesSearch;
      return matchesSearch && item.threat_level.toUpperCase() === historyFilter.toUpperCase();
    });
  }, [history, historySearch, historyFilter]);

  const severityStats = useMemo(() => {
    return {
      critical: history.filter(i => i.threat_level === "Critical").length,
      high: history.filter(i => i.threat_level === "High").length,
      medium: history.filter(i => i.threat_level === "Medium").length,
      low: history.filter(i => i.threat_level === "Low").length
    };
  }, [history]);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <Shield className="logo-shield" style={{ color: "var(--accent-gold)" }} />
          <div>
            <h1 className="logo-title">SANSEC <span className="gold-text">AI</span></h1>
            <span className="logo-subtitle">OPERATIONS CONSOLE</span>
          </div>
        </div>

        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => { setActiveTab("dashboard"); setSelectedReport(null); }}
          >
            📊 Workspace Dashboard
          </button>
          <button 
            className={`nav-item ${activeTab === "scanner" ? "active" : ""}`}
            onClick={() => setActiveTab("scanner")}
          >
            🔍 Heuristic Scanner
          </button>
          <button 
            className={`nav-item ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            📈 Threat Analytics
          </button>
          <button 
            className={`nav-item ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            🧾 Scan Records ({history.length})
          </button>
          <button 
            className={`nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            👤 Analyst Profile
          </button>
          <button 
            className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            ⚙️ System Settings
          </button>
          {currentUser?.role === "Admin" && (
            <button 
              className={`nav-item ${activeTab === "admin" ? "active" : ""}`}
              onClick={() => setActiveTab("admin")}
            >
              🛡️ Admin Registry
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <div 
            onClick={() => setActiveTab("profile")} 
            className="flex items-center gap-2 mb-2 pb-2 border-b border-color cursor-pointer hover:text-gold transition-colors"
            title="Click to view Analyst Profile"
          >
            <User size={14} className="text-gold" />
            <span className="text-xs font-semibold mono">{currentUser?.username || "Analyst"} ({currentUser?.role || "User"})</span>
          </div>
          <div className="status-indicator">
            <span className="status-dot online"></span>
            <span>API GATEWAY: ONLINE</span>
          </div>
          <div className="status-indicator">
            <span className="status-dot warning"></span>
            <span>AI ENGINE: READY</span>
          </div>
          
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={14} />
            <span>Terminal Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="workspace-main">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="topbar">
                <div>
                  <h2>Security Operations Command Dashboard</h2>
                  <p className="text-secondary text-sm">Real-time malware analysis and explainable diagnostics</p>
                </div>
                <div className="time-badge mono">
                  📅 UTC: {new Date().toISOString().split("T")[0]}
                </div>
              </div>

              {/* Stats Row */}
              <div className="stats-row">
                <div className="glow-card stat-card">
                  <span className="stat-label">Total Scans Run</span>
                  <span className="stat-value text-teal">{stats.totalScans}</span>
                </div>
                <div className="glow-card stat-card">
                  <span className="stat-label">Malicious Heuristics Flagged</span>
                  <span className="stat-value text-red">{stats.threatsDetected}</span>
                </div>
                <div className="glow-card stat-card">
                  <span className="stat-label">Mean Workspace Threat Factor</span>
                  <span className="stat-value text-gold">{stats.avgRiskScore}/100</span>
                </div>
                <div className="glow-card stat-card">
                  <span className="stat-label">PE Executables Dissected</span>
                  <span className="stat-value">{stats.peFilesScanned}</span>
                </div>
              </div>

              {/* Summary dashboard section */}
              <div className="dashboard-default grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glow-card info-card welcome-panel lg:col-span-2">
                  <h3>Operations Command Active</h3>
                  <p className="text-secondary mt-2">
                    Dissect binary samples using safe static parsing methods. Drag-and-drop file executables to parse sections structures, compile cryptographic hashes, list suspicious API call imports, and map matched behaviors to standard MITRE ATT&CK matrices.
                  </p>
                  <div className="flex gap-4 mt-6">
                    <button className="btn-primary" onClick={() => setActiveTab("scanner")}>
                      Dissect Target Sample
                    </button>
                    <button className="btn-secondary" onClick={() => setActiveTab("analytics")}>
                      Disassembly Trends
                    </button>
                  </div>
                </div>

                <div className="glow-card flex flex-col justify-between">
                  <div>
                    <h4 className="flex items-center gap-2"><Server size={16} className="text-teal" /> Gateway Telemetry</h4>
                    <p className="text-secondary text-xs mt-2 leading-relaxed">
                      All calculations are performed strictly via static metadata extraction. The sample instructions are never executed on the host filesystem.
                    </p>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex justify-between text-xs border-b border-color py-1">
                      <span className="text-muted">Parser Config</span>
                      <span className="text-teal font-semibold mono">Active (LIEF)</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-color py-1">
                      <span className="text-muted">AI Diagnostic Model</span>
                      <span className="text-gold font-semibold mono">{workspaceSettings.active_ai_model}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Activities List */}
                <div className="glow-card lg:col-span-2">
                  <h4>Recent Analysis Activity Logs</h4>
                  {history.length > 0 ? (
                    <div className="recent-list-summary mt-4">
                      {history.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="recent-list-summary-item" onClick={() => loadPastReport(item.id)}>
                          <div className="flex justify-between items-center">
                            <span className="bold text-sm text-truncate" style={{ maxWidth: '280px' }}>{item.filename}</span>
                            <span className={`badge badge-${item.threat_level.toLowerCase()}`}>{item.risk_score}/100</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted mt-1 mono">
                            <span>Hash: {item.id.slice(0, 16)}...</span>
                            <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-secondary text-sm mt-4">No records found on the current workspace registry.</p>
                  )}
                </div>

                <div className="glow-card">
                  <h4>Live Alerts Feed</h4>
                  <div className="mt-4 flex flex-col gap-3">
                    {notifications.slice(0, 2).map((not, idx) => (
                      <div key={idx} className={`feed-alert border-l-2 pl-3 ${
                        not.severity === 'critical' ? 'border-red-500' : 'border-yellow-500'
                      }`}>
                        <span className="text-xs text-muted block mono">{not.severity.toUpperCase()}</span>
                        <p className="text-xs font-semibold">{not.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "scanner" && (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {selectedReport ? (
                <div className="results-container">
                  <div className="results-header">
                    <div>
                      <div className="flex items-center gap-3">
                        <FileCode className="text-gold" size={24} />
                        <h3>Telemetry Details: <span className="text-gold">{selectedReport.filename}</span></h3>
                      </div>
                      <p className="text-secondary text-xs mono mt-1">SHA256: {selectedReport.id}</p>
                    </div>
                    <div className="flex gap-3">
                      <button className="btn-secondary btn-sm" onClick={handleExportText}>
                        <Download size={14} /> Export Report
                      </button>
                      <button className="btn-primary btn-sm" onClick={() => setSelectedReport(null)}>
                        Dissect New Sample
                      </button>
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="inner-tabs-row">
                    <button 
                      className={`inner-tab ${activeResultTab === "overview" ? "active" : ""}`}
                      onClick={() => setActiveResultTab("overview")}
                    >
                      📊 Risk Overview
                    </button>
                    {selectedReport.pe_info && selectedReport.pe_info.is_pe && (
                      <button 
                        className={`inner-tab ${activeResultTab === "pe" ? "active" : ""}`}
                        onClick={() => setActiveResultTab("pe")}
                      >
                        ⚙️ PE Structure
                      </button>
                    )}
                    <button 
                      className={`inner-tab ${activeResultTab === "iocs" ? "active" : ""}`}
                      onClick={() => setActiveResultTab("iocs")}
                    >
                      🌐 Hardcoded IOCs
                    </button>
                    <button 
                      className={`inner-tab ${activeResultTab === "ai" ? "active" : ""}`}
                      onClick={() => setActiveResultTab("ai")}
                    >
                      🤖 AI Explainer
                    </button>
                    <button 
                      className={`inner-tab ${activeResultTab === "chat" ? "active" : ""}`}
                      onClick={() => {
                        setActiveResultTab("chat");
                        if (!aiExplanation && selectedReport) {
                          generateAiReport(selectedReport.id);
                        }
                      }}
                    >
                      💬 Conversational AI
                    </button>
                  </div>

                  <div className="result-tab-content">
                    {activeResultTab === "overview" && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in">
                        {/* Risk Gauge */}
                        <div className="glow-card flex flex-col items-center justify-center p-6 text-center">
                          <h4>Threat Assessment Score</h4>
                          <div className="dial-container my-4">
                            <div className="risk-dial" style={{ 
                              borderColor: selectedReport.risk_score >= 75 ? "var(--threat-critical)" :
                                           selectedReport.risk_score >= 50 ? "var(--threat-high)" :
                                           selectedReport.risk_score >= 25 ? "var(--threat-medium)" :
                                           "var(--threat-low)"
                            }}>
                              <span className="dial-number mono">{selectedReport.risk_score}</span>
                              <span className="dial-label">RISK LEVEL</span>
                            </div>
                          </div>
                          <span className={`badge badge-${selectedReport.threat_level.toLowerCase()} px-4 py-2 text-sm`}>
                            {selectedReport.threat_level} Severity
                          </span>
                        </div>

                        {/* File Details Properties */}
                        <div className="glow-card lg:col-span-2 info-card">
                          <h4>File Properties</h4>
                          <table className="info-table">
                            <tbody>
                              <tr>
                                <td>File Name</td>
                                <td className="text-right bold">{selectedReport.filename}</td>
                              </tr>
                              <tr>
                                <td>Format Type</td>
                                <td className="text-right text-teal">{selectedReport.file_type}</td>
                              </tr>
                              <tr>
                                <td>File Size</td>
                                <td className="text-right mono">{(selectedReport.size / 1024).toFixed(2)} KB ({selectedReport.size} bytes)</td>
                              </tr>
                              <tr>
                                <td>Shannon Entropy</td>
                                <td className="text-right mono bold">{selectedReport.entropy}</td>
                              </tr>
                              <tr>
                                <td>SHA256 Checksum</td>
                                <td className="text-right mono text-xs select-all">{selectedReport.hashes.sha256}</td>
                              </tr>
                              <tr>
                                <td>MD5 Checksum</td>
                                <td className="text-right mono text-xs select-all">{selectedReport.hashes.md5}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Heuristic Violations Signatures */}
                        <div className="glow-card lg:col-span-2">
                          <h4>Engine Heuristic Matches</h4>
                          {selectedReport.signatures.length > 0 ? (
                            <div className="sig-list">
                              {selectedReport.signatures.map((sig, i) => (
                                <div key={i} className="sig-item">
                                  <div className="sig-header">
                                    <span className="sig-title">{sig.name}</span>
                                    <span className={`badge badge-${sig.severity.toLowerCase()}`}>{sig.severity}</span>
                                  </div>
                                  <p className="sig-desc">{sig.description}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-secondary text-sm">No heuristic alerts triggered. Structurally clean signature profile.</p>
                          )}
                        </div>

                        {/* MITRE Mapping */}
                        <div className="glow-card">
                          <h4>MITRE ATT&CK Matrix Mapping</h4>
                          {selectedReport.mitre_mappings.length > 0 ? (
                            <div className="mitre-list">
                              {selectedReport.mitre_mappings.map((m, i) => (
                                <div key={i} className="mitre-item">
                                  <span className="mitre-id mono">{m.id}</span>
                                  <div className="mitre-details">
                                    <div className="mitre-tech">{m.technique}</div>
                                    <div className="mitre-tactic">{m.tactic}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-secondary text-sm mt-4 text-center">
                              No suspicious MITRE ATT&CK behaviors identified.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {activeResultTab === "pe" && selectedReport.pe_info && (
                      <div className="grid grid-cols-1 gap-6 fade-in">
                        <div className="glow-card pe-card">
                          <h4>Portable Executable Properties</h4>
                          <div className="pe-meta-grid">
                            <div>
                              <span className="text-muted text-xs">ARCHITECTURAL TARGET</span>
                              <div className="bold">{selectedReport.pe_info.machine}</div>
                            </div>
                            <div>
                              <span className="text-muted text-xs">ENTRY POINT ADDRESS</span>
                              <div className="bold mono text-gold">{selectedReport.pe_info.entry_point}</div>
                            </div>
                          </div>

                          <h5>Memory Layout Sections ({selectedReport.pe_info.sections?.length})</h5>
                          <div className="table-wrapper">
                            <table className="section-table">
                              <thead>
                                <tr>
                                  <th>Section Name</th>
                                  <th>Raw Size</th>
                                  <th>Virtual Size</th>
                                  <th>Entropy</th>
                                  <th>Characteristics Flags</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedReport.pe_info.sections?.map((sec, i) => (
                                  <tr key={i}>
                                    <td className="mono bold">{sec.name || ".empty"}</td>
                                    <td className="mono text-xs">{sec.raw_size}</td>
                                    <td className="mono text-xs">{sec.virtual_size}</td>
                                    <td className={`mono text-xs ${sec.entropy > 7.2 ? 'text-red' : ''}`}>{sec.entropy}</td>
                                    <td>
                                      <span className="flags-list">
                                        {sec.readable && <span className="flag-tag">R</span>}
                                        {sec.writable && <span className="flag-tag flag-w">W</span>}
                                        {sec.executable && <span className="flag-tag flag-x">X</span>}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Suspicious API list */}
                          {selectedReport.pe_info.suspicious_apis && selectedReport.pe_info.suspicious_apis.length > 0 && (
                            <div style={{ marginTop: '24px' }}>
                              <h5>Suspicious API Call Imports ({selectedReport.pe_info.suspicious_apis.length})</h5>
                              <div className="susp-api-list">
                                {selectedReport.pe_info.suspicious_apis.map((api, idx) => (
                                  <div key={idx} className="api-chip">
                                    <span className="api-name mono">{api.api}</span>
                                    <span className="api-category">{api.category}</span>
                                    <span className="text-muted text-xs font-mono">{api.dll}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeResultTab === "iocs" && (
                      <div className="glow-card fade-in">
                        <h4>Hardcoded Indicators of Compromise</h4>
                        <p className="text-secondary text-sm mt-1">Discovered network and contact details extracted from compiled text assets</p>
                        
                        <div className="ioc-section mt-6">
                          <div className="ioc-group">
                            <h5>URL Link Structures ({selectedReport.iocs.urls.length})</h5>
                            {selectedReport.iocs.urls.length > 0 ? (
                              <ul className="ioc-list">
                                {selectedReport.iocs.urls.map((url, i) => (
                                  <li key={i} className="mono text-xs text-truncate" title={url}>{url}</li>
                                ))}
                              </ul>
                            ) : <p className="text-secondary text-xs mt-2">No URL strings found.</p>}
                          </div>

                          <div className="ioc-group">
                            <h5>Domain Records ({selectedReport.iocs.domains.length})</h5>
                            {selectedReport.iocs.domains.length > 0 ? (
                              <ul className="ioc-list">
                                {selectedReport.iocs.domains.map((dom, i) => (
                                  <li key={i} className="mono text-sm">{dom}</li>
                                ))}
                              </ul>
                            ) : <p className="text-secondary text-xs mt-2">No domain references identified.</p>}
                          </div>

                          <div className="ioc-group">
                            <h5>IP Target Connections ({selectedReport.iocs.ips.length})</h5>
                            {selectedReport.iocs.ips.length > 0 ? (
                              <ul className="ioc-list">
                                {selectedReport.iocs.ips.map((ip, i) => (
                                  <li key={i} className="mono text-sm text-red">{ip}</li>
                                ))}
                              </ul>
                            ) : <p className="text-secondary text-xs mt-2">No IPv4 targets identified.</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeResultTab === "ai" && (
                      <div className="glow-card fade-in">
                        <div className="ai-card-header">
                          <div className="flex items-center gap-2">
                            <Bot className="text-gold animate-pulse" size={24} />
                            <h4>🧠 Explainable AI Diagnostic Report</h4>
                          </div>
                          {!aiExplanation && !isGeneratingAi && (
                            <button 
                              className="btn-primary btn-sm"
                              onClick={() => generateAiReport(selectedReport.id)}
                            >
                              Request AI Diagnosis
                            </button>
                          )}
                        </div>

                        {isGeneratingAi && (
                          <div className="ai-loading-box">
                            <div className="cyber-spinner"></div>
                            <p className="mono text-gold text-xs mt-4">Generating explainable assessment...</p>
                          </div>
                        )}

                        {aiExplanation && (
                          <div className="ai-report-body fade-in">
                            <div className="ai-markdown">
                              {aiExplanation.split("\n").map((line, index) => {
                                if (line.startsWith("###")) {
                                  return <h4 key={index} className="text-gold font-semibold mt-4 mb-2">{line.replace("###", "").trim()}</h4>;
                                } else if (line.startsWith("-")) {
                                  return <li key={index} className="text-sm text-secondary ml-4 mb-1 list-disc">{line.replace("-", "").trim()}</li>;
                                } else if (line.trim().match(/^\d+\./)) {
                                  return <p key={index} className="text-sm font-semibold text-primary mt-3">{line.trim()}</p>;
                                } else if (line.includes("**")) {
                                  const parts = line.split("**");
                                  return (
                                    <p key={index} className="text-sm text-secondary mb-2 leading-relaxed">
                                      {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-primary">{p}</strong> : p)}
                                    </p>
                                  );
                                } else if (line.trim() === "") {
                                  return <div key={index} className="h-2" />;
                                } else {
                                  return <p key={index} className="text-sm text-secondary mb-2 leading-relaxed">{line}</p>;
                                }
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeResultTab === "chat" && (
                      <div className="glow-card flex flex-col fade-in chat-console-card">
                        <div className="chat-header border-b border-color pb-3">
                          <div className="flex items-center gap-3">
                            <Bot className="text-gold" size={20} />
                            <div>
                              <h5 className="font-semibold text-sm">SANSEC Chat Assistant Console</h5>
                              <span className="text-xs text-muted">Ready to discuss details for {selectedReport.filename}</span>
                            </div>
                          </div>
                        </div>

                        <div className="chat-message-area">
                          {chatMessages.length > 0 ? (
                            chatMessages.map((msg, i) => (
                              <div key={i} className={`chat-message ${msg.sender}`}>
                                <div className="chat-message-bubble">
                                  <p className="text-sm">{msg.text}</p>
                                  <span className="chat-time text-xs mt-1 block mono text-muted text-right">{msg.timestamp}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-10">
                              <p className="text-secondary text-sm">Request AI diagnosis to initialize conversation.</p>
                            </div>
                          )}
                          
                          {isChatTyping && (
                            <div className="chat-message ai">
                              <div className="chat-message-bubble">
                                <div className="flex gap-1 items-center py-2 px-1">
                                  <span className="chat-dot animate-bounce">.</span>
                                  <span className="chat-dot animate-bounce delay-100">.</span>
                                  <span className="chat-dot animate-bounce delay-200">.</span>
                                </div>
                              </div>
                            </div>
                          )}
                          <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={handleSendChat} className="chat-input-row border-t border-color pt-3 flex gap-2">
                          <input 
                            type="text"
                            placeholder="Ask AI: What is the significance of the entropy score? / List suspicious imports"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            disabled={chatMessages.length === 0}
                            className="chat-text-input"
                          />
                          <button type="submit" disabled={chatMessages.length === 0} className="btn-primary chat-send-btn">
                            <Send size={16} />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Scanner View */
                <div className="scanner-container">
                  <div className="topbar">
                    <div>
                      <h2>Static File Analyzer Console</h2>
                      <p className="text-secondary text-sm">Dissect binary headers, entropy levels, and match signatures safely</p>
                    </div>
                  </div>

                  <div 
                    className={`glow-card dropzone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                    
                    <div className="dropzone-content pointer-events-none">
                      <Upload className="mx-auto text-muted mb-4" size={48} />
                      {file ? (
                        <div>
                          <h4 className="text-gold font-semibold">{file.name}</h4>
                          <p className="text-secondary text-xs mono mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                          <p className="text-teal text-xs font-semibold mt-3">File Loaded. Ready to run console.</p>
                        </div>
                      ) : (
                        <div>
                          <h4 className="font-semibold">Drag and Drop target file to dissect</h4>
                          <p className="text-secondary text-sm mt-1">or click to choose file from system browser</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {file && !isScanning && (
                    <div className="text-center mt-6">
                      <button className="btn-primary px-8 py-3" onClick={() => startScan(file)}>
                        🚀 Initialize Dissect Scan
                      </button>
                    </div>
                  )}

                  {!isScanning && (
                    <div className="mt-8">
                      <h4 className="mono text-xs text-gold uppercase tracking-wider mb-3">Recent Dissections History</h4>
                      {history.length > 0 ? (
                        <div className="glow-card p-0 overflow-hidden">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead>
                              <tr className="bg-secondary border-b border-color text-muted font-semibold uppercase">
                                <th className="p-3">Filename</th>
                                <th className="p-3">Risk Level</th>
                                <th className="p-3">Risk Score</th>
                                <th className="p-3">Timestamp</th>
                              </tr>
                            </thead>
                            <tbody>
                              {history.slice(0, 5).map((item, idx) => (
                                <tr 
                                  key={idx} 
                                  className="border-b border-color hover:bg-secondary cursor-pointer transition-colors"
                                  onClick={() => loadPastReport(item.id)}
                                >
                                  <td className="p-3 font-semibold text-primary">{item.filename}</td>
                                  <td className="p-3">
                                    <span className={`badge badge-${item.threat_level.toLowerCase()} text-xs`}>
                                      {item.threat_level}
                                    </span>
                                  </td>
                                  <td className="p-3 mono font-semibold">{item.risk_score}/100</td>
                                  <td className="p-3 text-muted mono">{item.timestamp}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-6 border border-dashed border-color rounded-lg bg-secondary">
                          <p className="text-secondary text-xs">No reports registered in session history.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {isScanning && (
                    <div className="glow-card terminal-card mt-6">
                      <div className="terminal-header">
                        <span className="terminal-dot red"></span>
                        <span className="terminal-dot yellow"></span>
                        <span className="terminal-dot green"></span>
                        <span className="terminal-title mono">SANSEC DISSECTION ENGINE</span>
                      </div>
                      <div className="terminal-progress">
                        <div className="progress-bar-fill" style={{ width: `${scanProgress}%` }}></div>
                      </div>
                      <div className="terminal-body mono">
                        {scanLogs.map((log, idx) => (
                          <div key={idx} className="terminal-line">{log}</div>
                        ))}
                        <div className="terminal-cursor-line">
                          <span>_</span>
                        </div>
                        <div ref={logTerminalEndRef}></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="topbar">
                <div>
                  <h2>Threat Intelligence Analytics</h2>
                  <p className="text-secondary text-sm">Platform telemetry metrics and severity profile breakdowns</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Donut Chart */}
                <div className="glow-card flex flex-col items-center justify-center p-6 text-center">
                  <h4>Threat Severity Distribution</h4>
                  <div className="my-6 relative flex items-center justify-center" style={{ width: '200px', height: '200px' }}>
                    <svg width="180" height="180" viewBox="0 0 100 100">
                      {history.length > 0 ? (
                        <>
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border-color)" strokeWidth="8" />
                          <circle cx="50" cy="50" r="40" fill="transparent" 
                            stroke="var(--threat-critical)" 
                            strokeWidth="8" 
                            strokeDasharray={`${Math.max(0, (severityStats.critical / history.length) * 251.2)} 251.2`} 
                            transform="rotate(-90 50 50)"
                          />
                          <circle cx="50" cy="50" r="40" fill="transparent" 
                            stroke="var(--threat-high)" 
                            strokeWidth="8" 
                            strokeDasharray={`${Math.max(0, (severityStats.high / history.length) * 251.2)} 251.2`} 
                            strokeDashoffset={`-${Math.max(0, (severityStats.critical / history.length) * 251.2)}`}
                            transform="rotate(-90 50 50)"
                          />
                          <circle cx="50" cy="50" r="40" fill="transparent" 
                            stroke="var(--threat-medium)" 
                            strokeWidth="8" 
                            strokeDasharray={`${Math.max(0, (severityStats.medium / history.length) * 251.2)} 251.2`} 
                            strokeDashoffset={`-${Math.max(0, ((severityStats.critical + severityStats.high) / history.length) * 251.2)}`}
                            transform="rotate(-90 50 50)"
                          />
                        </>
                      ) : (
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border-color)" strokeWidth="8" />
                      )}
                    </svg>
                    <div className="absolute text-center">
                      <span className="mono text-2xl font-bold">{history.length}</span>
                      <span className="text-muted text-xs block uppercase">TOTAL ITEMS</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full text-xs text-left">
                    <div className="flex justify-between items-center border-b border-color py-1">
                      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span>Critical</span>
                      <span className="font-semibold">{severityStats.critical} ({history.length ? Math.round((severityStats.critical / history.length)*100) : 0}%)</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-color py-1">
                      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span>High</span>
                      <span className="font-semibold">{severityStats.high} ({history.length ? Math.round((severityStats.high / history.length)*100) : 0}%)</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-color py-1">
                      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>Medium</span>
                      <span className="font-semibold">{severityStats.medium} ({history.length ? Math.round((severityStats.medium / history.length)*100) : 0}%)</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span>Low</span>
                      <span className="font-semibold">{severityStats.low} ({history.length ? Math.round((severityStats.low / history.length)*100) : 0}%)</span>
                    </div>
                  </div>
                </div>

                {/* Histogram Bar Chart */}
                <div className="glow-card lg:col-span-2">
                  <h4>Threat Score Distributions</h4>
                  <p className="text-secondary text-xs mt-1">Histogram representation of threat score levels across processed samples</p>
                  
                  <div className="my-8 h-48 w-full flex items-end justify-between border-b border-l border-color pb-2 pl-2">
                    {history.length > 0 ? (
                      history.slice(0, 10).reverse().map((item, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2 w-1/12">
                          <div 
                            className="w-8 rounded-t bg-gradient-to-t from-yellow-600 to-amber-400 hover:from-yellow-400 transition-all duration-300"
                            style={{ 
                              height: `${item.risk_score}px`, 
                              maxHeight: '160px',
                              opacity: 0.8
                            }}
                            title={`Score: ${item.risk_score}`}
                          ></div>
                          <span className="text-xs text-truncate text-muted mono w-full text-center" style={{ fontSize: '0.65rem' }}>
                            {item.filename.slice(0, 5)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="w-full text-center text-muted text-sm pb-10">
                        Insufficient telemetry data to build charts.
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted">
                    <span>&larr; Past analysis files</span>
                    <span>Active workspace registry logs &rarr;</span>
                  </div>
                </div>

                {/* Data Exports */}
                <div className="glow-card lg:col-span-3">
                  <h4>Database Exports</h4>
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                    <p className="text-secondary text-sm">Export full platform threat registry in standard machine formats</p>
                    <div className="flex gap-3">
                      <button className="btn-secondary btn-sm" onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute("href", dataStr);
                        downloadAnchor.setAttribute("download", `SANSEC_TELEMETRY_EXPORT_${new Date().toISOString().split("T")[0]}.json`);
                        downloadAnchor.click();
                      }}>
                        Export JSON Matrix
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => {
                        let csvContent = "data:text/csv;charset=utf-8,ID,Filename,Size,RiskScore,ThreatLevel,Timestamp\n";
                        history.forEach(item => {
                          csvContent += `"${item.id}","${item.filename}",${item.size},${item.risk_score},"${item.threat_level}","${item.timestamp}"\n`;
                        });
                        const encodedUri = encodeURI(csvContent);
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute("href", encodedUri);
                        downloadAnchor.setAttribute("download", `SANSEC_TELEMETRY_EXPORT_${new Date().toISOString().split("T")[0]}.csv`);
                        downloadAnchor.click();
                      }}>
                        Export CSV Table
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="topbar">
                <div>
                  <h2>Threat Telemetry Archival Logs</h2>
                  <p className="text-secondary text-sm">Browse, search, and reopen compiled malware analysis files</p>
                </div>
              </div>

              {/* Filtering / Search tools */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="relative flex-grow max-w-md">
                  <Search className="absolute left-3 top-3 text-muted" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search by file name or SHA256 hash..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="search-input-box w-full"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <Filter className="text-muted" size={16} />
                  <span className="text-xs text-muted uppercase font-semibold">Filter:</span>
                  <div className="flex gap-2">
                    {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((level, i) => (
                      <button 
                        key={i}
                        className={`btn-filter-tag text-xs ${historyFilter === level ? "active" : ""}`}
                        onClick={() => setHistoryFilter(level)}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="glow-card table-card">
                {filteredHistory.length > 0 ? (
                  <div className="table-wrapper">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>File Name</th>
                          <th>Format</th>
                          <th>File Size</th>
                          <th>Threat Risk</th>
                          <th>Severity Class</th>
                          <th>Report HASH (SHA256)</th>
                          <th>Dissection Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map((item, idx) => (
                          <tr key={idx} className="history-row" onClick={() => loadPastReport(item.id)}>
                            <td className="bold text-truncate" style={{ maxWidth: '180px' }}>{item.filename}</td>
                            <td className="text-teal text-xs">{item.file_type.split(" (")[0]}</td>
                            <td className="mono text-xs">{(item.size / 1024).toFixed(1)} KB</td>
                            <td className="mono bold">{item.risk_score}/100</td>
                            <td>
                              <span className={`badge badge-${item.threat_level.toLowerCase()}`}>
                                {item.threat_level}
                              </span>
                            </td>
                            <td className="mono text-muted text-xs">{item.id.slice(0, 16)}...</td>
                            <td className="text-secondary text-xs">{new Date(item.timestamp).toLocaleString()}</td>
                            <td>
                              <button className="btn-secondary btn-xs flex items-center gap-1">
                                Open <ChevronRight size={10} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-secondary text-sm">No analysis reports match the filter query.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="topbar">
                <div>
                  <h2>Workspace System Settings</h2>
                  <p className="text-secondary text-sm">Adjust heuristic bounds and active generative reasoning models</p>
                </div>
              </div>

              <div className="glow-card max-w-2xl">
                <form onSubmit={handleUpdateSettings} className="flex flex-col gap-6">
                  <div className="form-group">
                    <label className="flex items-center gap-2"><Bot size={14} /> Active Generative AI Explainer Model</label>
                    <select 
                      value={workspaceSettings.active_ai_model}
                      onChange={(e) => setWorkspaceSettings(prev => ({ ...prev, active_ai_model: e.target.value }))}
                      className="login-input bg-[#12141a]"
                    >
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep reasoning)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Latency-optimized)</option>
                      <option value="gemini-2.0-flash-exp">Gemini 2.0 Experimental</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="flex items-center gap-2"><Sliders size={14} /> Max File Upload Size Constraint (MB)</label>
                    <input 
                      type="number"
                      value={workspaceSettings.max_file_size_mb}
                      onChange={(e) => setWorkspaceSettings(prev => ({ ...prev, max_file_size_mb: parseInt(e.target.value) || 50 }))}
                      className="login-input"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-color pt-4">
                    <div>
                      <h5 className="font-semibold text-sm">Automatic VirusTotal Lookup</h5>
                      <span className="text-secondary text-xs">Execute dynamic metadata hash checks on upload.</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={workspaceSettings.automatic_virustotal_lookup}
                      onChange={(e) => setWorkspaceSettings(prev => ({ ...prev, automatic_virustotal_lookup: e.target.checked }))}
                      className="w-5 h-5 accent-yellow-500 cursor-pointer"
                    />
                  </div>

                  <button type="submit" className="btn-primary self-start px-8 mt-2">
                    Save System Parameters
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === "admin" && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="topbar">
                <div>
                  <h2>Administrator Users Registry</h2>
                  <p className="text-secondary text-sm">Administrative oversight of analyst credentials and security scopes</p>
                </div>
              </div>

              <div className="glow-card table-card">
                <div className="table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Username</th>
                        <th>Email Scope</th>
                        <th>Security Role</th>
                        <th>Creation Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsersList.map((user, idx) => (
                        <tr key={idx} className="border-b border-color py-4">
                          <td className="mono text-xs text-muted">{user.id}</td>
                          <td className="bold text-sm flex items-center gap-2 py-4">
                            <ShieldCheck size={14} className={user.role === "Admin" ? "text-red" : "text-teal"} />
                            {user.username}
                          </td>
                          <td className="text-secondary text-sm">{user.email}</td>
                          <td>
                            <span className={`badge ${
                              user.role === 'Admin' ? 'badge-critical' : 'badge-low'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="text-secondary text-xs">{new Date(user.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="topbar">
                <div>
                  <h2>Analyst Security Profile</h2>
                  <p className="text-secondary text-sm">Identity credentials, workspace permissions, and active session details</p>
                </div>
              </div>

              {/* Profile Card Header */}
              <div className="glow-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gold/15 border border-gold/30 text-gold flex items-center justify-center font-bold text-2xl shadow-glow">
                    {currentUser?.username ? currentUser.username.substring(0, 2).toUpperCase() : "AN"}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-primary">{currentUser?.username || "Analyst Profile"}</h3>
                      <span className={`badge ${currentUser?.role === 'Admin' ? 'badge-critical' : 'badge-low'}`}>
                        {currentUser?.role || "Analyst"}
                      </span>
                      {currentUser?.auth_provider === "google" && (
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2 py-0.5 rounded font-mono flex items-center gap-1">
                          <Globe size={12} /> Google Account
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-secondary mt-1">{currentUser?.email || "analyst@sansec.ai"}</p>
                    <p className="text-xs text-muted mono mt-1">ID: {currentUser?.id || "usr_default"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={handleLogout} className="btn-logout px-4 py-2 text-xs">
                    <LogOut size={14} />
                    Sign Out Account
                  </button>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account Details Box */}
                <div className="glow-card p-6 space-y-4">
                  <h4 className="font-bold text-md border-b border-color pb-3 flex items-center gap-2">
                    <User size={16} className="text-gold" />
                    Account Security & Scope
                  </h4>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-color">
                      <span className="text-secondary">Identity Handle:</span>
                      <span className="font-semibold text-primary">{currentUser?.username}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-color">
                      <span className="text-secondary">Email Scope:</span>
                      <span className="font-semibold text-primary">{currentUser?.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-color">
                      <span className="text-secondary">Auth Provider:</span>
                      <span className="font-semibold text-gold capitalize">{currentUser?.auth_provider || "Local Password"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-color">
                      <span className="text-secondary">Access Role:</span>
                      <span className="font-semibold text-teal-400">{currentUser?.role}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-secondary">Registered Date:</span>
                      <span className="font-mono text-xs text-muted">
                        {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : "Active"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Session Security Box */}
                <div className="glow-card p-6 space-y-4">
                  <h4 className="font-bold text-md border-b border-color pb-3 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-teal" />
                    Active Session Status
                  </h4>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-color">
                      <span className="text-secondary">JWT Encryption:</span>
                      <span className="font-mono text-xs text-teal-400">HMAC-SHA256 Signed</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-color">
                      <span className="text-secondary">Session Refresh:</span>
                      <span className="font-mono text-xs text-gold">Automated (10 min cycle)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-color">
                      <span className="text-secondary">Total Scans Executed:</span>
                      <span className="font-bold text-primary">{history.length} Scans</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-secondary">Gateway State:</span>
                      <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active & Connected
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
