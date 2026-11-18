import React, { useState } from "react";
import { 
  Radar, 
  ShieldAlert, 
  Activity, 
  Globe, 
  Filter, 
  Search, 
  ExternalLink, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Radio
} from "lucide-react";
import { PublicNavBar } from "./PublicNavBar.tsx";
import { BlackHoleBackground } from "../BlackHoleBackground.tsx";

interface ThreatRadarPageProps {
  onNavigate: (page: string) => void;
  onNavigateAuth: () => void;
}

interface Campaign {
  id: string;
  name: string;
  family: string;
  threatLevel: "Critical" | "High" | "Medium";
  score: number;
  tactics: string[];
  targetedSectors: string[];
  recentDetections: number;
}

const CAMPAIGNS: Campaign[] = [
  {
    id: "CAMP-2026-901",
    name: "CVE-2024-38077 (MadDog RCE)",
    family: "Remote Code Execution",
    threatLevel: "Critical",
    score: 98,
    tactics: ["T1190 (Exploit Public-Facing App)", "T1059 (Command Interpreter)"],
    targetedSectors: ["Government", "Enterprise Cloud", "Telecommunications"],
    recentDetections: 1420
  },
  {
    id: "CAMP-2026-874",
    name: "LockBit 3.0 Black Diamond",
    family: "Ransomware / Cryptor",
    threatLevel: "Critical",
    score: 96,
    tactics: ["T1486 (Data Encrypted for Impact)", "T1078 (Valid Accounts)"],
    targetedSectors: ["Healthcare", "Manufacturing", "Finance"],
    recentDetections: 890
  },
  {
    id: "CAMP-2026-812",
    name: "Lumma Stealer v4.2 Variant",
    family: "Credential & Key Infostealer",
    threatLevel: "High",
    score: 88,
    tactics: ["T1555 (Credentials from Password Stores)", "T1071 (App Protocol)"],
    targetedSectors: ["Web3 / Crypto", "Fintech", "DevOps"],
    recentDetections: 3120
  },
  {
    id: "CAMP-2026-799",
    name: "BlackCat / ALPHV Sphinx",
    family: "Triple Extortion Ransomware",
    threatLevel: "Critical",
    score: 94,
    tactics: ["T1055 (Process Injection)", "T1567 (Exfil Over Web Service)"],
    targetedSectors: ["Aerospace", "Energy", "Maritime"],
    recentDetections: 640
  }
];

export const ThreatRadarPage: React.FC<ThreatRadarPageProps> = ({ onNavigate, onNavigateAuth }) => {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredCampaigns = CAMPAIGNS.filter(c => {
    if (selectedFilter !== "all" && c.threatLevel.toLowerCase() !== selectedFilter) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.family.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="ref-portal-root">
      <BlackHoleBackground />
      <PublicNavBar activePage="radar" onNavigate={onNavigate} onNavigateAuth={onNavigateAuth} />

      <main className="public-content-container">
        {/* Hero Section */}
        <section className="public-hero-section">
          <div className="public-badge">
            <span className="public-badge-dot" />
            <span className="flex items-center gap-1.5">
              <Radio size={12} className="animate-pulse text-teal" />
              <span>LIVE GLOBAL THREAT RADAR</span>
            </span>
          </div>

          <h1 className="public-hero-title">
            Global Adversary Telemetry & <span className="text-blue-400">Emerging Zero-Day Feeds</span>
          </h1>

          <p className="public-hero-lead">
            SANSEC AI monitors global malware syndicates, ransomware distribution networks, and critical CVE weaponizations in real time across 140+ enterprise environments.
          </p>

          <div className="public-hero-actions">
            <button 
              type="button" 
              onClick={onNavigateAuth}
              className="public-btn-primary"
            >
              <span>Scan Suspicious Artifact Now</span>
              <ArrowRight size={16} />
            </button>
            <button 
              type="button" 
              onClick={() => onNavigate("research")}
              className="public-btn-secondary"
            >
              <span>Read Threat Advisories</span>
            </button>
          </div>
        </section>

        {/* Global Threat Metrics */}
        <section className="public-stats-grid">
          <div className="stat-card">
            <span className="stat-label">SENSORS ONLINE</span>
            <span className="stat-value text-teal">14,280</span>
            <span className="text-xs text-muted">Synchronized edge probes</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">CRITICAL CVES TRACKED</span>
            <span className="stat-value text-red-500">18 Active</span>
            <span className="text-xs text-muted">Wild exploitation confirmed</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">AVG DETECTION TIME</span>
            <span className="stat-value text-orange-400">&lt; 380ms</span>
            <span className="text-xs text-muted">From wire to MITRE match</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">BLOCKED INGESTIONS</span>
            <span className="stat-value text-blue-400">1.84M</span>
            <span className="text-xs text-muted">Past 30 days telemetry</span>
          </div>
        </section>

        {/* Active Threat Campaigns Table */}
        <section className="public-section">
          <div className="panel">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Radar size={18} className="text-teal" />
                <h2 className="text-base font-bold text-primary">Active Threat Vectors (Global Telemetry)</h2>
              </div>

              {/* Filter controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/5 text-xs">
                  <button 
                    type="button" 
                    onClick={() => setSelectedFilter("all")}
                    className={`px-2.5 py-1 rounded cursor-pointer transition ${selectedFilter === 'all' ? 'bg-teal-500/20 text-teal font-semibold' : 'text-muted'}`}
                  >
                    All
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSelectedFilter("critical")}
                    className={`px-2.5 py-1 rounded cursor-pointer transition ${selectedFilter === 'critical' ? 'bg-red-500/20 text-red-400 font-semibold' : 'text-muted'}`}
                  >
                    Critical
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSelectedFilter("high")}
                    className={`px-2.5 py-1 rounded cursor-pointer transition ${selectedFilter === 'high' ? 'bg-orange-500/20 text-orange-400 font-semibold' : 'text-muted'}`}
                  >
                    High
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/5 text-muted uppercase">
                    <th className="py-2.5 px-3">Campaign / CVE</th>
                    <th className="py-2.5 px-3">Classification</th>
                    <th className="py-2.5 px-3">Threat Rating</th>
                    <th className="py-2.5 px-3">Primary MITRE Tactic</th>
                    <th className="py-2.5 px-3">Recent Hits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCampaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-3 font-semibold text-primary">
                        <div>{camp.name}</div>
                        <span className="text-[10px] text-muted">{camp.id}</span>
                      </td>
                      <td className="py-3 px-3 text-secondary">{camp.family}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          camp.threatLevel === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        }`}>
                          {camp.score}/100 ({camp.threatLevel})
                        </span>
                      </td>
                      <td className="py-3 px-3 text-teal">{camp.tactics[0]}</td>
                      <td className="py-3 px-3 font-bold text-primary">{camp.recentDetections.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* MITRE Matrix Breakdown */}
        <section className="public-section">
          <div className="public-section-header">
            <h2 className="public-section-title">MITRE ATT&CK Matrix Distribution</h2>
            <p className="public-section-subtitle">
              Relative frequency of matched adversarial techniques parsed across the global sample pool.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="coffer-card">
              <span className="text-xs font-mono text-muted uppercase">TA0005: Defense Evasion</span>
              <div className="text-xl font-bold text-teal mt-1">38.4%</div>
              <p className="text-xs text-secondary mt-1">RDTSC timing loops, section packing, unlinked process environment blocks (PEB).</p>
            </div>
            <div className="coffer-card">
              <span className="text-xs font-mono text-muted uppercase">TA0002: Execution</span>
              <div className="text-xl font-bold text-orange-400 mt-1">29.1%</div>
              <p className="text-xs text-secondary mt-1">Process Hollowing, CreateRemoteThread, NtQueueApcThread shellcode execution.</p>
            </div>
            <div className="coffer-card">
              <span className="text-xs font-mono text-muted uppercase">TA0011: Command & Control</span>
              <div className="text-xl font-bold text-blue-400 mt-1">21.8%</div>
              <p className="text-xs text-secondary mt-1">Encrypted TLS beacons over non-standard ports, DNS tunneling exfiltration.</p>
            </div>
            <div className="coffer-card">
              <span className="text-xs font-mono text-muted uppercase">TA0006: Credential Access</span>
              <div className="text-xl font-bold text-purple-400 mt-1">10.7%</div>
              <p className="text-xs text-secondary mt-1">LSASS memory dumps, DPAPI master key carving, browser cookie extraction.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
