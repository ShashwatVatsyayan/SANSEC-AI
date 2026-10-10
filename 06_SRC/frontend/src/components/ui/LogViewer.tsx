import React, { useRef, useEffect } from 'react';

interface LogViewerProps {
  logs: string[];
  progress?: number;
}

function logColor(line: string): string {
  if (line.startsWith('[ERROR]') || line.startsWith('[FAIL') || line.includes('Error')) return 'var(--threat-critical)';
  if (line.startsWith('[!]') || line.startsWith('[WARN')) return 'var(--threat-medium)';
  if (line.startsWith('[SUCCESS]') || line.includes('completed')) return 'var(--threat-low)';
  if (line.startsWith('[+]') || line.startsWith('[*]')) return '#8af78e';
  return 'var(--text-secondary)';
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, progress }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="terminal-card" style={{ marginTop: 16 }}>
      <div className="terminal-header">
        <span className="terminal-dot red" />
        <span className="terminal-dot yellow" />
        <span className="terminal-dot green" />
        <span className="terminal-title">SANSEC DISSECTION ENGINE</span>
        {progress !== undefined && (
          <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {progress}%
          </span>
        )}
      </div>
      {progress !== undefined && (
        <div className="terminal-progress">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="terminal-body">
        {logs.map((line, i) => (
          <div key={i} className="terminal-line" style={{ color: logColor(line) }}>
            <span style={{ color: 'var(--text-muted)', marginRight: 8, fontSize: 10, userSelect: 'none' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            {line}
          </div>
        ))}
        <div className="terminal-cursor-line">_</div>
        <div ref={endRef} />
      </div>
    </div>
  );
};
