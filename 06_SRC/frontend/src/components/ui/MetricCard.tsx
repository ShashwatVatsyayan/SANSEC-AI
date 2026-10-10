import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  color?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, color, className = '' }) => {
  return (
    <div className={`panel stat-card ${className}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
};
