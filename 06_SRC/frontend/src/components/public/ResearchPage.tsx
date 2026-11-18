import React, { useState } from "react";
import { 
  BookOpen, 
  FileText, 
  Code2, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Terminal, 
  ArrowRight,
  ShieldCheck,
  Cpu
} from "lucide-react";
import { PublicNavBar } from "./PublicNavBar.tsx";
import { BlackHoleBackground } from "../BlackHoleBackground.tsx";

interface ResearchPageProps {
  onNavigate: (page: string) => void;
  onNavigateAuth: () => void;
}

const PYTHON_SNIPPET = `import requests

# 1. Dispatch binary payload for asynchronous static dissection
url = "https://sansec-ai.vercel.app/api/upload"
headers = {"Authorization": "Bearer YOUR_SANSEC_API_KEY"}

with open("suspect_sample.exe", "rb") as f:
    files = {"file": ("suspect_sample.exe", f, "application/octet-stream")}
    resp = requests.post(url, headers=headers, files=files)
    analysis = resp.json()

print(f"Dissection Job Created: {analysis['id']}")
print(f"Threat Score: {analysis['threat_score']}/100 ({analysis['threat_level']})")
print(f"Shannon Entropy: {analysis['pe_info']['sections'][0]['entropy']}")
`;

const CURL_SNIPPET = `curl -X POST "https://sansec-ai.vercel.app/api/upload" \\
  -H "Authorization: Bearer YOUR_SANSEC_API_KEY" \\
  -F "file=@./suspect_payload.bin"
`;

export const ResearchPage: React.FC<ResearchPageProps> = ({ onNavigate, onNavigateAuth }) => {
  const [activeCodeTab, setActiveCodeTab] = useState<"python" | "curl">("python");
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyCode = () => {
    const text = activeCodeTab === "python" ? PYTHON_SNIPPET : CURL_SNIPPET;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ref-portal-root">
      <BlackHoleBackground />
      <PublicNavBar activePage="research" onNavigate={onNavigate} onNavigateAuth={onNavigateAuth} />

      <main className="public-content-container">
        {/* Hero Section */}
        <section className="public-hero-section">
          <div className="public-badge">
            <span className="public-badge-dot" />
            <span>ADVANCED THREAT RESEARCH & API SPECIFICATIONS</span>
          </div>

          <h1 className="public-hero-title">
            Security Intelligence Papers & <span className="text-teal">SOAR Integration Guides</span>
          </h1>

          <p className="public-hero-lead">
            Forensic teardowns, binary unpacking methodologies, and open REST interfaces for automating static malware analysis across your SIEM, SOAR, and CI/CD pipelines.
          </p>

          <div className="public-hero-actions">
            <button 
              type="button" 
              onClick={onNavigateAuth}
              className="public-btn-primary"
            >
              <span>Get Free API Access</span>
              <ArrowRight size={16} />
            </button>
            <button 
              type="button" 
              onClick={() => onNavigate("platform")}
              className="public-btn-secondary"
            >
              <span>View Architecture Specs</span>
            </button>
          </div>
        </section>

        {/* Featured Research Whitepapers */}
        <section className="public-section">
          <div className="public-section-header">
            <h2 className="public-section-title">Published Security Whitepapers</h2>
            <p className="public-section-subtitle">
              Peer-reviewed technical analyses authored by the SANSEC AI reverse engineering research group.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="coffer-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal text-[11px] font-mono font-semibold">
                    WHITEPAPER 2026.04
                  </span>
                  <span className="text-xs text-muted">14 min read</span>
                </div>
                <h3 className="text-base font-bold text-primary mb-2">
                  Deconstructing Modern PE Protectors: From VMProtect to Dynamic Shellcode
                </h3>
                <p className="text-sm text-secondary leading-relaxed mb-4">
                  An empirical study on static AST recovery for virtualized instruction sets. Demonstrates automated identification of metamorphic mutations using section entropy derivatives.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                <span className="text-muted">Authored by SecOps Lab</span>
                <span className="text-teal font-semibold flex items-center gap-1">PDF Available</span>
              </div>
            </div>

            <div className="coffer-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[11px] font-mono font-semibold">
                    WHITEPAPER 2026.02
                  </span>
                  <span className="text-xs text-muted">11 min read</span>
                </div>
                <h3 className="text-base font-bold text-primary mb-2">
                  Entropy Drift in Zero-Day Droppers: Shannon Indexing as an Early Warning Indicator
                </h3>
                <p className="text-sm text-secondary leading-relaxed mb-4">
                  How high-frequency byte distribution mapping isolates malicious stubs before threat feeds or signature registries catalogue the artifact.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                <span className="text-muted">Authored by SecOps Lab</span>
                <span className="text-blue-400 font-semibold flex items-center gap-1">PDF Available</span>
              </div>
            </div>
          </div>
        </section>

        {/* Developer & SOAR Pipeline Integration */}
        <section className="public-section">
          <div className="panel">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Code2 size={18} className="text-teal" />
                <h2 className="text-base font-bold text-primary">REST API Ingestion Example (v1.0.4)</h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-black/30 p-1 rounded-lg border border-white/5 flex items-center text-xs">
                  <button 
                    type="button" 
                    onClick={() => setActiveCodeTab("python")}
                    className={`px-3 py-1 rounded cursor-pointer transition ${activeCodeTab === 'python' ? 'bg-teal-500/20 text-teal font-semibold' : 'text-muted'}`}
                  >
                    Python SDK
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveCodeTab("curl")}
                    className={`px-3 py-1 rounded cursor-pointer transition ${activeCodeTab === 'curl' ? 'bg-teal-500/20 text-teal font-semibold' : 'text-muted'}`}
                  >
                    cURL
                  </button>
                </div>

                <button 
                  type="button" 
                  onClick={handleCopyCode}
                  className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-secondary flex items-center gap-1.5 cursor-pointer transition"
                  title="Copy code to clipboard"
                >
                  {copied ? <Check size={13} className="text-teal" /> : <Copy size={13} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Code Box */}
            <pre className="rounded-lg bg-black/60 p-4 font-mono text-xs overflow-x-auto text-secondary leading-relaxed border border-white/5">
              <code>{activeCodeTab === "python" ? PYTHON_SNIPPET : CURL_SNIPPET}</code>
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
};
