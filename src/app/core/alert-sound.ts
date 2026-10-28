import { Injectable } from '@angular/core';

/** Short chime generated with Web Audio, so no audio file is shipped. */
@Injectable({ providedIn: 'root' })
export class AlertSound {
  private context: AudioContext | null = null;

  constructor() {
    // Browsers block audio until the user interacts with the page.
    const unlock = (): void => this.unlock();
    document.addEventListener('pointerdown', unlock, { capture: true });
    document.addEventListener('keydown', unlock, { capture: true });
  }

  play(): void {
    const context = this.context;
    if (!context) {
      return;
    }
    if (context.state === 'suspended') {
      void context.resume();
    }
    const start = context.currentTime;
    [0, 0.7, 1.4].forEach(offset => this.bell(context, start + offset));
  }

  private unlock(): void {
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  /** One bell strike: a fundamental plus inharmonic partials, each decaying at its own rate. */
  private bell(context: AudioContext, startAt: number): void {
    const fundamental = 880;
    const partials = [
      { ratio: 1, level: 0.3, decay: 1.2 },
      { ratio: 2.76, level: 0.12, decay: 0.6 },
      { ratio: 5.4, level: 0.05, decay: 0.3 },
      { ratio: 8.93, level: 0.02, decay: 0.15 },
    ];
    for (const partial of partials) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = fundamental * partial.ratio;
      gain.gain.setValueAtTime(partial.level, startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + partial.decay);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + partial.decay);
    }
  }
}
