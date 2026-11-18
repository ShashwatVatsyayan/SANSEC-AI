import React, { useState } from "react";
import { 
  Terminal, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Eye, 
  Cpu, 
  Zap, 
  FileSearch,
  ArrowRight
} from "lucide-react";
import { PublicNavBar } from "./PublicNavBar.tsx";
import { BlackHoleBackground } from "../BlackHoleBackground.tsx";

interface DetonationPageProps {
  onNavigate: (page: string) => void;
  onNavigateAuth: () => void;
}

interface DetonationLog {
  timestamp: string;
  stage: string;
  syscall: string;
  detail: string;
  level: "info" | "warning" | "danger" | "success";
}

const SAMPLE_LOGS: DetonationLog[] = [
  { timestamp: "00:00.012", stage: "INGEST", syscall: "InitMicroVM()", detail: "Spawning isolated ephemeral guest snapshot [AMD64-GUEST-VM-9]", level: "info" },
  { timestamp: "00:00.048", stage: "EVASION", syscall: "RDTSC / CPUStep", detail: "Detected high-frequency timing hook; neutralizing anti-debugging evasion", level: "warning" },
  { timestamp: "00:00.112", stage: "PROCESS", syscall: "NtCreateUserProcess()", detail: "Spawned child process 'svchost_stub.exe' with unlinked PEB", level: "info" },
  { timestamp: "00:00.185", stage: "INJECTION", syscall: "VirtualAllocEx(0x40, PAGE_EXECUTE_READWRITE)", detail: "Allocating RWX shellcode buffer in remote process space", level: "danger" },
  { timestamp: "00:00.240", stage: "INJECTION", syscall: "WriteProcessMemory()", detail: "Injected 14,200 bytes containing Meterpreter stageless reverse shell", level: "danger" },
  { timestamp: "00:00.310", stage: "NETWORK", syscall: "InternetOpenUrlA(185.220.101.5:443)", detail: "Initiated unauthorized TLS beacon to known Bulletproof C2 host", level: "danger" },
  { timestamp: "00:00.405", stage: "VERDICT", syscall: "FreezeAndCapture()", detail: "Execution halted. Threat Score: 94/100 (Critical Malicious). Quarantined.", level: "success" },
];

export const DetonationEnginePage: React.FC<DetonationPageProps> = ({ onNavigate, onNavigateAuth }) => {
  const [activeStep, setActiveStep] = useState<number>(SAMPLE_LOGS.length);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const rerunSimulation = () => {
    setActiveStep(0);
    setIsRunning(true);
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setActiveStep(current);
      if (current >= SAMPLE_LOGS.length) {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 450);
  };

  return (
    <div className="ref-portal-root">
      <BlackHoleBackground />
      <PublicNavBar activePage="detonation" onNavigate={onNavigate} onNavigateAuth={onNavigateAuth} />

      <main className="public-content-container">
        {/* Hero Section */}
        <section className="public-hero-section">
          <div className="public-badge">
            <span className="public-badge-dot" />
            <span>ZERO-TRUST MICROVM DETONATION PIPELINE</span>
          </div>

          <h1 className="public-hero-title">
            Isolated Kernel Detonation with <span className="text-orange-500">Real-Time Syscall Tracing</span>
          </h1>

          <p className="public-hero-lead">
            Execute weaponized PE32, DLL, and ELF payloads inside ephemeral microVM environments. Observe memory injections, unlinked PEB processes, and C2 beacons while preventing host system pollution.
          </p>

          <div className="public-hero-actions">
            <button 
              type="button" 
              onClick={onNavigateAuth}
              className="public-btn-primary"
            >
              <span>Test Payload in Sandbox</span>
              <ArrowRight size={16} />
            </button>
            <button 
              type="button" 
              onClick={() => onNavigate("radar")}
              className="public-btn-secondary"
            >
              <span>View Active Threat Radar</span>
            </button>
          </div>
        </section>

        {/* Interactive Detonation Console */}
        <section className="public-section">
          <div className="panel border-t border-teal-500/30">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-teal" />
                <span className="font-mono text-sm font-bold text-primary">MicroVM Detonation Session #SANSEC-DET-8831</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={rerunSimulation}
                  disabled={isRunning}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition text-secondary cursor-pointer disabled:opacity-50"
                >
                  {isRunning ? <Play size={13} className="animate-spin text-teal" /> : <RotateCcw size={13} />}
                  <span>{isRunning ? "Detonating..." : "Replay Detonation"}</span>
                </button>
                <div className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono font-semibold">
                  THREAT SCORE: 94/100
                </div>
              </div>
            </div>

            {/* Terminal Window */}
            <div className="rounded-lg bg-black/60 p-4 font-mono text-xs border border-white/5 space-y-2.5 max-h-[380px] overflow-y-auto">
              {SAMPLE_LOGS.slice(0, activeStep).map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 py-1 border-b border-white/5 last:border-none">
                  <span className="text-muted shrink-0">[{log.timestamp}]</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    log.level === 'danger' ? 'bg-red-500/20 text-red-400' :
                    log.level === 'warning' ? 'bg-orange-500/20 text-orange-400' :
                    log.level === 'success' ? 'bg-teal-500/20 text-teal' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {log.stage}
                  </span>
                  <span className="text-teal shrink-0 font-semibold">{log.syscall}</span>
                  <span className="text-secondary break-all">{log.detail}</span>
                </div>
              ))}
              {activeStep === 0 && (
                <div className="text-muted py-6 text-center">Click 'Replay Detonation' to initiate simulated dynamic execution trace.</div>
              )}
            </div>
          </div>
        </section>

        {/* Evasion Countermeasures Grid */}
        <section className="public-section">
          <div className="public-section-header">
            <h2 className="public-section-title">Evasion & Anti-Analysis Countermeasures</h2>
            <p className="public-section-subtitle">
              Modern malware uses complex sandbox detection. SANSEC AI employs active deception to force payloads to reveal their true intent.
            </p>
          </div>

          <div className="public-features-grid">
            <div className="coffer-card">
              <div className="flex items-center gap-3 mb-2">
                <Zap size={20} className="text-orange-400" />
                <h3 className="text-base font-bold text-primary">Time Acceleration & Sleep Bypassing</h3>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Interceps `Sleep()`, `WaitForSingleObject()`, and `NtDelayExecution()` calls, advancing virtual clocks instantly to negate long sleep evasions.
              </p>
            </div>

            <div className="coffer-card">
              <div className="flex items-center gap-3 mb-2">
                <Eye size={20} className="text-blue-400" />
                <h3 className="text-base font-bold text-primary">Human Interaction Emulation</h3>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Generates stochastic mouse paths, clicks, window scrolling, and keystrokes so malware awaiting user confirmation executes immediately.
              </p>
            </div>

            <div className="coffer-card">
              <div className="flex items-center gap-3 mb-2">
                <ShieldAlert size={20} className="text-teal" />
                <h3 className="text-base font-bold text-primary">Hardware Artifact Cloaking</h3>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Spoofs real OEM BIOS strings, GPU drivers, and realistic process trees (Chrome, Word, Slack) preventing environment fingerprinting.
              </p>
            </div>

            <div className="coffer-card">
              <div className="flex items-center gap-3 mb-2">
                <FileSearch size={20} className="text-purple-400" />
                <h3 className="text-base font-bold text-primary">Volatile Memory Extraction</h3>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                Extracts unmapped memory buffers right when payloads decompress in RAM, capturing original clean binaries before encryption locks.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
