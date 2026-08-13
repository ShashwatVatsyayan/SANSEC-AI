import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, BASE_URL, tokenManager, UserResponse } from "../services/api.ts";

interface AuthContextType {
  user: UserResponse | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginGoogle: (email: string, name?: string) => Promise<void>;
  register: (username: string, email: string, password: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserAvatar: (avatarUrl: string | undefined) => void;
  refreshSession: () => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Auto-refresh token verification
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      setUser(null);
      return false;
    }
    
    try {
      // API call to POST /api/auth/refresh
      const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      
      if (response.ok) {
        const data = await response.json();
        tokenManager.setTokens(data.access_token, data.refresh_token);
        const profile = await api.auth.me();
        setUser(profile);
        return true;
      }
    } catch (err) {
      console.error("Session refresh cycle error:", err);
    }
    return false;
  }, []);

  // Sync profile details on load
  const syncProfile = useCallback(async () => {
    try {
      const accessToken = tokenManager.getAccessToken();
      if (accessToken) {
        try {
          const profile = await api.auth.me();
          setUser(profile);
        } catch (err) {
          console.warn("Access token invalid or expired. Executing refresh token handshake...");
          const refreshed = await refreshSession();
          if (!refreshed) {
            tokenManager.clearTokens();
            setUser(null);
          }
        }
      }
    } catch (err) {
      console.error("Profile sync exception:", err);
      tokenManager.clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshSession]);

  useEffect(() => {
    syncProfile();
  }, [syncProfile]);

  // Set up periodic session token checks (every 10 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (tokenManager.getAccessToken()) {
        refreshSession();
      }
    }, 600000); // 10 minutes
    return () => clearInterval(interval);
  }, [refreshSession]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      await api.auth.login(username, password);
      const profile = await api.auth.me();
      setUser(profile);
    } catch (err) {
      tokenManager.clearTokens();
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async (email: string, name?: string) => {
    setLoading(true);
    try {
      const profile = await api.auth.loginGoogle(email, name);
      setUser(profile);
    } catch (err) {
      tokenManager.clearTokens();
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string, otpCode: string) => {
    setLoading(true);
    try {
      // Registers account, then auto-logs in the user
      await api.auth.register(username, email, password, otpCode);
      await login(username, password);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.auth.logout();
    } catch (err) {
      console.warn("Logout endpoint returned exception, clearing client storage.");
    } finally {
      tokenManager.clearTokens();
      setUser(null);
      setLoading(false);
    }
  };

  const updateUserAvatar = (avatarUrl: string | undefined) => {
    const updated = tokenManager.updateUserProfile({ avatar_url: avatarUrl });
    if (updated) {
      setUser(updated);
    }
  };

  const value = {
    user,
    loading,
    login,
    loginGoogle,
    register,
    logout,
    updateUserAvatar,
    refreshSession,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be consumed inside an AuthProvider wrapper.");
  }
  return context;
};
