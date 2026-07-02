import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Mail, Lock, User as UserIcon, AlertTriangle, KeyRound, Globe, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  
  // Tab states: 'login' | 'register' | 'forgot'
  const [viewTab, setViewTab] = useState<"login" | "register" | "forgot">("login");
  
  // Form Fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg("Console username and password are required.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      await login(username, password);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid authentication credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      setErrorMsg("All parameters are required for profile activation.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg("Invalid email scope address.");
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
      await register(username, email, password);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to register profile. User might already exist.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setErrorMsg("Email address is required.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    // Simulate reset link dispatch
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg("If this identity exists, a reset token has been dispatched.");
      setResetEmail("");
    }, 1200);
  };

  // Google OAuth simulator
  const handleGoogleSignIn = () => {
    setLoading(true);
    setErrorMsg("");
    setTimeout(async () => {
      try {
        // Simulate oauth token return and local login
        await login("analyst", "sansec2026");
      } catch (err: any) {
        setErrorMsg("Google authentication handshake failed.");
        setLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="login-screen-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="login-card glow-card"
      >
        <div className="login-logo-header">
          <Shield className="login-shield-icon" size={48} />
          <h2>SANSEC <span className="gold-text">AI</span></h2>
          <p className="login-subtitle">SECURE GATEWAY MODULE</p>
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
              <div className="form-group">
                <label>Console Identity ID</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3.5 text-muted" size={14} />
                  <input 
                    type="text" 
                    placeholder="e.g. analyst"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="login-input pl-10 w-full"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <div className="flex justify-between items-center">
                  <label>Access token Key</label>
                  <button 
                    type="button" 
                    onClick={() => { setViewTab("forgot"); setErrorMsg(""); setSuccessMsg(""); }}
                    className="text-xs text-gold hover:underline font-semibold bg-transparent border-none cursor-pointer"
                  >
                    Forgot Token?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-muted" size={14} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input pl-10 w-full"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full login-btn">
                {loading ? <div className="auth-spinner"></div> : "Authenticate Session"}
              </button>

              <div className="oauth-separator">
                <span>OR SIGN IN WITH</span>
              </div>

              <button 
                type="button" 
                onClick={handleGoogleSignIn} 
                disabled={loading} 
                className="btn-secondary w-full flex items-center justify-center gap-2"
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
                <label>Username Identity</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3.5 text-muted" size={14} />
                  <input 
                    type="text" 
                    placeholder="e.g. analyst_name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="login-input pl-10 w-full"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Scope</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-muted" size={14} />
                  <input 
                    type="email" 
                    placeholder="name@sansec.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input pl-10 w-full"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password Token (min 8 chars)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-muted" size={14} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input pl-10 w-full"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Confirm Password Token</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-muted" size={14} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="login-input pl-10 w-full"
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
                <label>Registered Email Scope</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-muted" size={14} />
                  <input 
                    type="email" 
                    placeholder="name@sansec.ai"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="login-input pl-10 w-full"
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
          <span>CONSOLE COMMUNICATION IS ENCRYPTED VIA CLIENT JWT HANDSHAKE.</span>
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
