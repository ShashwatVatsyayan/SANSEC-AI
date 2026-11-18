import React from "react";
import { ArrowLeft, Cpu } from "lucide-react";

interface NotFoundPageProps {
  onNavigateHome: () => void;
  onNavigateScanner: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onNavigateHome,
  onNavigateScanner
}) => {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/unknown";

  return (
    <main className="not-found-container" style={{
      minHeight: "100svh",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-primary)",
      padding: "24px",
      position: "relative"
    }}>
      <div className="not-found-card" style={{
        maxWidth: "520px",
        width: "100%",
        background: "var(--panel-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "14px",
        padding: "40px 32px",
        boxShadow: "var(--shadow-lg)",
        textAlign: "left"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <img src="/sansec-logo.png" alt="SANSEC AI Logo" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "0.03em", color: "var(--text-primary)" }}>
            SANSEC <span style={{ color: "var(--accent-red-soft)" }}>AI</span>
          </span>
        </div>
        <h1 style={{
          fontSize: "2.25rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          marginBottom: "12px"
        }}>
          404 — Sector Unresolved
        </h1>

        <p style={{
          fontSize: "14px",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          marginBottom: "24px"
        }}>
          The telemetry endpoint or route sector you requested does not exist within the SANSEC AI active analysis matrix.
        </p>

        {/* Flat Diagnostic Telemetry List (No nested cards) */}
        <dl style={{
          borderTop: "1px solid var(--border-color)",
          borderBottom: "1px solid var(--border-color)",
          padding: "16px 0",
          margin: "0 0 28px 0",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          display: "grid",
          gridTemplateColumns: "140px 1fr",
          rowGap: "8px"
        }}>
          <dt style={{ color: "var(--text-muted)" }}>Target URI:</dt>
          <dd style={{ color: "var(--accent-teal)", wordBreak: "break-all", margin: 0 }}>{currentPath}</dd>

          <dt style={{ color: "var(--text-muted)" }}>Perimeter Lock:</dt>
          <dd style={{ color: "var(--threat-safe)", margin: 0 }}>ACTIVE // ISOLATED</dd>

          <dt style={{ color: "var(--text-muted)" }}>Dissection Engine:</dt>
          <dd style={{ color: "var(--text-secondary)", margin: 0 }}>READY</dd>
        </dl>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onNavigateHome}
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              minHeight: "44px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <ArrowLeft size={16} />
            Return to SOC Console
          </button>

          <button
            type="button"
            onClick={onNavigateScanner}
            className="btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              minHeight: "44px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <Cpu size={16} />
            Launch Scanner
          </button>
        </div>
      </div>
    </main>
  );
};
