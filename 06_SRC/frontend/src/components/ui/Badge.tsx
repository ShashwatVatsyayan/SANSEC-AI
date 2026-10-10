import React from 'react';

interface BadgeProps {
  level: 'critical' | 'high' | 'medium' | 'low' | 'safe' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ level, children, className = '' }) => {
  return (
    <span className={`badge badge-${level} ${className}`}>
      {children}
    </span>
  );
};

interface ThreatBadgeProps {
  level: string;
  score?: number;
}

export const ThreatBadge: React.FC<ThreatBadgeProps> = ({ level, score }) => {
  const normalized = level.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
  return (
    <span className={`badge badge-${normalized}`}>
      {score !== undefined ? `${score}/100` : level}
    </span>
  );
};
