import React from 'react';

interface ThreatScoreProps {
  score: number;
  level: string;
  size?: 'sm' | 'md' | 'lg';
}

function getColor(score: number) {
  if (score >= 75) return 'var(--threat-critical)';
  if (score >= 50) return 'var(--threat-high)';
  if (score >= 25) return 'var(--threat-medium)';
  return 'var(--threat-low)';
}

function getLabel(level: string) {
  const l = level.toLowerCase();
  if (l === 'critical') return 'CRITICAL';
  if (l === 'high') return 'HIGH';
  if (l === 'medium') return 'MEDIUM';
  return 'LOW';
}

export const ThreatScore: React.FC<ThreatScoreProps> = ({ score, level, size = 'md' }) => {
  const color = getColor(score);
  const dim = size === 'lg' ? 130 : size === 'sm' ? 80 : 110;
  const borderW = size === 'sm' ? 3 : 4;
  const numSize = size === 'lg' ? '2.4rem' : size === 'sm' ? '1.4rem' : '1.9rem';

  return (
    <div
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        border: `${borderW}px solid ${color}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 24px ${color}28`,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: numSize, fontWeight: 800, fontFamily: 'var(--font-mono)', color, lineHeight: 1 }}>
        {score}
      </span>
      <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>
        {getLabel(level)}
      </span>
    </div>
  );
};
