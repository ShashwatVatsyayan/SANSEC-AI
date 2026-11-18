import type { Theme } from './params';

export { type Theme };

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return (document.documentElement.dataset.theme as Theme) || 'dark';
}

export function otherTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme, toggle?: HTMLElement | null): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('sansec-theme', theme);
  } catch {}
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  }
  // Dispatch custom event for React components to re-render
  window.dispatchEvent(new CustomEvent('sansec-theme-change', { detail: { theme } }));
}
