import React from "react";
import { Shield, ArrowRight } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle.tsx";

interface PublicNavBarProps {
  activePage: "platform" | "detonation" | "radar" | "research" | "auth";
  onNavigate: (page: string) => void;
  onNavigateAuth?: () => void;
}

export const PublicNavBar: React.FC<PublicNavBarProps> = ({
  activePage,
  onNavigate,
  onNavigateAuth,
}) => {
  return (
    <header className="ref-top-nav" role="banner">
      <div className="ref-nav-inner">
        {/* Brand */}
        <div 
          className="ref-brand cursor-pointer" 
          onClick={() => onNavigate("platform")}
          title="SANSEC AI Security Architecture"
        >
          <img 
            src="/sansec-logo.png" 
            alt="SANSEC AI Logo" 
            className="ref-brand-icon" 
          />
          <span className="ref-brand-text">
            SANSEC <span className="ref-brand-badge">AI</span>
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="ref-nav-links" aria-label="Public Portal Navigation">
          <button 
            type="button" 
            className={`ref-nav-link ${activePage === "platform" ? "active text-teal font-semibold" : ""}`}
            onClick={() => onNavigate("platform")}
          >
            Platform
          </button>
          <button 
            type="button" 
            className={`ref-nav-link ${activePage === "detonation" ? "active text-teal font-semibold" : ""}`}
            onClick={() => onNavigate("detonation")}
          >
            Detonation Engine
          </button>
          <button 
            type="button" 
            className={`ref-nav-link ${activePage === "radar" ? "active text-teal font-semibold" : ""}`}
            onClick={() => onNavigate("radar")}
          >
            Threat Radar
          </button>
          <button 
            type="button" 
            className={`ref-nav-link ${activePage === "research" ? "active text-teal font-semibold" : ""}`}
            onClick={() => onNavigate("research")}
          >
            Research
          </button>
        </nav>

        {/* Right Actions */}
        <div className="ref-nav-actions">
          <div className="ref-status-badge hidden sm:inline-flex" title="All microservices nominal">
            <span className="ref-status-indicator" />
            <span>SOC Nominal</span>
          </div>

          <ThemeToggle />

          <button 
            type="button" 
            onClick={onNavigateAuth || (() => onNavigate("auth"))}
            className="ref-fill-admin-btn"
            title="Access SANSEC AI Console"
          >
            <Shield size={14} className="text-teal" />
            <span>Sign In</span>
            <ArrowRight size={13} className="opacity-70" />
          </button>
        </div>
      </div>
    </header>
  );
};
