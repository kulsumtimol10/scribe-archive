/**
 * Basgiath's ambience, synthesised live with the Web Audio API: no recordings
 * to license or download. Continuous layers (rain, wind, hearth) loop shaped
 * noise; event layers (thunder, wingbeats, quills, crackles, droplets) fire
 * short filtered bursts on random timers.
 */

export type TrackId = 'rain' | 'wind' | 'hearth' | 'thunder' | 'wings' | 'quills';
export type Volumes = Record<TrackId, number>;

export const TRACKS: { id: TrackId; name: string }[] = [
  { id: 'rain', name: 'Rain on the Parapet' },
  { id: 'wind', name: 'Wind through the Vale' },
  { id: 'hearth', name: 'Hearth in the dorms' },
  { id: 'thunder', name: 'Thunder over the cliffs' },
  { id: 'wings', name: 'Wingbeats overhead' },
  { id: 'quills', name: 'Scribe quills' },
];

export type PresetName = 'Storm night' | 'The Vale' | 'Scribe library';

export const PRESETS: Record<PresetName, Volumes> = {
  'Storm night': { rain: 0.8, wind: 0.45, hearth: 0.25, thunder: 0.55, wings: 0, quills: 0 },
  'The Vale': { rain: 0.1, wind: 0.7, hearth: 0, thunder: 0.1, wings: 0.6, quills: 0 },
  'Scribe library': { rain: 0.35, wind: 0.1, hearth: 0.6, thunder: 0, wings: 0, quills: 0.5 },
};

/** Which preset a mix matches exactly, if any. */
export function presetOf(volumes: Volumes): PresetName | null {
  const names = Object.keys(PRESETS) as PresetName[];
  return names.find((name) => TRACKS.every(({ id }) => Math.abs(PRESETS[name][id] - volumes[id]) < 0.005)) ?? null;
}

/** "25:00" style countdown text; hours appear only when needed. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Per-layer loudness so a slider at the same spot sounds roughly as loud on every track. */
const LEVEL: Volumes = { rain: 0.32, wind: 0.75, hearth: 0.9, thunder: 1, wings: 1, quills: 0.6 };

const random = (min: number, max: number) => min + Math.random() * (max - min);

function noiseBuffer(ctx: AudioContext, kind: 'white' | 'brown', seconds = 8): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === 'white') {
      data[i] = white;
    } else {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buffer;
}

interface Burst {
  buffer: AudioBuffer;
  /** Seconds from now. */
  at?: number;
  duration: number;
  attack: number;
  peak: number;
  filter: BiquadFilterType;
  frequency: number;
  q?: number;
}

export class Soundscape {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly layers = new Map<TrackId, GainNode>();
  private readonly timers = new Map<string, number>();
  private readonly white: AudioBuffer;
  private readonly brown: AudioBuffer;
  private volumes: Volumes;
  private closed = false;

  /** Null where the browser has no Web Audio. Call from a click so playback is allowed. */
  static create(volumes: Volumes): Soundscape | null {
    const AudioCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    const ctx = new AudioCtor();
    // Safari can start a context suspended even inside a click.
    void ctx.resume();
    return new Soundscape(ctx, volumes);
  }

  private constructor(ctx: AudioContext, volumes: Volumes) {
    this.ctx = ctx;
    this.volumes = { ...volumes };
    this.white = noiseBuffer(ctx, 'white');
    this.brown = noiseBuffer(ctx, 'brown');

    // A gentle limiter keeps thunder from clipping when everything is turned up.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 6;
    this.master = ctx.createGain();
    this.master.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.master.gain.exponentialRampToValueAtTime(0.85, ctx.currentTime + 2);
    this.master.connect(limiter).connect(ctx.destination);

    for (const { id } of TRACKS) {
      const gain = ctx.createGain();
      gain.gain.value = this.volumes[id] * LEVEL[id];
      gain.connect(this.master);
      this.layers.set(id, gain);
    }

    this.startRain();
    this.startWind();
    this.startHearth();
    this.every('thunder', 14000, 40000, () => this.thunder());
    this.every('wings', 2200, 4600, () => this.wingbeat());
    this.every('quills', 90, 520, () => this.quill());
  }

  setVolume(id: TrackId, value: number): void {
    this.volumes[id] = value;
    this.layers.get(id)?.gain.setTargetAtTime(value * LEVEL[id], this.ctx.currentTime, 0.12);
  }

  setVolumes(volumes: Volumes): void {
    for (const { id } of TRACKS) this.setVolume(id, volumes[id]);
  }

  /** A thunderclap now, to go with lightning on screen. */
  strike(): void {
    if (!this.closed) this.thunder();
  }

  /** Fades everything out, then releases the audio device. */
  async fadeOut(seconds: number): Promise<void> {
    if (this.closed) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(this.master.gain.value, 0.0001), now);
    this.master.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    await new Promise((resolve) => window.setTimeout(resolve, seconds * 1000));
    this.dispose();
  }

  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers.clear();
    void this.ctx.close();
  }

  /** Runs `fire` at random intervals while the layer is audible. */
  private every(key: string, minMs: number, maxMs: number, fire: () => void, layer: TrackId = key as TrackId) {
    const tick = () => {
      if (this.closed) return;
      if (this.volumes[layer] > 0.01) fire();
      this.timers.set(key, window.setTimeout(tick, random(minMs, maxMs)));
    };
    this.timers.set(key, window.setTimeout(tick, random(minMs, maxMs) / 2));
  }

  private loop(buffer: AudioBuffer): AudioBufferSourceNode {
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.start(0, Math.random() * buffer.duration);
    return source;
  }

  private filter(type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode {
    const node = this.ctx.createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    node.Q.value = q;
    return node;
  }

  private burst({ buffer, at = 0, duration, attack, peak, filter, frequency, q }: Burst, layer: TrackId) {
    const start = this.ctx.currentTime + at;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(this.filter(filter, frequency, q)).connect(envelope).connect(this.layers.get(layer)!);
    source.start(start, random(0, Math.max(0, buffer.duration - duration - 0.05)));
    source.stop(start + duration + 0.05);
  }

  private startRain() {
    const rain = this.layers.get('rain')!;
    this.loop(this.white).connect(this.filter('highpass', 800)).connect(this.filter('lowpass', 9000)).connect(rain);
    // Individual drops hitting stone and glass.
    this.every(
      'droplets',
      25,
      140,
      () =>
        this.burst(
          {
            buffer: this.white,
            duration: 0.03,
            attack: 0.002,
            peak: random(0.15, 0.5),
            filter: 'bandpass',
            frequency: random(2500, 6000),
            q: 8,
          },
          'rain',
        ),
      'rain',
    );
  }

  private startWind() {
    const wind = this.layers.get('wind')!;
    const tone = this.filter('lowpass', 480, 1.2);
    const swell = this.ctx.createGain();
    swell.gain.value = 0.7;
    this.loop(this.brown).connect(tone).connect(swell).connect(wind);

    // Slow gusts: the filter opens and the level swells on two out-of-step cycles.
    const gust = this.ctx.createOscillator();
    gust.frequency.value = 0.07;
    const gustDepth = this.ctx.createGain();
    gustDepth.gain.value = 260;
    gust.connect(gustDepth).connect(tone.frequency);
    const surge = this.ctx.createOscillator();
    surge.frequency.value = 0.045;
    const surgeDepth = this.ctx.createGain();
    surgeDepth.gain.value = 0.28;
    surge.connect(surgeDepth).connect(swell.gain);
    gust.start();
    surge.start();
  }

  private startHearth() {
    const hearth = this.layers.get('hearth')!;
    this.loop(this.brown).connect(this.filter('lowpass', 220)).connect(hearth);
    this.every(
      'crackles',
      60,
      420,
      () =>
        this.burst(
          {
            buffer: this.white,
            duration: random(0.015, 0.05),
            attack: 0.002,
            peak: random(0.2, 0.9),
            filter: 'highpass',
            frequency: random(1500, 3500),
          },
          'hearth',
        ),
      'hearth',
    );
  }

  private thunder() {
    const duration = random(4, 6.5);
    this.burst({ buffer: this.brown, duration, attack: random(0.2, 0.6), peak: 1.3, filter: 'lowpass', frequency: 170 }, 'thunder');
    if (Math.random() < 0.4) {
      this.burst({ buffer: this.white, duration: 0.7, attack: 0.01, peak: 0.35, filter: 'lowpass', frequency: 1100 }, 'thunder');
    }
  }

  private wingbeat() {
    for (const at of [0, 0.42]) {
      this.burst(
        { buffer: this.brown, at, duration: 0.55, attack: 0.09, peak: 1.5, filter: 'lowpass', frequency: random(240, 320) },
        'wings',
      );
    }
  }

  private quill() {
    // Writers pause between lines.
    if (Math.random() < 0.15) return;
    this.burst(
      {
        buffer: this.white,
        duration: random(0.05, 0.14),
        attack: 0.01,
        peak: random(0.15, 0.35),
        filter: 'bandpass',
        frequency: random(2800, 4200),
        q: 2,
      },
      'quills',
    );
  }
}
