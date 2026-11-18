import type { Theme } from './params';

export interface Snapshot {
  theme: Theme;
  canvas: HTMLCanvasElement;
  scale: number;
  key: string;
  ms: number;
}

const BACKGROUND: Record<Theme, string> = {
  light: '#f6f4ef',
  dark: '#080a0f',
};

export function createFallbackSnapshot(theme: Theme): Snapshot {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : ({} as HTMLCanvasElement);
  if (canvas.getContext) {
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = BACKGROUND[theme];
      ctx.fillRect(0, 0, 512, 512);
    }
  }
  return {
    theme,
    canvas,
    scale: 1,
    key: 'fallback',
    ms: 0,
  };
}

const isCoarsePointer = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export function renderScale(): number {
  if (typeof window === 'undefined') return 1;
  const cap = isCoarsePointer() ? 1.5 : 2;
  return Math.min(window.devicePixelRatio || 1, cap);
}

export function documentSize(): { width: number; height: number } {
  if (typeof document === 'undefined') return { width: 1200, height: 800 };
  const el = document.documentElement;
  return { width: el.clientWidth, height: Math.max(el.scrollHeight, el.clientHeight) };
}

export function layoutKey(scale: number): string {
  const { width, height } = documentSize();
  return `${width}x${height}@${scale}`;
}

export async function capturePage(theme: Theme, scale: number, maxTextureSize: number): Promise<Snapshot> {
  const t0 = performance.now();
  const key = layoutKey(scale);
  const { width, height } = documentSize();

  const safeScale = Math.min(scale, maxTextureSize / width, maxTextureSize / height);

  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(document.body, {
    scale: Math.min(safeScale, 1.25),
    backgroundColor: BACKGROUND[theme],
    x: 0,
    y: 0,
    width,
    height,
    scrollX: 0,
    scrollY: 0,
    windowWidth: width,
    windowHeight: document.documentElement.clientHeight,
    logging: false,
    useCORS: true,
    ignoreElements: (element) =>
      element.hasAttribute('data-html2canvas-ignore') ||
      (element.tagName === 'CANVAS' && !element.classList.contains('allow-capture')),
    onclone: (doc) => {
      doc.documentElement.dataset.theme = theme;
      doc.querySelectorAll<HTMLElement>('[data-ink-live]').forEach((el) => {
        el.style.visibility = 'hidden';
      });
    },
  });

  return { theme, canvas, scale: safeScale, key, ms: performance.now() - t0 };
}
