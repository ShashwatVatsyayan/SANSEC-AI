import { InkTransition, type Point } from './inkTransition';
import { getTheme, applyTheme, otherTheme, type Theme } from './theme';

class InkTransitionManager {
  private instance: InkTransition | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private initialized = false;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Load saved theme or default to dark
    const saved = (localStorage.getItem('sansec-theme') as Theme) || 'dark';
    applyTheme(saved);

    // Create canvas if not exists
    let c = document.querySelector<HTMLCanvasElement>('canvas.ink-canvas');
    if (!c) {
      c = document.createElement('canvas');
      c.className = 'ink-canvas';
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('data-html2canvas-ignore', '');
      document.body.appendChild(c);
    }
    this.canvas = c;
    this.instance = new InkTransition(c, null);

    // Global keyboard shortcut 'T' to toggle theme
    const TEXT_ENTRY = 'input, textarea, select, [contenteditable="true"]';
    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target;
      if (target instanceof Element && target.closest(TEXT_ENTRY)) return;

      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  registerButton(button: HTMLElement) {
    if (!this.initialized) this.init();
    if (this.instance) {
      this.instance.setToggleButton(button);
    }
  }

  toggle(point?: Point) {
    if (!this.initialized) this.init();
    if (this.instance) {
      this.instance.toggle(point);
    } else {
      applyTheme(otherTheme(getTheme()));
    }
  }

  getTheme(): Theme {
    return getTheme();
  }
}

export const inkManager = new InkTransitionManager();
