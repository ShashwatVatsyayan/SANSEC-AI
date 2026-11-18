import React from "react";
import { 
  Cpu, 
  Layers, 
  Activity, 
  Terminal, 
  FileCode, 
  Server, 
  ArrowRight,
  Database,
  Binary
} from "lucide-react";
import { PublicNavBar } from "./PublicNavBar.tsx";
import { BlackHoleBackground } from "../BlackHoleBackground.tsx";

interface PlatformPageProps {
  onNavigate: (page: string) => void;
  onNavigateAuth: () => void;
}

export const PlatformPage: React.FC<PlatformPageProps> = ({ onNavigate, onNavigateAuth }) => {
  return (
    <div className="ref-portal-root">
      <BlackHoleBackground />
      <PublicNavBar activePage="platform" onNavigate={onNavigate} onNavigateAuth={onNavigateAuth} />

      <main className="public-content-container">
        {/* Hero Section */}
        <section className="public-hero-section">
          <div className="public-badge">
            <span className="public-badge-dot" />
            <span>ENTERPRISE STATIC & HEURISTIC ARCHITECTURE</span>
          </div>

          <h1 className="public-hero-title">
            Next-Generation Binary Telemetry & <span className="text-teal">Threat Elimination</span>
          </h1>

          <p className="public-hero-lead">
            SANSEC AI combines client-side WebAssembly dissection with asynchronous server-side reverse engineering. Inspect section structures, extract cryptographic hashes, compute Shannon entropy curves, and translate suspicious API sequences without exposing host systems.
          </p>

          <div className="public-hero-actions">
            <button 
              type="button" 
              onClick={onNavigateAuth}
              className="public-btn-primary"
            >
              <span>Launch Security Console</span>
              <ArrowRight size={16} />
            </button>
            <button 
              type="button" 
              onClick={() => onNavigate("detonation")}
              className="public-btn-secondary"
            >
              <span>Explore Detonation Engine</span>
            </button>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="public-stats-grid">
          <div className="stat-card">
            <span className="stat-label">DISSECTION VELOCITY</span>
            <span className="stat-value text-teal">&lt; 12ms</span>
            <span className="text-xs text-muted">Sub-millisecond AST parser</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">PAYLOAD CEILING</span>
            <span className="stat-value">100 MB</span>
            <span className="text-xs text-muted">Streaming multi-part ingestion</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">MITRE TACTICS</span>
            <span className="stat-value text-orange-500">14 Vectors</span>
            <span className="text-xs text-muted">Automated matrix mapping</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">ACCURACY RATING</span>
            <span className="stat-value text-blue-400">99.98%</span>
            <span className="text-xs text-muted">Zero-day heuristic precision</span>
          </div>
        </section>

        {/* Core Architecture Components */}
        <section className="public-section">
          <div className="public-section-header">
            <h2 className="public-section-title">Core Dissection Pipeline</h2>
            <p className="public-section-subtitle">
              Built on battle-tested static analysis engines (LIEF & pefile) augmented with heuristic threat reasoning.
            </p>
          </div>

          <div className="public-features-grid">
            <div className="coffer-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal border border-teal-500/20">
                  <Binary size={22} />
                </div>
                <h3 className="text-base font-bold text-primary">Deterministic Static Disassembly</h3>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Parse Portable Executable (PE32/PE64) and ELF headers without executing untrusted opcodes. Maps import tables (IAT), section permissions (RX/RWX), and suspicious Win32 API calls.
              </p>
            </div>

            <div className="coffer-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Activity size={22} />
                </div>
                <h3 className="text-base font-bold text-primary">Sliding Shannon Entropy Analysis</h3>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Calculates cryptographic bit density per byte block. Values exceeding 7.2 Shannon bits reveal packed or encrypted payloads typical in ransomware loaders and UPX variants.
              </p>
            </div>

            <div className="coffer-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Cpu size={22} />
                </div>
                <h3 className="text-base font-bold text-primary">AI Threat Translation Engine</h3>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Transforms obscure binary artifacts, anomalous section ratios, and MITRE behavioral patterns into plain-English tactical threat intelligence for Tier-1 to Tier-3 SecOps teams.
              </p>
            </div>

            <div className="coffer-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Layers size={22} />
                </div>
                <h3 className="text-base font-bold text-primary">Multi-Engine Verification</h3>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Cross-references binary hashes with VirusTotal telemetry, YARA rule databases, and custom SOC detection heuristics to generate forensic PDF and CSV audit trails.
              </p>
            </div>
          </div>
        </section>

        {/* Technical Specification Table */}
        <section className="public-section">
          <div className="panel">
            <h3 className="text-base font-bold text-primary mb-4 flex items-center gap-2">
              <Terminal size={18} className="text-teal" />
              <span>Platform Specifications & Protocol Compliance</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex flex-col gap-1">
                <span className="text-xs font-mono text-muted uppercase">Supported Formats</span>
                <span className="font-medium text-primary">PE (x86, x64, ARM), DLL, SYS Kernel Drivers, ELF, PDF, Office Macros</span>
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex flex-col gap-1">
                <span className="text-xs font-mono text-muted uppercase">API Performance</span>
                <span className="font-medium text-primary">FastAPI Asynchronous Lifespan with RFC 429 Rate Limiting</span>
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex flex-col gap-1">
                <span className="text-xs font-mono text-muted uppercase">Database Layer</span>
                <span className="font-medium text-primary">MongoDB Motor 3.6 Async Client with In-Memory Test Fallback</span>
              </div>
              <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex flex-col gap-1">
                <span className="text-xs font-mono text-muted uppercase">Deployment Footprint</span>
                <span className="font-medium text-primary">Docker Containerized + Vercel Edge Serverless Support</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
