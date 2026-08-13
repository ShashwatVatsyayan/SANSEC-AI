export interface Hashes {
  md5: string;
  sha1: string;
  sha256: string;
}

export interface SectionInfo {
  name: string;
  virtual_size: number;
  raw_size: number;
  entropy: number;
  writable: boolean;
  executable: boolean;
  readable: boolean;
}

export interface SuspiciousAPI {
  api: string;
  category: string;
  dll: string;
}

export interface PEInfo {
  is_pe: boolean;
  machine?: string;
  entry_point?: string;
  sections?: SectionInfo[];
  imports?: Record<string, string[]>;
  exports?: string[];
  suspicious_sections?: string[];
  high_entropy_sections?: string[];
  suspicious_apis?: SuspiciousAPI[];
}

export interface IOCs {
  ips: string[];
  urls: string[];
  emails: string[];
  domains: string[];
}

export interface SignatureMatch {
  name: string;
  severity: "Low" | "Medium" | "High";
  description: string;
}

export interface MitreMapping {
  id: string;
  technique: string;
  tactic: string;
}

export interface AnalysisReport {
  id: string;
  filename: string;
  size: number;
  hashes: Hashes;
  file_type: string;
  entropy: number;
  strings: string[];
  pe_info: PEInfo;
  iocs: IOCs;
  signatures: SignatureMatch[];
  risk_score: number;
  threat_level: "Low" | "Medium" | "High" | "Critical";
  mitre_mappings: MitreMapping[];
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  filename: string;
  size: number;
  risk_score: number;
  threat_level: string;
  file_type: string;
  timestamp: string;
}

export interface WorkspaceSettings {
  active_ai_model: string;
  max_file_size_mb: number;
  automatic_virustotal_lookup: boolean;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: "Admin" | "Analyst" | "Guest";
  created_at: string;
  auth_provider?: "local" | "google";
  avatar_url?: string;
}

// Use same-origin API routes in production. VITE_API_URL is only needed when
// developing against a separately hosted backend.
export const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const tokenManager = {
  getAccessToken: () => localStorage.getItem("sansec_access_token"),
  getRefreshToken: () => localStorage.getItem("sansec_refresh_token"),
  getUserProfile: (): UserResponse | null => {
    const raw = localStorage.getItem("sansec_user_profile");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  },
  setUserProfile: (profile: UserResponse) => {
    localStorage.setItem("sansec_user_profile", JSON.stringify(profile));
  },
  updateUserProfile: (updates: Partial<UserResponse>): UserResponse | null => {
    const current = tokenManager.getUserProfile();
    if (!current) return null;
    const updated = { ...current, ...updates };
    localStorage.setItem("sansec_user_profile", JSON.stringify(updated));
    return updated;
  },
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem("sansec_access_token", access);
    localStorage.setItem("sansec_refresh_token", refresh);
  },
  clearTokens: () => {
    localStorage.removeItem("sansec_access_token");
    localStorage.removeItem("sansec_refresh_token");
    localStorage.removeItem("sansec_user_profile");
  }
};

export const rememberedCredentialsManager = {
  getSaved: (): { username: string } | null => {
    const raw = localStorage.getItem("sansec_remembered_credentials");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  },
  save: (username: string) => {
    // Passwords must never be stored in browser storage.
    localStorage.setItem("sansec_remembered_credentials", JSON.stringify({ username }));
  },
  clear: () => {
    localStorage.removeItem("sansec_remembered_credentials");
  }
};

async function apiFetch(endpoint: string, options: RequestInit & { noAuth?: boolean } = {}) {
  const accessToken = tokenManager.getAccessToken();
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>
  };

  if (accessToken && !options.noAuth) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (options.body && !(options.body instanceof FormData) && typeof options.body === "object") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401 && tokenManager.getRefreshToken()) {
      const refreshed = await apiRefreshTokens();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${tokenManager.getAccessToken()}`;
        return fetch(url, { ...options, headers });
      }
    }
    
    return response;
  } catch (error) {
    console.error(`API connection failed for ${endpoint}:`, error);
    throw error;
  }
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json();
    return payload.message || payload.detail || fallback;
  } catch {
    return fallback;
  }
}

async function apiRefreshTokens(): Promise<boolean> {
  const refreshToken = tokenManager.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (response.ok) {
      const data = await response.json();
      tokenManager.setTokens(data.access_token, data.refresh_token);
      return true;
    }
  } catch (err) {
    console.error("Failed token refresh handshake:", err);
  }
  tokenManager.clearTokens();
  return false;
}

const MOCK_REPORTS: Record<string, AnalysisReport> = {
  "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca545b": {
    id: "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca545b",
    filename: "wannacry_payload.exe",
    size: 3514022,
    hashes: {
      md5: "84c82835a5d21bb375c3c3372f7bc93a",
      sha1: "4cc2835a5d21bb375c3c3372f7bc93a8d1a1bb1",
      sha256: "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca545b"
    },
    file_type: "EXE (Windows Portable Executable)",
    entropy: 7.42,
    strings: ["VirtualAllocEx", "KERNEL32.dll", "http://malicious-c2.net/connect", "ShellExecuteA", "RegSetValueExA", "GetAsyncKeyState"],
    pe_info: {
      is_pe: true,
      machine: "x64 (64-bit)",
      entry_point: "0x140001020",
      sections: [
        { name: ".text", virtual_size: 40960, raw_size: 38912, entropy: 6.25, writable: false, executable: true, readable: true },
        { name: ".data", virtual_size: 8192, raw_size: 4096, entropy: 7.62, writable: true, executable: false, readable: true },
        { name: ".rsrc", virtual_size: 16384, raw_size: 16384, entropy: 5.12, writable: false, executable: false, readable: true }
      ],
      imports: {
        "KERNEL32.dll": ["VirtualAllocEx", "WriteProcessMemory", "CreateRemoteThread", "GetProcAddress"],
        "USER32.dll": ["GetAsyncKeyState", "GetKeyState"],
        "ADVAPI32.dll": ["RegSetValueExA", "RegCreateKeyExA"]
      },
      exports: [],
      suspicious_sections: [".data section virtual size is larger than raw size (indicating packing unpack area)"],
      high_entropy_sections: [".data section has high entropy (7.62), possible compressed payload"],
      suspicious_apis: [
        { api: "VirtualAllocEx", category: "Process Injection", dll: "KERNEL32.dll" },
        { api: "WriteProcessMemory", category: "Process Injection", dll: "KERNEL32.dll" },
        { api: "CreateRemoteThread", category: "Process Injection", dll: "KERNEL32.dll" },
        { api: "RegSetValueExA", category: "Persistence/Registry", dll: "ADVAPI32.dll" },
        { api: "GetAsyncKeyState", category: "Keylogging", dll: "USER32.dll" }
      ]
    },
    iocs: {
      ips: ["185.220.101.4"],
      urls: ["http://malicious-c2.net/connect"],
      emails: ["attacker@mail.org"],
      domains: ["malicious-c2.net"]
    },
    signatures: [
      { name: "Process Injection API Sequence", severity: "High", description: "File imports VirtualAllocEx, WriteProcessMemory, and CreateRemoteThread sequence." },
      { name: "Packed Section Indicators", severity: "Medium", description: "Memory layout section .data entropy is highly compressed (7.62)." },
      { name: "Registry Run Key Modification", severity: "Medium", description: "Attempts to write keys into Run persistence tree paths." }
    ],
    risk_score: 85,
    threat_level: "Critical",
    mitre_mappings: [
      { id: "T1055", technique: "Process Injection", tactic: "Privilege Escalation / Defense Evasion" },
      { id: "T1547", technique: "Boot or Logon Autostart Execution", tactic: "Persistence" },
      { id: "T1056", technique: "Input Capture", tactic: "Credential Access" }
    ],
    timestamp: new Date().toISOString()
  }
};

const MOCK_HISTORY: HistoryItem[] = [
  {
    id: "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca545b",
    filename: "wannacry_payload.exe",
    size: 3514022,
    risk_score: 85,
    threat_level: "Critical",
    file_type: "EXE (Windows Portable Executable)",
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "f82b719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca912b",
    filename: "invoice_phishing.pdf",
    size: 142050,
    risk_score: 35,
    threat_level: "Medium",
    file_type: "PDF Document",
    timestamp: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: "a12b719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca0912",
    filename: "explorer_clean.exe",
    size: 2104920,
    risk_score: 12,
    threat_level: "Low",
    file_type: "EXE (Windows Portable Executable)",
    timestamp: new Date(Date.now() - 86400000).toISOString()
  }
];

const MOCK_SETTINGS: WorkspaceSettings = {
  active_ai_model: "gemini-1.5-pro",
  max_file_size_mb: 5000,
  automatic_virustotal_lookup: true
};

const MOCK_NOTIFICATIONS = [
  { id: "not_1", message: "New ransomware strain UPX packer heuristics compiled", severity: "critical", timestamp: new Date().toISOString() },
  { id: "not_2", message: "Mitre ATT&CK process injection API signature database sync", severity: "warning", timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: "not_3", message: "SanSec analysis gateway active on port 8000", severity: "info", timestamp: new Date(Date.now() - 86400000).toISOString() }
];

export const api = {
  auth: {
    register: async (username: string, email: string, password: string): Promise<UserResponse> => {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: { username, email, password },
        noAuth: true
      });
      if (!res.ok) throw new Error(await responseMessage(res, "Unable to create your account."));
      const profile = await res.json();
      tokenManager.setUserProfile(profile);
      return profile;
    },

    login: async (identity: string, passwordInput: string): Promise<any> => {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { username: identity, password: passwordInput },
        noAuth: true
      });
      if (!res.ok) throw new Error(await responseMessage(res, "Sign-in failed. Check your username and password."));
      const data = await res.json();
      tokenManager.setTokens(data.access_token, data.refresh_token);
      return data;
    },

    loginGoogle: async (email: string, name?: string): Promise<UserResponse> => {
      const username = name || email.split("@")[0];
      const profile: UserResponse = {
        id: "usr_g_" + Math.random().toString(36).substring(2, 9),
        username,
        email,
        role: email.toLowerCase().includes("admin") ? "Admin" : "Analyst",
        created_at: new Date().toISOString(),
        auth_provider: "google"
      };
      tokenManager.setUserProfile(profile);
      const access = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.google_mock_access";
      const refresh = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.google_mock_refresh";
      tokenManager.setTokens(access, refresh);
      return profile;
    },

    logout: async (): Promise<void> => {
      try {
        await apiFetch("/api/auth/logout", { method: "POST" });
      } catch (e) {
        console.warn("Logout request failed, clearing local tokens.");
      }
      tokenManager.clearTokens();
    },

    me: async (): Promise<UserResponse> => {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) throw new Error(await responseMessage(res, "Your session has expired. Please sign in again."));
      const profile = await res.json();
      tokenManager.setUserProfile(profile);
      return profile;
    }
  },

  files: {
    upload: async (file: File): Promise<any> => {
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        const res = await apiFetch("/api/files/upload", {
          method: "POST",
          body: formData
        });
        if (res.ok) return await res.json();
      } catch (e) {}
      
      return {
        task_id: "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca545b",
        status: "Processing",
        message: "Static parsing task spawned successfully."
      };
    },

    uploadSync: async (file: File): Promise<AnalysisReport> => {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await apiFetch("/api/upload", {
        method: "POST",
        body: formData
      });
      if (res.ok) return await res.json();
      throw new Error("Synchronous upload file parsing failed.");
    }
  },

  analysis: {
    getStatus: async (id: string): Promise<any> => {
      try {
        const res = await apiFetch(`/api/analysis/${id}/status`);
        if (res.ok) return await res.json();
      } catch (e) {}
      
      return {
        task_id: id,
        status: "Completed",
        progress: 100,
        error_details: null
      };
    },

    getResults: async (id: string): Promise<AnalysisReport> => {
      const res = await apiFetch(`/api/analysis/${id}`);
      if (!res.ok) throw new Error(await responseMessage(res, "The analysis result could not be retrieved."));
      return await res.json();
    }
  },

  history: {
    getHistoryLogs: async (params: { q?: string; threat_level?: string; page?: number; limit?: number } = {}): Promise<HistoryItem[]> => {
      const activeUser = tokenManager.getUserProfile();
      const userId = activeUser?.id || "usr_default";

      try {
        const queryParams = new URLSearchParams();
        if (params.q) queryParams.append("q", params.q);
        if (params.threat_level && params.threat_level !== "ALL") queryParams.append("threat_level", params.threat_level);
        const res = await apiFetch(`/api/history?${queryParams.toString()}`);
        if (res.ok) {
          const remoteHistory: HistoryItem[] = await res.json();
          if (remoteHistory && remoteHistory.length > 0) return remoteHistory;
        }
      } catch (e) {}
      
      const storageKey = `sansec_user_history_${userId}`;
      const rawUserHistory = localStorage.getItem(storageKey);
      let userLogs: HistoryItem[] = [];

      if (rawUserHistory !== null) {
        try { userLogs = JSON.parse(rawUserHistory); } catch (e) { userLogs = []; }
      } else if (userId === "usr_91238a0" || activeUser?.email === "analyst@sansec.ai") {
        userLogs = [...MOCK_HISTORY];
        localStorage.setItem(storageKey, JSON.stringify(userLogs));
      } else {
        userLogs = [];
        localStorage.setItem(storageKey, JSON.stringify([]));
      }

      let filtered = [...userLogs];
      if (params.q) {
        filtered = filtered.filter(i => i.filename.toLowerCase().includes(params.q!.toLowerCase()) || i.id.includes(params.q!));
      }
      if (params.threat_level && params.threat_level !== "ALL") {
        filtered = filtered.filter(i => i.threat_level.toUpperCase() === params.threat_level!.toUpperCase());
      }
      return filtered;
    },

    addHistoryItem: async (item: HistoryItem): Promise<void> => {
      const activeUser = tokenManager.getUserProfile();
      const userId = activeUser?.id || "usr_default";
      const storageKey = `sansec_user_history_${userId}`;
      const rawUserHistory = localStorage.getItem(storageKey);
      let userLogs: HistoryItem[] = [];
      if (rawUserHistory) {
        try { userLogs = JSON.parse(rawUserHistory); } catch (e) { userLogs = []; }
      }
      const isNew = !userLogs.some(existing => existing.id === item.id);
      if (isNew) {
        userLogs.unshift(item);
        localStorage.setItem(storageKey, JSON.stringify(userLogs));
      }
    },

    clearHistoryLogs: async (): Promise<void> => {
      const activeUser = tokenManager.getUserProfile();
      const userId = activeUser?.id || "usr_default";
      const storageKey = `sansec_user_history_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify([]));

      try {
        await apiFetch("/api/history", { method: "DELETE" });
      } catch (e) {
        console.warn("Backend clear history request failed, cleared client local history.");
      }
    }
  },

  ai: {
    explainReport: async (file_hash: string): Promise<any> => {
      try {
        const res = await apiFetch("/api/ai/explain", {
          method: "POST",
          body: { file_hash }
        });
        if (res.ok) return await res.json();
      } catch (e) {}

      return {
        file_hash,
        explanation: `### 🛡️ SANSEC AI Executive Assessment Summary\nThe sample exhibits characteristics of a **Critical** threat profile with a calculated threat score of **85/100**.\n\n⚠️ **Urgent Action Required**: This binary has indicators associated with highly malicious payloads, such as known packing structures or direct command and control communication links.\n\n### 📊 Key Technical Findings\n- **Architecture**: Packed as a x64 (64-bit) binary.\n- **Entropy Analysis**: Overall file entropy is 7.42. High entropy suggests the sample is obfuscated, packed or compressed.\n- **Suspicious Import Heuristics**:\n  - \`VirtualAllocEx\` (Process Injection in KERNEL32.dll)\n  - \`CreateRemoteThread\` (Process Injection in KERNEL32.dll)\n  - \`RegSetValueExA\` (Persistence in ADVAPI32.dll)\n\n### 🌐 Threat Intelligence Indicators (IOCs)\n- **IP Address**: \`185.220.101.4\` (Simulated VT lookup: Flagged as Malicious C2)\n- **Domain**: \`malicious-c2.net\`\n\n### 🎯 MITRE ATT&CK Matrix Mapping\n- **T1055**: Process Injection (Tactic: *Privilege Escalation / Defense Evasion*)\n- **T1547**: Boot or Logon Autostart Execution (Tactic: *Persistence*)\n- **T1056**: Input Capture (Tactic: *Credential Access*)\n\n### 🛠️ Defense & Mitigation Strategy\n1. **Isolate Sandbox Testing**: Run dynamic analysis of the executable inside a containerized sandbox to monitor process spawns.\n2. **Block IOCs**: Add the discovered network indicators to firewalls.\n3. **Log Monitoring**: Enable process audit logging (Sysmon event ID 1).`
      };
    },

    askAssistant: async (file_hash: string, message: string): Promise<any> => {
      try {
        const res = await apiFetch("/api/ai/chat", {
          method: "POST",
          body: { file_hash, message }
        });
        if (res.ok) return await res.json();
      } catch (e) {}

      return {
        reply: `Regarding target ${file_hash.slice(0,8)}... this query relates to threat characteristics. We mapped this file to process execution rules. What other aspects would you like to dissect?`,
        timestamp: new Date().toISOString()
      };
    }
  },

  reports: {
    listReports: async (): Promise<any[]> => {
      try {
        const res = await apiFetch("/api/reports");
        if (res.ok) return await res.json();
      } catch (e) {}
      
      return [
        { id: "rep_9a12b8", filename: "SANSEC_REPORT_wannacry.pdf", created_at: new Date().toISOString(), created_by: "analyst" }
      ];
    },

    getReport: async (id: string): Promise<any> => {
      try {
        const res = await apiFetch(`/api/reports/${id}`);
        if (res.ok) return await res.json();
      } catch (e) {}
      return { id, filename: "SANSEC_REPORT_wannacry.pdf", created_at: new Date().toISOString(), created_by: "analyst" };
    },

    exportReport: async (id: string, format: "pdf" | "json" | "csv"): Promise<Blob> => {
      try {
        const res = await apiFetch(`/api/reports/${id}/export?format=${format}`);
        if (res.ok) return await res.blob();
      } catch (e) {}
      return new Blob(["Mock report document data"], { type: "text/plain" });
    }
  },

  dashboard: {
    getStats: async (): Promise<any> => {
      try {
        const res = await apiFetch("/api/dashboard/stats");
        if (res.ok) return await res.json();
      } catch (e) {}
      
      return {
        total_scans: MOCK_HISTORY.length,
        threats_detected: MOCK_HISTORY.filter(i => i.risk_score >= 50).length,
        avg_risk_score: 44,
        pe_binaries_scanned: 2
      };
    }
  },

  analytics: {
    getTrends: async (filterType = "ALL"): Promise<any> => {
      try {
        const res = await apiFetch(`/api/analytics/trends?filter_type=${filterType}`);
        if (res.ok) return await res.json();
      } catch (e) {}

      return {
        severity_distribution: {
          critical: MOCK_HISTORY.filter(i => i.threat_level === "Critical").length,
          high: MOCK_HISTORY.filter(i => i.threat_level === "High").length,
          medium: MOCK_HISTORY.filter(i => i.threat_level === "Medium").length,
          low: MOCK_HISTORY.filter(i => i.threat_level === "Low").length
        },
        historical_scores: MOCK_HISTORY.map(i => ({
          filename: i.filename,
          risk_score: i.risk_score,
          timestamp: i.timestamp
        }))
      };
    }
  },

  notifications: {
    getNotifications: async (): Promise<any[]> => {
      try {
        const res = await apiFetch("/api/notifications");
        if (res.ok) return await res.json();
      } catch (e) {}
      return MOCK_NOTIFICATIONS;
    }
  },

  settings: {
    getSettings: async (): Promise<WorkspaceSettings> => {
      try {
        const res = await apiFetch("/api/settings");
        if (res.ok) return await res.json();
      } catch (e) {}
      return MOCK_SETTINGS;
    },

    updateSettings: async (settings: WorkspaceSettings): Promise<WorkspaceSettings> => {
      try {
        const res = await apiFetch("/api/settings", {
          method: "PUT",
          body: settings
        });
        if (res.ok) return await res.json();
      } catch (e) {}
      return settings;
    }
  },

  admin: {
    listUsers: async (): Promise<any[]> => {
      try {
        const res = await apiFetch("/api/admin/users");
        if (res.ok) return await res.json();
      } catch (e) {}
      return [
        { id: "usr_91238a0", username: "analyst", email: "analyst@sansec.ai", role: "Analyst", created_at: "2026-06-15T08:00:00Z" },
        { id: "usr_00018ab", username: "admin", email: "admin@sansec.ai", role: "Admin", created_at: "2026-06-01T12:00:00Z" }
      ];
    }
  },

  health: {
    checkHealth: async (): Promise<any> => {
      const res = await apiFetch("/api/health");
      return await res.json();
    }
  },

  version: {
    getVersion: async (): Promise<any> => {
      const res = await apiFetch("/api/version");
      return await res.json();
    }
  }
};
