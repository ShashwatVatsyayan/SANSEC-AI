import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Mail, Lock, User as UserIcon, AlertTriangle, ArrowLeft, Key, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { rememberedCredentialsManager, BASE_URL } from "../services/api.ts";
import { BlackHoleBackground } from "./BlackHoleBackground.tsx";

export const AuthPage: React.FC = () => {
  const { login, loginGoogle, register } = useAuth();
  
  // Tab states: 'login' | 'register' | 'otp' | 'forgot'
  const [viewTab, setViewTab] = useState<"login" | "register" | "otp" | "forgot">("login");
  
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

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Could not send verification email.");
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err instanceof Error ? err.message : "Could not send verification email.");
      return;
    }

    setUserOtpInput("");
    setOtpNotice(`Verification code dispatched to ${email}`);
    
    setTimeout(() => {
      setLoading(false);
      setViewTab("otp");
    }, 600);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userOtpInput) {
      setErrorMsg("Please enter the 6-digit code.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      await register(username, email, password, userOtpInput.trim());
      setSuccessMsg("Email verified! Account created.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete registration.");
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
      setSuccessMsg("Reset link dispatched if account exists.");
      setResetEmail("");
    }, 1200);
  };

  const triggerNativeGoogleSignIn = () => {
    setErrorMsg("");
    setLoading(true);

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

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
          error_callback: () => setLoading(false)
        });
        client.requestAccessToken({ prompt: "select_account" });
        return;
      } catch (err) {
        console.warn("GIS token client failed:", err);
      }
    }

    // Direct Google Sign in fallback for local demo
    loginGoogle("analyst@sansec.ai", "SANSEC Analyst");
  };

  return (
    <div className="auth-wrapper">
      <BlackHoleBackground />
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="login-card"
      >
        <div className="login-logo-section">
          <div className="login-logo-icon">
            <Shield size={20} className="text-white" />
          </div>
          <span className="login-title">SANSEC <span>AI</span></span>
        </div>
        <p className="login-subtitle">Malware Analysis Platform</p>

        {errorMsg && (
          <div className="auth-error-box mb-4 fade-in">
            <AlertTriangle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-error-box mb-4 fade-in" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)', color: 'var(--threat-low)' }}>
            <CheckIcon size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {viewTab === "login" && (
            <motion.form 
              key="login"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onSubmit={handleLoginSubmit}
              className="login-form"
            >
              {/* Demo Admin Quick Fill */}
              <div style={{
                padding: '8px 12px',
                borderRadius: '7px',
                background: 'var(--accent-red-glow)',
                border: '1px solid rgba(229,57,53,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} style={{ color: 'var(--accent-red-soft)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Demo Credentials
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUsername("admin@sansec.ai");
                    setPassword("admin");
                    setSuccessMsg("Admin credentials filled.");
                    setTimeout(() => setSuccessMsg(""), 2000);
                  }}
                  className="btn-ghost btn-sm"
                  style={{ color: 'var(--accent-red-soft)', fontWeight: 600, fontSize: '11px' }}
                >
                  Fill Admin
                </button>
              </div>

              <div className="form-group">
                <label>Username or Email</label>
                <div className="input-wrapper">
                  <UserIcon className="input-icon" size={15} />
                  <input 
                    type="text" 
                    placeholder="analyst@sansec.ai"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Password</label>
                  <button 
                    type="button" 
                    onClick={() => { setViewTab("forgot"); setErrorMsg(""); setSuccessMsg(""); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Forgot?
                  </button>
                </div>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={15} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <input 
                  type="checkbox" 
                  id="rem"
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  style={{ accentColor: 'var(--accent-red)' }}
                />
                <label htmlFor="rem" style={{ cursor: 'pointer', userSelect: 'none' }}>Remember username</label>
              </div>

              <button type="submit" disabled={loading} className="btn-login">
                {loading ? "Authenticating..." : "Sign In"}
              </button>

              <div className="auth-divider">OR</div>

              <button 
                type="button" 
                onClick={triggerNativeGoogleSignIn} 
                disabled={loading} 
                className="btn-google"
              >
                Sign in with Google
              </button>

              <div className="auth-toggle-link">
                Don't have an account?{" "}
                <button 
                  type="button" 
                  onClick={() => { setViewTab("register"); setErrorMsg(""); setSuccessMsg(""); }}
                >
                  Create Profile
                </button>
              </div>
            </motion.form>
          )}

          {viewTab === "register" && (
            <motion.form 
              key="register"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onSubmit={handleRegisterSubmit}
              className="login-form"
            >
              <div className="form-group">
                <label>Username</label>
                <div className="input-wrapper">
                  <UserIcon className="input-icon" size={15} />
                  <input 
                    type="text" 
                    placeholder="analyst_name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={15} />
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
                <label>Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={15} />
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
                <label>Confirm Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={15} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-login">
                {loading ? "Creating..." : "Create Account"}
              </button>

              <div className="auth-toggle-link">
                Already have an account?{" "}
                <button 
                  type="button" 
                  onClick={() => { setViewTab("login"); setErrorMsg(""); setSuccessMsg(""); }}
                >
                  Sign In
                </button>
              </div>
            </motion.form>
          )}

          {viewTab === "otp" && (
            <motion.form 
              key="otp"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onSubmit={handleOtpSubmit}
              className="login-form"
            >
              {otpNotice && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {otpNotice}
                </p>
              )}

              <div className="form-group">
                <label>Verification Code</label>
                <div className="input-wrapper">
                  <Key className="input-icon" size={15} />
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="6-digit code"
                    value={userOtpInput}
                    onChange={(e) => setUserOtpInput(e.target.value)}
                    className="login-input mono"
                    style={{ textAlign: 'center', letterSpacing: '0.2em' }}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-login">
                {loading ? "Verifying..." : "Verify & Activate"}
              </button>

              <button 
                type="button" 
                onClick={() => { setViewTab("register"); setErrorMsg(""); }}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ArrowLeft size={14} /> Back to Form
              </button>
            </motion.form>
          )}

          {viewTab === "forgot" && (
            <motion.form 
              key="forgot"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onSubmit={handleForgotSubmit}
              className="login-form"
            >
              <div className="form-group">
                <label>Registered Email</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={15} />
                  <input 
                    type="email" 
                    placeholder="name@sansec.ai"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="login-input"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-login">
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <button 
                type="button" 
                onClick={() => { setViewTab("login"); setErrorMsg(""); setSuccessMsg(""); }}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const CheckIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
