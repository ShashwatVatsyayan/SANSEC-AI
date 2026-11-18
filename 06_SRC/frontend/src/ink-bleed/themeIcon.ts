import gsap from 'gsap';
import type { Theme } from './params';

export interface MorphOptions {
  duration: number;
  ease: string;
  timeScale: number;
  chromeDelay?: number;
  chromeFrom?: ChromeColors;
}

export interface ChromeColors {
  backgroundColor: string;
  borderColor: string;
  color: string;
}

export class ThemeIcon {
  private readonly button: HTMLElement;
  private timeline: gsap.core.Timeline | null = null;

  constructor(button: HTMLElement) {
    this.button = button;
  }

  kill(): void {
    this.timeline?.kill();
    this.timeline = null;
  }

  setTimeScale(scale: number): void {
    this.timeline?.timeScale(scale);
  }

  readChrome(): ChromeColors {
    const cs = getComputedStyle(this.button);
    return {
      backgroundColor: cs.backgroundColor,
      borderColor: cs.borderTopColor,
      color: cs.color,
    };
  }

  set(theme: Theme): void {
    this.timeline?.kill();
    this.timeline = null;
    const isDark = theme === 'dark';
    const sun = this.button.querySelector('.ink-icon-sun');
    const moon = this.button.querySelector('.ink-icon-moon');
    if (sun) gsap.set(sun, { opacity: isDark ? 1 : 0, rotation: isDark ? 0 : 90, scale: isDark ? 1 : 0.4 });
    if (moon) gsap.set(moon, { opacity: isDark ? 0 : 1, rotation: isDark ? -90 : 0, scale: isDark ? 0.4 : 1 });
    gsap.set(this.button, { clearProps: 'backgroundColor,borderColor,color' });
  }

  morphTo(theme: Theme, opts: MorphOptions): void {
    this.timeline?.kill();
    const isDark = theme === 'dark';
    const sun = this.button.querySelector('.ink-icon-sun');
    const moon = this.button.querySelector('.ink-icon-moon');

    const tl = gsap.timeline({ defaults: { duration: opts.duration, ease: opts.ease } });

    if (sun) {
      tl.to(sun, {
        opacity: isDark ? 1 : 0,
        rotation: isDark ? 0 : 90,
        scale: isDark ? 1 : 0.4,
      }, 0);
    }

    if (moon) {
      tl.to(moon, {
        opacity: isDark ? 0 : 1,
        rotation: isDark ? -90 : 0,
        scale: isDark ? 0.4 : 1,
      }, 0);
    }

    if (opts.chromeFrom) {
      Object.assign(this.button.style, opts.chromeFrom);
      const delay = opts.chromeDelay ?? 0;
      const swap = Math.min(0.18, opts.duration * 0.15);
      tl.to(
        this.button,
        {
          backgroundColor: () => this.targetChrome().backgroundColor,
          borderColor: () => this.targetChrome().borderColor,
          color: () => this.targetChrome().color,
          duration: swap,
          ease: 'power1.out',
          onComplete: () => {
            gsap.set(this.button, { clearProps: 'backgroundColor,borderColor,color' });
          },
        },
        delay,
      );
    } else {
      gsap.set(this.button, { clearProps: 'backgroundColor,borderColor,color' });
    }

    tl.timeScale(opts.timeScale);
    this.timeline = tl;
  }

  private targetChrome(): ChromeColors {
    const saved = this.button.getAttribute('style') ?? '';
    this.button.style.removeProperty('background-color');
    this.button.style.removeProperty('border-color');
    this.button.style.removeProperty('color');
    const target = this.readChrome();
    this.button.setAttribute('style', saved);
    return target;
  }
}
