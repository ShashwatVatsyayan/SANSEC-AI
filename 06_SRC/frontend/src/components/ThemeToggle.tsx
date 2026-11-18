import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { inkManager } from '../ink-bleed/InkTransitionManager';
import { getTheme, type Theme } from '../ink-bleed/theme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const [theme, setTheme] = useState<Theme>('dark');
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    inkManager.init();
    if (buttonRef.current) {
      inkManager.registerButton(buttonRef.current);
    }
    setTheme(getTheme());

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: Theme }>;
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      } else {
        setTheme(getTheme());
      }
    };

    window.addEventListener('sansec-theme-change', handleThemeChange);
    return () => window.removeEventListener('sansec-theme-change', handleThemeChange);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // If keyboard-activated click (Enter/Space on button, detail === 0), let ink spread from button center
    const point = e.detail === 0 ? undefined : { x: e.clientX, y: e.clientY };
    inkManager.toggle(point);
  };

  const isDark = theme === 'dark';

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      className={`theme-toggle-btn ${className}`}
      data-ink-live=""
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode (Press T)`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      aria-pressed={isDark}
    >
      <div className="theme-toggle-icon-wrap">
        <Sun className="ink-icon-sun" size={17} />
        <Moon className="ink-icon-moon" size={17} />
      </div>
      {showLabel && (
        <span className="theme-toggle-label">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
      )}
    </button>
  );
};
