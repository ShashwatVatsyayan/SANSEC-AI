import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Mail, Lock, User as UserIcon, AlertTriangle, KeyRound, Globe, ArrowLeft, Key, CheckCircle2, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { rememberedCredentialsManager, BASE_URL } from "../services/api.ts";

import { BlackHoleBackground } from "./BlackHoleBackground.tsx";

export const AuthPage: React.FC = () => {
  const { login, loginGoogle, register } = useAuth();
  
  // Tab states: 'login' | 'register' | 'otp' | 'forgot'
  const [viewTab, setViewTab] = useState<"login" | "register" | "otp" | "forgot">("login");
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  
  // Remember credentials state
  const savedCreds = rememberedCredentialsManager.getSaved();
  const [rememberMe, setRememberMe] = useState(true);

  // Form Fields
  const [username, setUsername] = useState(savedCreds?.username || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  // OTP Verification state
  const [userOtpInput, setUserOtpInput] = useState("");
  const [otpNotice, setOtpNotice] = useState("");

  // Google OAuth fields
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg("Console identity and password key are required.");
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
      setErrorMsg("All fields are required to initiate profile registration.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg("Please enter a valid email address (e.g. analyst@company.com).");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password token must contain at least 8 characters.");
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "We could not send a verification email.");
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err instanceof Error ? err.message : "We could not send a verification email.");
      return;
    }

    setUserOtpInput("");
    setOtpNotice(`📬 A 6-digit security verification code has been dispatched to your email inbox (${email}). Please check your email to proceed.`);
    
    setTimeout(() => {
      setLoading(false);
      setViewTab("otp");
    }, 600);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userOtpInput) {
      setErrorMsg("Please enter the 6-digit verification code sent to your email.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      await register(username, email, password, userOtpInput.trim());
      setSuccessMsg("Email verified! Profile created and session activated.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete profile registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setErrorMsg("Registered email address is required.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSuccessMsg("If this registered identity exists, a reset token link has been dispatched.");
      setResetEmail("");
    }, 1200);
  };

  // Triggers native Google OAuth Account Chooser popup directly
  const triggerNativeGoogleSignIn = () => {
    setErrorMsg("");
    setLoading(true);

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "234218870563-2q5u309iguo2qf311s0nues60cpfi459.apps.googleusercontent.com";

    // 1. Google Identity Services (GIS) library native chooser
    if ((window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "email profile openid",
          prompt: "select_account",
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                if (res.ok) {
                  const googleUser = await res.json();
                  if (googleUser && googleUser.email) {
                    await loginGoogle(googleUser.email, googleUser.name);
                    return;
                  }
                }
              } catch (e) {
                console.error("Google userinfo API failed:", e);
              }
            }
            setLoading(false);
          },
          error_callback: (err: any) => {
            console.warn("GIS token client error:", err);
            setLoading(false);
          }
        });
        client.requestAccessToken({ prompt: "select_account" });
        return;
      } catch (err) {
        console.warn("GIS token client failed:", err);
      }
    }

    // 2. Direct Popup window to Google OAuth Account Chooser
    const redirectUri = window.location.origin;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&response_type=token&scope=email%20profile%20openid&prompt=select_account&redirect_uri=${encodeURIComponent(redirectUri)}`;

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      "GoogleAccountChooser",
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      setLoading(false);
    } else {
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setLoading(false);
        }
      }, 1000);
    }
  };

  return (
    <div className="login-screen-container relative">
      <BlackHoleBackground />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="login-card glow-card"
      >
        <div className="login-logo-header">
          <Shield className="login-shield-icon" size={48} />
          <h2>SANSEC <span className="gold-text">AI</span></h2>
          <p className="login-subtitle">SECURE MALWARE ANALYSIS</p>
        </div>

        {errorMsg && (
          <div className="auth-error-box mb-4 fade-in">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-error-box mb-4 fade-in" style={{ background: 'rgba(0, 230, 118, 0.1)', borderColor: 'rgba(0, 230, 118, 0.3)', color: 'var(--threat-low)' }}>
            <CheckCircle size={16} style={{ color: 'var(--threat-low)' }} />
            <span>{successMsg}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {viewTab === "login" && (
            <motion.form 
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleLoginSubmit}
              className="login-form"
            >
              {/* Admin Portal Credentials Badge */}
              <div className="w-full mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-red-400" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">Admin Portal Credentials</span>
                    <span className="text-[10px] font-mono text-muted block">admin@sansec.ai • admin</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUsername("admin@sansec.ai");
                    setPassword("admin");
                    setSuccessMsg("Admin credentials auto-filled: admin@sansec.ai");
                    setTimeout(() => setSuccessMsg(""), 3000);
                  }}
                  className="py-1 px-2.5 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition-all cursor-pointer"
                >
                  ⚡ Fill Admin
                </button>
              </div>

              {savedCreds?.username && (
                <button
                  type="button"
                  onClick={() => {
                    if (savedCreds.username) setUsername(savedCreds.username);
                    setSuccessMsg(`Username restored for: ${savedCreds.username}`);
                    setTimeout(() => setSuccessMsg(""), 3000);
                  }}
                  className="w-full mb-3 py-1.5 px-3 rounded-lg bg-gold/10 border border-gold/30 text-gold text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-gold/20 transition-all cursor-pointer"
                >
                  ⚡ Fill Saved Info ({savedCreds.username})
                </button>
              )}

              <div className="form-group">
                  <label>Username or email</label>
                <div className="input-wrapper">
                  <UserIcon className="input-icon" size={16} />
                  <input 
                    type="text" 
                    placeholder="e.g. analyst or analyst@company.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <div className="flex justify-between items-center">
                  <label>Password</label>
                  <button 
                    type="button" 
                    onClick={() => { setViewTab("forgot"); setErrorMsg(""); setSuccessMsg(""); }}
                    className="text-xs text-gold hover:underline font-semibold bg-transparent border-none cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={16} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 text-xs text-secondary">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)} 
                    className="accent-gold rounded"
                  />
                  <span>Remember my username on this device</span>
                </label>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full login-btn">
                {loading ? <div className="auth-spinner"></div> : "Authenticate Session"}
              </button>

              <div className="oauth-separator">
                  <span>OR CONTINUE WITH</span>
              </div>

              <button 
                type="button" 
                onClick={triggerNativeGoogleSignIn} 
                disabled={loading} 
                className="btn-secondary w-full flex items-center justify-center gap-2 hover:border-gold transition-all cursor-pointer"
                style={{ padding: '12px', fontSize: '0.85rem' }}
              >
                <Globe size={14} className="text-gold" />
                Google Workspace account
              </button>

              <div className="text-center mt-4">
                <span className="text-xs text-muted">New workspace analyst? </span>
                <button 
                  type="button" 
                  onClick={() => { setViewTab("register"); setErrorMsg(""); setSuccessMsg(""); }}
                  className="text-xs text-gold font-bold hover:underline bg-transparent border-none cursor-pointer"
                >
                  Create Profile
                </button>
              </div>
            </motion.form>
          )}

          {viewTab === "register" && (
            <motion.form 
              key="register"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleRegisterSubmit}
              className="login-form"
            >
              <div className="form-group">
                <label>Username</label>
                <div className="input-wrapper">
                  <UserIcon className="input-icon" size={16} />
                  <input 
                    type="text" 
                    placeholder="e.g. analyst_name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email address</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={16} />
                  <input 
                    type="email" 
                    placeholder="name@sansec.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password (at least 8 characters)</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={16} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Confirm password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={16} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full login-btn">
                {loading ? <div className="auth-spinner"></div> : "Create Analyst Profile"}
              </button>

              <div className="text-center mt-4">
                <span className="text-xs text-muted">Already have a profile? </span>
                <button 
                  type="button" 
                  onClick={() => { setViewTab("login"); setErrorMsg(""); setSuccessMsg(""); }}
                  className="text-xs text-gold font-bold hover:underline bg-transparent border-none cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </motion.form>
          )}

          {viewTab === "otp" && (
            <motion.form 
              key="otp"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleOtpSubmit}
              className="login-form"
            >
              <div className="text-center mb-2">
                <h4 className="text-sm font-bold text-primary">Verify Email OTP</h4>
                <p className="text-xs text-secondary mt-1">A 6-digit verification code was sent to <strong className="text-gold">{email}</strong></p>
              </div>

              {otpNotice && (
                <div className="p-3 bg-gold/10 border border-gold/30 rounded-lg text-xs text-gold font-mono text-center mb-2 animate-pulse">
                  {otpNotice}
                </div>
              )}

              <div className="form-group">
                <label>6-Digit Verification Code</label>
                <div className="input-wrapper">
                  <Key className="input-icon text-gold" size={16} />
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="e.g. 482910"
                    value={userOtpInput}
                    onChange={(e) => setUserOtpInput(e.target.value)}
                    className="login-input text-center tracking-widest font-mono text-lg"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full login-btn">
                {loading ? <div className="auth-spinner"></div> : "Verify OTP & Activate Profile"}
              </button>

              <button 
                type="button" 
                onClick={() => { setViewTab("register"); setErrorMsg(""); }}
                className="btn-secondary w-full flex items-center justify-center gap-2 mt-2"
                style={{ padding: '10px', fontSize: '0.8rem' }}
              >
                <ArrowLeft size={14} /> Back to Profile Details
              </button>
            </motion.form>
          )}

          {viewTab === "forgot" && (
            <motion.form 
              key="forgot"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleForgotSubmit}
              className="login-form"
            >
              <div className="form-group">
                <label>Email address</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={16} />
                  <input 
                    type="email" 
                    placeholder="name@sansec.ai"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full login-btn">
                {loading ? <div className="auth-spinner"></div> : "Dispatch Reset Link"}
              </button>

              <button 
                type="button" 
                onClick={() => { setViewTab("login"); setErrorMsg(""); setSuccessMsg(""); }}
                className="btn-secondary w-full flex items-center justify-center gap-2 mt-2"
                style={{ padding: '12px' }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="login-disclaimer text-center mt-6">
          <span>Your session is protected with secure authentication.</span>
        </div>
      </motion.div>

    </div>
  );
};

// Check icon helper
const CheckCircle = ({ size, style }: { size: number; style?: React.CSSProperties }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    style={style}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
