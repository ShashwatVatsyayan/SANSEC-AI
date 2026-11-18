import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Mail, 
  Lock, 
  User as UserIcon, 
  AlertTriangle, 
  ArrowLeft, 
  Key, 
  ShieldCheck, 
  Check, 
  Eye, 
  EyeOff, 
  Terminal, 
  Activity, 
  Cpu, 
  Database, 
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { rememberedCredentialsManager, BASE_URL } from "../services/api.ts";
import { BlackHoleBackground } from "./BlackHoleBackground.tsx";

interface CapabilitySpec {
  key: string;
  name: string;
  shortDesc: string;
  metric: string;
  badge: string;
}

const CAPABILITIES: CapabilitySpec[] = [
  {
    key: "Q",
    name: "Quench Heuristics",
    shortDesc: "Real-time behavioural entropy quenching and anti-evasion signature neutralization before payload detonation.",
    metric: "0.04ms execution latency",
    badge: "Active Defense"
  },
  {
    key: "S",
    name: "Sandbox Detonation",
    shortDesc: "Isolated kernel-level virtual environment capturing system call intercepts, registry alterations, and process injections.",
    metric: "Air-gapped microVMs",
    badge: "Zero-Day Containment"
  },
  {
    key: "A",
    name: "AST Decompiler",
    shortDesc: "Static abstract syntax tree reconstruction extracting packed strings, encrypted imports, and hidden function pointers.",
    metric: "PE / ELF / Mach-O",
    badge: "Binary Dissection"
  },
  {
    key: "T",
    name: "Threat Scoring",
    shortDesc: "Multi-layered heuristic classification fusing MITRE ATT&CK mapping with deterministic risk index scoring.",
    metric: "0-100 Confidence Index",
    badge: "Autonomous Intel"
  },
  {
    key: "E",
    name: "Evasion Shield",
    shortDesc: "Detects VM-detection, debugger timing anomalies, sleep-skipping tricks, and hypervisor interrogation attempts.",
    metric: "42 Anti-Analysis checks",
    badge: "Counter-Deception"
  },
  {
    key: "M",
    name: "Memory Forensics",
    shortDesc: "Dynamic process memory dumps, VAD tree inspection, shellcode hunting, and live injection tracking.",
    metric: "Kernel Ring-0 telemetry",
    badge: "Deep Inspection"
  }
];

export const AuthPage: React.FC = () => {
  const { login, loginGoogle } = useAuth();
  
  // Tab states: 'login' | 'register' | 'otp' | 'forgot'
  const [viewTab, setViewTab] = useState<"login" | "register" | "otp" | "forgot">("login");
  
  // Active Capability selected from the Crucible ticker pills
  const [selectedCap, setSelectedCap] = useState<CapabilitySpec>(CAPABILITIES[0]);
  
  // Remember credentials state
  const savedCreds = rememberedCredentialsManager.getSaved();
  const [rememberMe, setRememberMe] = useState(true);

  // Form Fields
  const [username, setUsername] = useState(savedCreds?.username || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification state
  const [userOtpInput, setUserOtpInput] = useState("");
  const [otpNotice, setOtpNotice] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeModalNav, setActiveModalNav] = useState<string | null>(null);

  // Reference for focusing input on CTA click
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const terminalCardRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener for Crucible pills (Q, S, A, T, E, M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      const char = e.key.toUpperCase();
      const match = CAPABILITIES.find(c => c.key === char);
      if (match) {
        setSelectedCap(match);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const scrollToTerminal = () => {
    if (terminalCardRef.current) {
      terminalCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => {
      usernameInputRef.current?.focus();
    }, 300);
  };

  const fillAdminCredentials = () => {
    setUsername("admin@sansec.ai");
    setPassword("admin");
    setViewTab("login");
    setSuccessMsg("Admin credentials filled. Ready to authenticate.");
    setTimeout(() => setSuccessMsg(""), 3500);
    scrollToTerminal();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg("Identity and password token are required.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      await login(username, password);
      if (rememberMe) {
        rememberedCredentialsManager.save(username);
      } else {
        rememberedCredentialsManager.clear();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid authentication credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      setErrorMsg("All fields are required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to dispatch verification code.");

      setOtpNotice(data.message || `Verification code transmitted to ${email}`);
      setViewTab("otp");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userOtpInput || userOtpInput.length < 6) {
      setErrorMsg("A complete 6-digit verification code is required.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          otp_code: userOtpInput
        })
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.detail || "Verification failed.");

      await login(username, password);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setErrorMsg("Email address is required.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      setSuccessMsg(data.message || "Reset link dispatched to registered email.");
      setTimeout(() => {
        setViewTab("login");
        setSuccessMsg("");
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Service temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const triggerNativeGoogleSignIn = () => {
    loginGoogle("analyst@sansec.ai", "SANSEC Analyst");
  };

  return (
    <div className="crucible-portal-root">
      <BlackHoleBackground />

      {/* ── Top Navigation Bar ──────────────────────────────────── */}
      <header className="crucible-nav">
        <div className="crucible-nav-inner">
          <div className="crucible-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img 
              src="/sansec-logo.png" 
              alt="SANSEC AI Logo" 
              className="crucible-brand-img" 
            />
            <span className="crucible-brand-name">
              SANSEC <span className="crucible-brand-badge">AI</span>
            </span>
          </div>

          <nav className="crucible-nav-links" aria-label="Portal Navigation">
            <button 
              type="button" 
              className="crucible-nav-link"
              onClick={() => setActiveModalNav("Platform Architecture")}
            >
              Platform
            </button>
            <button 
              type="button" 
              className="crucible-nav-link"
              onClick={() => setActiveModalNav("Sandbox Detonation Engine")}
            >
              Detonation Engine
            </button>
            <button 
              type="button" 
              className="crucible-nav-link"
              onClick={() => setActiveModalNav("Threat Intelligence & Radar")}
            >
              Threat Radar
            </button>
            <button 
              type="button" 
              className="crucible-nav-link"
              onClick={() => setActiveModalNav("MITRE ATT&CK Matrix")}
            >
              MITRE Matrix
            </button>
            <button 
              type="button" 
              className="crucible-nav-link"
              onClick={() => setActiveModalNav("Security Documentation & API")}
            >
              Research
            </button>
          </nav>

          <div className="crucible-nav-actions">
            <div className="crucible-status-pill" title="All detection microservices nominal">
              <span className="crucible-status-dot" />
              <span>SOC Nominal</span>
            </div>

            <button 
              type="button" 
              onClick={fillAdminCredentials}
              className="crucible-admin-quick-btn"
              title="Auto-fill Demo Admin credentials"
            >
              <ShieldCheck size={14} className="text-teal" />
              <span>Fill Admin</span>
            </button>

            <button 
              type="button" 
              onClick={scrollToTerminal}
              className="crucible-request-access-btn"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Hero & Terminal Two-Column Grid ────────────────── */}
      <main className="crucible-main-container">
        <div className="crucible-content-grid">
          
          {/* ── Left Column: Editorial Crucible Hero ─────────────── */}
          <section className="crucible-hero-section">
            <div className="crucible-hero-content">
              <h1 className="crucible-title">
                Defense in<br />
                <span className="crucible-gradient-title">Obsidian.</span>
              </h1>

              <p className="crucible-description">
                Autonomous malware dissection, neural payload deconstruction, and deterministic sandbox detonation — engineered for zero-trust architectures.
              </p>

              <div className="crucible-hero-cta-group">
                <button 
                  type="button" 
                  onClick={scrollToTerminal}
                  className="crucible-btn-primary"
                >
                  Start Dissection
                </button>
                <button 
                  type="button" 
                  onClick={() => setActiveModalNav("Heuristics and Behavioral Engine")}
                  className="crucible-btn-secondary"
                >
                  Read the Method
                </button>
              </div>

              {/* Dynamic Live Telemetry Showcase for Selected Capability */}
              <div className="crucible-telemetry-card">
                <div className="crucible-telemetry-header">
                  <div className="crucible-telemetry-title-group">
                    <span className="crucible-telemetry-key-badge">[{selectedCap.key}]</span>
                    <span className="crucible-telemetry-name">{selectedCap.name}</span>
                  </div>
                  <span className="crucible-telemetry-badge">{selectedCap.badge}</span>
                </div>
                <p className="crucible-telemetry-desc">{selectedCap.shortDesc}</p>
                <div className="crucible-telemetry-footer">
                  <span className="crucible-telemetry-metric">
                    <Activity size={12} className="inline mr-1" />
                    {selectedCap.metric}
                  </span>
                  <span className="crucible-telemetry-hint">Press [{selectedCap.key}] to inspect</span>
                </div>
              </div>

              {/* Interactive Capability Ticker / Keyboard Shortcut Pills */}
              <div className="crucible-pills-container">
                <p className="crucible-pills-label">
                  Operationalized by SecOps teams at
                </p>
                <div className="crucible-pills-row" role="region" aria-label="Interactive capability shortcuts">
                  {CAPABILITIES.map((cap) => {
                    const isSelected = selectedCap.key === cap.key;
                    return (
                      <button
                        key={cap.key}
                        type="button"
                        onClick={() => setSelectedCap(cap)}
                        className={`crucible-shortcut-pill ${isSelected ? "selected" : ""}`}
                        aria-pressed={isSelected}
                        title={`Press '${cap.key}' key or click to view ${cap.name}`}
                      >
                        <span className="crucible-pill-key">{cap.key}</span>
                        <span className="crucible-pill-text">{cap.name.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="crucible-disclaimer">
                  SANSEC AI is an autonomous malware defense platform. Figures & heuristics are calibrated for live SOC environments.
                </p>
              </div>
            </div>
          </section>

          {/* ── Right Column: Obsidian Authentication Terminal ───── */}
          <section className="crucible-terminal-section" ref={terminalCardRef}>
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="crucible-terminal-card"
            >
              {/* Terminal Card Header */}
              <div className="terminal-card-header">
                <div className="terminal-brand-row">
                  <img 
                    src="/sansec-logo.png" 
                    alt="SANSEC AI Emblem" 
                    className="terminal-logo-img" 
                  />
                  <div>
                    <h2 className="terminal-title">Access Console</h2>
                    <p className="terminal-subtitle">SecOps Clearance Required</p>
                  </div>
                </div>

                {/* View switcher tabs */}
                <div className="terminal-tabs-nav" role="tablist">
                  <button 
                    type="button"
                    role="tab"
                    aria-selected={viewTab === "login"}
                    onClick={() => { setViewTab("login"); setErrorMsg(""); setSuccessMsg(""); }}
                    className={`terminal-tab-btn ${viewTab === "login" ? "active" : ""}`}
                  >
                    Sign In
                  </button>
                  <button 
                    type="button"
                    role="tab"
                    aria-selected={viewTab === "register"}
                    onClick={() => { setViewTab("register"); setErrorMsg(""); setSuccessMsg(""); }}
                    className={`terminal-tab-btn ${viewTab === "register" ? "active" : ""}`}
                  >
                    Create Profile
                  </button>
                </div>
              </div>

              {/* Demo Admin Quick-Fill Banner */}
              <div className="terminal-admin-strip">
                <div className="terminal-admin-info">
                  <ShieldCheck size={15} className="text-teal" />
                  <span>Demo Credentials Available</span>
                </div>
                <button
                  type="button"
                  onClick={fillAdminCredentials}
                  className="terminal-admin-btn"
                  title="Autofill admin credentials"
                >
                  Fill Admin
                </button>
              </div>

              {/* Alerts */}
              {errorMsg && (
                <div className="terminal-alert-box error" role="alert">
                  <AlertTriangle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="terminal-alert-box success" role="status">
                  <Check size={15} />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Form Views */}
              <AnimatePresence mode="wait">
                {viewTab === "login" && (
                  <motion.form 
                    key="login"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={handleLoginSubmit}
                    className="terminal-form"
                  >
                    <div className="terminal-form-group">
                      <label htmlFor="login-username" className="terminal-label">
                        Username or Email
                      </label>
                      <div className="terminal-input-wrapper">
                        <UserIcon className="terminal-input-icon" size={16} />
                        <input 
                          id="login-username"
                          ref={usernameInputRef}
                          name="username"
                          type="text" 
                          placeholder="analyst@sansec.ai"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="terminal-input"
                          autoComplete="username"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="terminal-form-group">
                      <div className="terminal-label-row">
                        <label htmlFor="login-password" className="terminal-label">
                          Password Token
                        </label>
                        <button 
                          type="button" 
                          onClick={() => { setViewTab("forgot"); setErrorMsg(""); setSuccessMsg(""); }}
                          className="terminal-link-subtle"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="terminal-input-wrapper">
                        <Lock className="terminal-input-icon" size={16} />
                        <input 
                          id="login-password"
                          name="password"
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="terminal-input"
                          autoComplete="current-password"
                          required
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="terminal-pwd-toggle"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="terminal-options-row">
                      <label className="terminal-checkbox-label">
                        <input 
                          type="checkbox" 
                          id="rem"
                          checked={rememberMe} 
                          onChange={(e) => setRememberMe(e.target.checked)} 
                          className="terminal-checkbox"
                        />
                        <span>Remember credentials</span>
                      </label>
                      <span className="terminal-tag-mono">AES-256</span>
                    </div>

                    <button type="submit" disabled={loading} className="terminal-submit-btn">
                      {loading ? "Authenticating Session..." : "Authorize Workspace Access"}
                    </button>

                    <div className="terminal-divider">
                      <span>OR AUTHENTICATE WITH</span>
                    </div>

                    <button 
                      type="button" 
                      onClick={triggerNativeGoogleSignIn} 
                      disabled={loading} 
                      className="terminal-google-btn"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" className="mr-2">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Sign In with Google
                    </button>
                  </motion.form>
                )}

                {viewTab === "register" && (
                  <motion.form 
                    key="register"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={handleRegisterSubmit}
                    className="terminal-form"
                  >
                    <div className="terminal-form-group">
                      <label htmlFor="register-username" className="terminal-label">
                        Analyst Call-sign / Username
                      </label>
                      <div className="terminal-input-wrapper">
                        <UserIcon className="terminal-input-icon" size={16} />
                        <input 
                          id="register-username"
                          name="username"
                          type="text" 
                          placeholder="secops_analyst"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="terminal-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="terminal-form-group">
                      <label htmlFor="register-email" className="terminal-label">
                        Institutional Email Address
                      </label>
                      <div className="terminal-input-wrapper">
                        <Mail className="terminal-input-icon" size={16} />
                        <input 
                          id="register-email"
                          name="email"
                          type="email" 
                          placeholder="analyst@sansec.ai"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="terminal-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="terminal-form-group">
                      <label htmlFor="register-password" className="terminal-label">
                        Security Passphrase (min. 8 characters)
                      </label>
                      <div className="terminal-input-wrapper">
                        <Lock className="terminal-input-icon" size={16} />
                        <input 
                          id="register-password"
                          name="password"
                          type="password" 
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="terminal-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="terminal-form-group">
                      <label htmlFor="register-confirm" className="terminal-label">
                        Confirm Passphrase
                      </label>
                      <div className="terminal-input-wrapper">
                        <Lock className="terminal-input-icon" size={16} />
                        <input 
                          id="register-confirm"
                          name="confirmPassword"
                          type="password" 
                          placeholder="••••••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="terminal-input"
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="terminal-submit-btn">
                      {loading ? "Generating Dispatch..." : "Request Access Token"}
                    </button>

                    <div className="terminal-bottom-toggle">
                      Already cleared?{" "}
                      <button 
                        type="button" 
                        onClick={() => { setViewTab("login"); setErrorMsg(""); setSuccessMsg(""); }}
                        className="terminal-highlight-btn"
                      >
                        Sign In
                      </button>
                    </div>
                  </motion.form>
                )}

                {viewTab === "otp" && (
                  <motion.form 
                    key="otp"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={handleOtpSubmit}
                    className="terminal-form"
                  >
                    {otpNotice && (
                      <p className="terminal-notice-text">
                        {otpNotice}
                      </p>
                    )}

                    <div className="terminal-form-group">
                      <label htmlFor="otp-code" className="terminal-label">
                        6-Digit MFA Verification Code
                      </label>
                      <div className="terminal-input-wrapper">
                        <Key className="terminal-input-icon" size={16} />
                        <input 
                          id="otp-code"
                          name="otpCode"
                          type="text" 
                          maxLength={6}
                          placeholder="000000"
                          value={userOtpInput}
                          onChange={(e) => setUserOtpInput(e.target.value)}
                          className="terminal-input mono"
                          style={{ textAlign: 'center', letterSpacing: '0.35em', fontSize: '18px' }}
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="terminal-submit-btn">
                      {loading ? "Verifying Signature..." : "Verify & Activate Account"}
                    </button>

                    <button 
                      type="button" 
                      onClick={() => { setViewTab("register"); setErrorMsg(""); }}
                      className="terminal-back-btn"
                    >
                      <ArrowLeft size={14} className="mr-1" /> Back to Registration
                    </button>
                  </motion.form>
                )}

                {viewTab === "forgot" && (
                  <motion.form 
                    key="forgot"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={handleForgotSubmit}
                    className="terminal-form"
                  >
                    <div className="terminal-form-group">
                      <label htmlFor="forgot-email" className="terminal-label">
                        Institutional Recovery Email
                      </label>
                      <div className="terminal-input-wrapper">
                        <Mail className="terminal-input-icon" size={16} />
                        <input 
                          id="forgot-email"
                          name="resetEmail"
                          type="email" 
                          placeholder="analyst@sansec.ai"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="terminal-input"
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="terminal-submit-btn">
                      {loading ? "Transmitting Reset Link..." : "Dispatch Recovery Token"}
                    </button>

                    <button 
                      type="button" 
                      onClick={() => { setViewTab("login"); setErrorMsg(""); setSuccessMsg(""); }}
                      className="terminal-back-btn"
                    >
                      <ArrowLeft size={14} className="mr-1" /> Return to Authentication
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </section>

        </div>
      </main>

      {/* ── Feature Spec Modal (When clicking top navbar items) ──── */}
      {activeModalNav && (
        <div className="crucible-modal-overlay" onClick={() => setActiveModalNav(null)}>
          <div className="crucible-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="crucible-modal-header">
              <div className="flex items-center gap-2">
                <Shield className="text-teal" size={18} />
                <h3 className="crucible-modal-title">{activeModalNav}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveModalNav(null)}
                className="crucible-modal-close"
              >
                ✕
              </button>
            </div>
            <div className="crucible-modal-body">
              <p className="crucible-modal-lead">
                SANSEC AI integrates client-side and server-side static reverse engineering with deterministic sandbox execution to deliver sub-millisecond malware triage.
              </p>
              <div className="crucible-spec-grid">
                <div className="crucible-spec-item">
                  <span className="spec-label">Payload Ingestion</span>
                  <span className="spec-value">PE (x86/x64), DLL, SYS, ELF, PDF, Office OLE</span>
                </div>
                <div className="crucible-spec-item">
                  <span className="spec-label">Entropy Detection</span>
                  <span className="spec-value">Shannon Byte-Level Distribution Indexing (&gt; 7.2 packed threshold)</span>
                </div>
                <div className="crucible-spec-item">
                  <span className="spec-label">MITRE ATT&CK Matrix</span>
                  <span className="spec-value">v14.1 Enterprise Mappings across 14 Attack Tactics</span>
                </div>
                <div className="crucible-spec-item">
                  <span className="spec-label">Vercel Serverless Ready</span>
                  <span className="spec-value">Automatic chunked ArrayBuffer client-engine fallback for payloads &gt; 4.5MB</span>
                </div>
              </div>
            </div>
            <div className="crucible-modal-footer">
              <button 
                type="button" 
                onClick={() => { setActiveModalNav(null); scrollToTerminal(); }}
                className="crucible-btn-primary"
              >
                Access Platform Terminal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
