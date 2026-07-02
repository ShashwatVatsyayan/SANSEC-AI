import React from "react";
import { useAuth } from "../context/AuthContext.tsx";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, fallback }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-height-screen bg-primary">
        <div className="cyber-spinner mb-4"></div>
        <p className="mono text-gold text-xs">Authenticating security session...</p>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <>{fallback}</>;
};
