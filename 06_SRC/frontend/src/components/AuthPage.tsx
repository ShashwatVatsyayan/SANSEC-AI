import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Mail, 
  Lock, 
  User as UserIcon, 
  AlertTriangle, 
  Key, 
  ShieldCheck, 
  Check, 
  Eye, 
  EyeOff, 
  IdCard,
  Sparkles,
  ChevronRight,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { rememberedCredentialsManager, BASE_URL } from "../services/api.ts";
import { BlackHoleBackground } from "./BlackHoleBackground.tsx";

export const AuthPage: React.FC = () => {
  const { login, loginGoogle } = useAuth();
  
  // Tab states: 'login' | 'register' | 'otp' | 'forgot'
  const [viewTab, setViewTab] = useState<"login" | "register" | "otp" | "forgot">("register");
  
  // Saved credentials
  const savedCreds = rememberedCredentialsManager.getSaved();
  const [rememberMe, setRememberMe] = useState(true);

  // Form Fields matching reference image
  const [firstName, setFirstName] = useState("Michał");
  const [lastName, setLastName] = useState("Masiak");
  const [username, setUsername] = useState(savedCreds?.username || "");
  const [email, setEmail] = useState("michal.masiak@anywhere.co");
  const [password, setPassword] = useState("••••••••");
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification state
  const [userOtpInput, setUserOtpInput] = useState("");
  const [otpNotice, setOtpNotice] = useState("");

  // Method modal toggle
  const [showMethodModal, setShowMethodModal] = useState(false);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeModalNav, setActiveModalNav] = useState<string | null>(null);

  // Input references
  const firstInputRef = useRef<HTMLInputElement>(null);

  const fillAdminCredentials = () => {
    setUsername("admin@sansec.ai");
    setEmail("admin@sansec.ai");
    setPassword("admin");
    setFirstName("Admin");
    setLastName("SecOps");
    setViewTab("login");
    setShowMethodModal(false);
    setSuccessMsg("Demo admin credentials primed. Authorizing...");
    setTimeout(() => {
      login("admin@sansec.ai", "admin").catch((e: any) => setErrorMsg(e.message));
    }, 400);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginUser = username || email;
    if (!loginUser || !password) {
      setErrorMsg("Identity and password token are required.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      await login(loginUser, password);
      if (rememberMe) {
        rememberedCredentialsManager.save(loginUser);
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
    const resolvedUsername = username || `${firstName.trim().toLowerCase().replace(/\s+/g, '_')}_${lastName.trim().toLowerCase().replace(/\s+/g, '_')}` || "analyst";
    
    if (!email || !password) {
      setErrorMsg("Email and password passphrase are required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg("Please enter a valid institutional email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Passphrase must contain at least 6 characters.");
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

      setUsername(resolvedUsername);
      setOtpNotice(data.message || `MFA verification code dispatched to ${email}`);
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

    const resolvedUsername = username || `${firstName.trim().toLowerCase().replace(/\s+/g, '_')}_${lastName.trim().toLowerCase().replace(/\s+/g, '_')}` || "analyst";

    try {
      const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: resolvedUsername,
          email,
          password,
          otp_code: userOtpInput
        })
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.detail || "Verification failed.");

      await login(resolvedUsername, password);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setErrorMsg("Institutional email address is required.");
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
      setSuccessMsg(data.message || "Recovery link dispatched to institutional inbox.");
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
    setShowMethodModal(false);
    loginGoogle("analyst@sansec.ai", `${firstName} ${lastName}`.trim() || "SANSEC Analyst");
  };

  return (
    <div className="ref-portal-root">
      <BlackHoleBackground />

      {/* ── Minimalist Top Navigation ────────────────────────────── */}
      <header className="ref-top-nav">
        <div className="ref-nav-inner">
          <div className="ref-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img 
              src="/sansec-logo.png" 
              alt="SANSEC AI Logo" 
              className="ref-brand-icon" 
            />
            <span className="ref-brand-text">
              SANSEC <span className="ref-brand-badge">AI</span>
            </span>
          </div>

          <nav className="ref-nav-links" aria-label="Portal Navigation">
            <button 
              type="button" 
              className="ref-nav-link"
              onClick={() => setActiveModalNav("Platform Architecture")}
            >
              Platform
            </button>
            <button 
              type="button" 
              className="ref-nav-link"
              onClick={() => setActiveModalNav("Sandbox Detonation Engine")}
            >
              Detonation Engine
            </button>
            <button 
              type="button" 
              className="ref-nav-link"
              onClick={() => setActiveModalNav("Threat Intelligence & Radar")}
            >
              Threat Radar
            </button>
            <button 
              type="button" 
              className="ref-nav-link"
              onClick={() => setActiveModalNav("Security Documentation & API")}
            >
              Research
            </button>
          </nav>

          <div className="ref-nav-actions">
            <div className="ref-status-badge" title="All microservices nominal">
              <span className="ref-status-indicator" />
              <span>SOC Nominal</span>
            </div>

            <button 
              type="button" 
              onClick={fillAdminCredentials}
              className="ref-fill-admin-btn"
              title="One-click demo admin authentication"
            >
              <ShieldCheck size={14} className="text-teal" />
              <span>Fill Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Viewport Centerstage ────────────────────────────── */}
      <main className="ref-main-container">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="ref-auth-card"
        >
          {/* ── Left Column: Reference Form ──────────────────────── */}
          <div className="ref-form-column">

            {/* Main Title with Blue Dot (Direct & Powerful, no banned kicker) */}
            <h1 className="ref-title">
              {viewTab === "register" && (
                <>Create new account<span className="ref-dot">.</span></>
              )}
              {viewTab === "login" && (
                <>Sign in to workspace<span className="ref-dot">.</span></>
              )}
              {viewTab === "otp" && (
                <>Verify identity<span className="ref-dot">.</span></>
              )}
              {viewTab === "forgot" && (
                <>Reset passphrase<span className="ref-dot">.</span></>
              )}
            </h1>

            {/* Switch Sub-link */}
            <div className="ref-switch-row">
              {viewTab === "register" && (
                <>
                  <span className="ref-switch-label">Already A Member?</span>
                  <button 
                    type="button" 
                    onClick={() => { setViewTab("login"); setErrorMsg(""); setSuccessMsg(""); }}
                    className="ref-switch-btn"
                  >
                    Log In
                  </button>
                </>
              )}
              {viewTab === "login" && (
                <>
                  <span className="ref-switch-label">Don't have clearance?</span>
                  <button 
                    type="button" 
                    onClick={() => { setViewTab("register"); setErrorMsg(""); setSuccessMsg(""); }}
                    className="ref-switch-btn"
                  >
                    Create account
                  </button>
                </>
              )}
              {viewTab === "otp" && (
                <>
                  <span className="ref-switch-label">Wrong destination?</span>
                  <button 
                    type="button" 
                    onClick={() => { setViewTab("register"); setErrorMsg(""); }}
                    className="ref-switch-btn"
                  >
                    Return to register
                  </button>
                </>
              )}
              {viewTab === "forgot" && (
                <>
                  <span className="ref-switch-label">Remembered credentials?</span>
                  <button 
                    type="button" 
                    onClick={() => { setViewTab("login"); setErrorMsg(""); }}
                    className="ref-switch-btn"
                  >
                    Return to login
                  </button>
                </>
              )}
            </div>

            {/* Alerts */}
            {errorMsg && (
              <div className="ref-alert-box error" role="alert">
                <AlertTriangle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="ref-alert-box success" role="status">
                <Check size={15} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form Modes */}
            <AnimatePresence mode="wait">
              {/* ── REGISTER MODE (Reference Image Layout) ──────── */}
              {viewTab === "register" && (
                <motion.form 
                  key="form-register"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleRegisterSubmit}
                  className="ref-form-body"
                >
                  {/* Row 1: First name & Last name split */}
                  <div className="ref-grid-split">
                    <div className="ref-field-group">
                      <label htmlFor="reg-first-name" className="ref-field-label">First name</label>
                      <div className="ref-input-shell">
                        <input 
                          id="reg-first-name"
                          ref={firstInputRef}
                          type="text" 
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="ref-input-ctrl"
                          placeholder="Michał"
                          required
                        />
                        <IdCard className="ref-input-trailing-icon" size={16} />
                      </div>
                    </div>

                    <div className="ref-field-group">
                      <label htmlFor="reg-last-name" className="ref-field-label">Last name</label>
                      <div className="ref-input-shell">
                        <input 
                          id="reg-last-name"
                          type="text" 
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="ref-input-ctrl"
                          placeholder="Masiak"
                          required
                        />
                        <IdCard className="ref-input-trailing-icon" size={16} />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Email */}
                  <div className="ref-field-group">
                    <label htmlFor="reg-email" className="ref-field-label">Email</label>
                    <div className="ref-input-shell">
                      <input 
                        id="reg-email"
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="ref-input-ctrl"
                        placeholder="michal.masiak@anywhere.co"
                        required
                      />
                      <Mail className="ref-input-trailing-icon" size={16} />
                    </div>
                  </div>

                  {/* Row 3: Password */}
                  <div className="ref-field-group">
                    <label htmlFor="reg-password" className="ref-field-label">Password</label>
                    <div className="ref-input-shell active-highlight">
                      <input 
                        id="reg-password"
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="ref-input-ctrl"
                        placeholder="••••••••"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="ref-input-toggle-btn"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Row 4: Action Buttons (Pills from Reference) */}
                  <div className="ref-actions-row">
                    <button 
                      type="button" 
                      onClick={() => setShowMethodModal(true)}
                      className="ref-btn-secondary"
                    >
                      Change method
                    </button>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="ref-btn-primary"
                    >
                      {loading ? "Transmitting..." : "Create account"}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* ── LOGIN MODE ─────────────────────────────────── */}
              {viewTab === "login" && (
                <motion.form 
                  key="form-login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleLoginSubmit}
                  className="ref-form-body"
                >
                  {/* Row 1: Username / Email */}
                  <div className="ref-field-group">
                    <label htmlFor="login-identity" className="ref-field-label">Username or Email</label>
                    <div className="ref-input-shell">
                      <input 
                        id="login-identity"
                        type="text" 
                        value={username || email}
                        onChange={(e) => { setUsername(e.target.value); setEmail(e.target.value); }}
                        className="ref-input-ctrl"
                        placeholder="analyst@sansec.ai"
                        autoComplete="username"
                        required
                      />
                      <UserIcon className="ref-input-trailing-icon" size={16} />
                    </div>
                  </div>

                  {/* Row 2: Password */}
                  <div className="ref-field-group">
                    <label htmlFor="login-token" className="ref-field-label">Password token</label>
                    <div className="ref-input-shell active-highlight">
                      <input 
                        id="login-token"
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="ref-input-ctrl"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="ref-input-toggle-btn"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Options row */}
                  <div className="ref-options-row">
                    <label className="ref-checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={rememberMe} 
                        onChange={(e) => setRememberMe(e.target.checked)} 
                        className="ref-checkbox"
                      />
                      <span>Remember credentials</span>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => { setViewTab("forgot"); setErrorMsg(""); setSuccessMsg(""); }}
                      className="ref-link-text"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Buttons */}
                  <div className="ref-actions-row">
                    <button 
                      type="button" 
                      onClick={() => setShowMethodModal(true)}
                      className="ref-btn-secondary"
                    >
                      Change method
                    </button>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="ref-btn-primary"
                    >
                      {loading ? "Authenticating..." : "Authorize access"}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* ── OTP MFA MODE ───────────────────────────────── */}
              {viewTab === "otp" && (
                <motion.form 
                  key="form-otp"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleOtpSubmit}
                  className="ref-form-body"
                >
                  {otpNotice && (
                    <p className="ref-notice-text">{otpNotice}</p>
                  )}

                  <div className="ref-field-group">
                    <label htmlFor="otp-input" className="ref-field-label">6-Digit MFA Verification Code</label>
                    <div className="ref-input-shell active-highlight">
                      <input 
                        id="otp-input"
                        type="text" 
                        maxLength={6}
                        placeholder="000000"
                        value={userOtpInput}
                        onChange={(e) => setUserOtpInput(e.target.value)}
                        className="ref-input-ctrl mono-code"
                        required
                      />
                      <Key className="ref-input-trailing-icon" size={16} />
                    </div>
                  </div>

                  <div className="ref-actions-row">
                    <button 
                      type="button" 
                      onClick={() => setViewTab("register")}
                      className="ref-btn-secondary"
                    >
                      ← Back
                    </button>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="ref-btn-primary"
                    >
                      {loading ? "Verifying..." : "Confirm & Enter"}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* ── FORGOT PASSWORD MODE ───────────────────────── */}
              {viewTab === "forgot" && (
                <motion.form 
                  key="form-forgot"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleForgotSubmit}
                  className="ref-form-body"
                >
                  <div className="ref-field-group">
                    <label htmlFor="forgot-email" className="ref-field-label">Institutional Recovery Email</label>
                    <div className="ref-input-shell">
                      <input 
                        id="forgot-email"
                        type="email" 
                        placeholder="analyst@sansec.ai"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="ref-input-ctrl"
                        required
                      />
                      <Mail className="ref-input-trailing-icon" size={16} />
                    </div>
                  </div>

                  <div className="ref-actions-row">
                    <button 
                      type="button" 
                      onClick={() => setViewTab("login")}
                      className="ref-btn-secondary"
                    >
                      ← Return
                    </button>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="ref-btn-primary"
                    >
                      {loading ? "Transmitting..." : "Dispatch Token"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

          </div>

          {/* ── Right Column: Scenic Mountain Backdrop & Monogram ── */}
          <div className="ref-graphic-column" aria-hidden="true">
            <div className="ref-graphic-gradient-overlay" />
            
            <svg 
              viewBox="0 0 460 560" 
              preserveAspectRatio="xMidYMid slice" 
              className="ref-graphic-svg"
            >
              <defs>
                <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0b1019" />
                  <stop offset="45%" stopColor="#121826" />
                  <stop offset="100%" stopColor="#1a2337" />
                </linearGradient>

                <linearGradient id="mtnGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#162033" />
                  <stop offset="100%" stopColor="#0c121d" />
                </linearGradient>

                <linearGradient id="mtnGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1c2840" />
                  <stop offset="100%" stopColor="#0e1524" />
                </linearGradient>

                <linearGradient id="mistGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(56, 189, 248, 0)" />
                  <stop offset="100%" stopColor="rgba(15, 22, 36, 0.88)" />
                </linearGradient>
              </defs>

              {/* Sky */}
              <rect width="460" height="560" fill="url(#skyGrad)" />

              {/* Distant Mountain Ridge */}
              <path 
                d="M -30 330 L 60 210 L 130 250 L 210 170 L 310 270 L 410 190 L 490 240 L 490 560 L -30 560 Z" 
                fill="url(#mtnGrad1)" 
                opacity="0.85" 
              />

              {/* Closer Ridge */}
              <path 
                d="M -30 380 L 80 290 L 160 340 L 250 240 L 350 320 L 430 280 L 490 320 L 490 560 L -30 560 Z" 
                fill="url(#mtnGrad2)" 
              />

              {/* Forest Silhouette Contours */}
              <path 
                d="M 160 560 L 180 430 L 200 560 L 220 450 L 240 560 L 270 420 L 295 560 L 330 440 L 360 560 L 410 470 L 440 560 L 490 490 L 490 560 Z" 
                fill="#090e18" 
                opacity="0.9" 
              />

              {/* Ground Mist */}
              <rect y="360" width="460" height="200" fill="url(#mistGrad)" />

              {/* Signature Dashed Contour Line from Reference Image */}
              <path 
                d="M 50 0 C 30 90, 180 130, 140 250 C 100 370, 240 430, 190 560" 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="1.2" 
                strokeDasharray="4 6" 
                strokeOpacity="0.45" 
              />

              <path 
                d="M 120 0 C 100 70, 230 110, 195 210 C 160 310, 290 380, 260 560" 
                fill="none" 
                stroke="rgba(255, 255, 255, 0.12)" 
                strokeWidth="1" 
                strokeDasharray="3 5" 
              />
            </svg>

            {/* Bottom-right Monogram Logo (matching `.W` in reference image) */}
            <div className="ref-brandmark-badge">
              <img 
                src="/sansec-logo.png" 
                alt="SANSEC Emblem" 
                className="ref-brandmark-img" 
              />
              <span className="ref-brandmark-title">.S</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ── Change Method Popover Modal ──────────────────────────── */}
      {showMethodModal && (
        <div className="ref-modal-overlay" onClick={() => setShowMethodModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="ref-method-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ref-method-header">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-teal" />
                <h3 className="ref-method-title">Authentication Methods</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowMethodModal(false)}
                className="ref-modal-close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="ref-method-options">
              {/* Option 1: Demo Admin Quickfill */}
              <button 
                type="button" 
                onClick={fillAdminCredentials}
                className="ref-method-option"
              >
                <div className="ref-method-icon-box">
                  <ShieldCheck size={18} className="text-teal" />
                </div>
                <div className="ref-method-info">
                  <span className="ref-method-opt-title">Demo Admin Clearance</span>
                  <span className="ref-method-opt-desc">Instant 1-click evaluation access (admin@sansec.ai)</span>
                </div>
                <ChevronRight size={16} className="ref-method-arrow" />
              </button>

              {/* Option 2: Native Google Sign-In */}
              <button 
                type="button" 
                onClick={triggerNativeGoogleSignIn}
                className="ref-method-option"
              >
                <div className="ref-method-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <div className="ref-method-info">
                  <span className="ref-method-opt-title">Google Enterprise SSO</span>
                  <span className="ref-method-opt-desc">Authenticate with authorized Google Workspace token</span>
                </div>
                <ChevronRight size={16} className="ref-method-arrow" />
              </button>

              {/* Option 3: MFA Passcode / OTP */}
              <button 
                type="button" 
                onClick={() => { setShowMethodModal(false); setViewTab("otp"); }}
                className="ref-method-option"
              >
                <div className="ref-method-icon-box">
                  <Key size={18} className="text-teal" />
                </div>
                <div className="ref-method-info">
                  <span className="ref-method-opt-title">MFA OTP Verification</span>
                  <span className="ref-method-opt-desc">Input one-time 6-digit authentication token</span>
                </div>
                <ChevronRight size={16} className="ref-method-arrow" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Feature Spec Modal (Top Navbar triggers) ─────────────── */}
      {activeModalNav && (
        <div className="ref-modal-overlay" onClick={() => setActiveModalNav(null)}>
          <div className="ref-spec-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ref-method-header">
              <div className="flex items-center gap-2">
                <Shield className="text-teal" size={18} />
                <h3 className="ref-method-title">{activeModalNav}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveModalNav(null)}
                className="ref-modal-close"
              >
                <X size={16} />
              </button>
            </div>
            
            <p className="ref-modal-lead">
              SANSEC AI integrates client-side and server-side static reverse engineering with deterministic sandbox execution to deliver sub-millisecond malware triage.
            </p>

            <div className="ref-spec-grid">
              <div className="ref-spec-box">
                <span className="ref-spec-title">Payload Ingestion</span>
                <span className="ref-spec-detail">PE (x86/x64), DLL, SYS, ELF, PDF, Office OLE</span>
              </div>
              <div className="ref-spec-box">
                <span className="ref-spec-title">Entropy Classification</span>
                <span className="ref-spec-detail">Shannon Distribution Indexing (&gt; 7.2 threshold)</span>
              </div>
              <div className="ref-spec-box">
                <span className="ref-spec-title">MITRE ATT&CK Matrix</span>
                <span className="ref-spec-detail">Enterprise v14.1 Mapping (14 Attack Tactics)</span>
              </div>
              <div className="ref-spec-box">
                <span className="ref-spec-title">Vercel Serverless Ready</span>
                <span className="ref-spec-detail">ArrayBuffer client-engine fallback for payloads &gt; 4.5MB</span>
              </div>
            </div>

            <div className="ref-modal-footer">
              <button 
                type="button" 
                onClick={() => setActiveModalNav(null)}
                className="ref-btn-primary"
              >
                Return to Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
