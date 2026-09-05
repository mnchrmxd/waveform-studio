/**
 * High-Performance Discrete Fourier Transform & Audio Spectrum Analyzer
 * Precomputed twiddle tables, static frequency band mappings, and zero-allocation frame analysis
 */

export interface SpectrumData {
  frequencies: Float32Array; // Normalized 0..1 per bin
  waveform: Float32Array; // Time domain samples -1..1
  bassEnergy: number; // 0..1
  midEnergy: number; // 0..1
  highEnergy: number; // 0..1
  overallRms: number; // 0..1
}

// Precomputed Twiddle Tables & Bit Reversal for 1024-point FFT
interface FFTCache {
  size: number;
  bitRev: Uint16Array;
  cosTable: Float32Array;
  sinTable: Float32Array;
}

const fftCaches = new Map<number, FFTCache>();

function getFFTCache(n: number): FFTCache {
  let cache = fftCaches.get(n);
  if (cache) return cache;

  const bitRev = new Uint16Array(n);
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    bitRev[i] = j;
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }
  bitRev[n - 1] = j;

  const cosTable = new Float32Array(n / 2);
  const sinTable = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    const angle = (-2 * Math.PI * i) / n;
    cosTable[i] = Math.cos(angle);
    sinTable[i] = Math.sin(angle);
  }

  cache = { size: n, bitRev, cosTable, sinTable };
  fftCaches.set(n, cache);
  return cache;
}

// Fast in-place Cooley-Tukey Radix-2 FFT using precomputed lookup tables
export function computeFFTFast(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  if (n <= 1) return;

  const cache = getFFTCache(n);
  const bitRev = cache.bitRev;
  const cosTable = cache.cosTable;
  const sinTable = cache.sinTable;

  // Bit reversal permutation
  for (let i = 0; i < n; i++) {
    const target = bitRev[i];
    if (i < target) {
      const tempR = real[i];
      real[i] = real[target];
      real[target] = tempR;

      const tempI = imag[i];
      imag[i] = imag[target];
      imag[target] = tempI;
    }
  }

  // Butterfly computations
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const step = n / len;

    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < halfLen; k++) {
        const tableIdx = k * step;
        const wR = cosTable[tableIdx];
        const wI = sinTable[tableIdx];

        const r2 = real[i + k + halfLen];
        const i2 = imag[i + k + halfLen];

        const tR = wR * r2 - wI * i2;
        const tI = wR * i2 + wI * r2;

        const uR = real[i + k];
        const uI = imag[i + k];

        real[i + k] = uR + tR;
        imag[i + k] = uI + tI;
        real[i + k + halfLen] = uR - tR;
        imag[i + k + halfLen] = uI - tI;
      }
    }
  }
}

// Precomputed Hann window weights
const hannWindows: Map<number, Float32Array> = new Map();
function getHannWindow(size: number): Float32Array {
  let win = hannWindows.get(size);
  if (!win) {
    win = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    hannWindows.set(size, win);
  }
  return win;
}

interface BandMapping {
  kStart: number;
  kEnd: number;
  kCenter: number;
  weight: number;
}

export class OfflineAudioAnalyzer {
  private channelData: Float32Array;
  private sampleRate: number;
  private fftSize: number;
  private halfSize: number;
  private hann: Float32Array;

  // Reusable working memory buffers (Zero garbage collection in render loops)
  private realBuf: Float32Array;
  private imagBuf: Float32Array;
  private rawMagnitudes: Float32Array;
  private rawFrequencies: Float32Array;
  private outFrequencies: Float32Array;
  private scratchFrequencies: Float32Array;
  private smoothedFrequencies: Float32Array;
  private outWaveform: Float32Array;
  private bandMappings: BandMapping[] = [];
  private lastTargetBands: number = 0;
  private lastAnalysisTime: number = -1;
  private smoothedBassEnergy: number = 0;

  constructor(buffer: AudioBuffer, fftSize: number = 2048) {
    this.sampleRate = buffer.sampleRate;
    this.fftSize = fftSize;
    this.halfSize = fftSize / 2;
    this.hann = getHannWindow(fftSize);

    this.realBuf = new Float32Array(fftSize);
    this.imagBuf = new Float32Array(fftSize);
    this.rawMagnitudes = new Float32Array(this.halfSize);
    this.rawFrequencies = new Float32Array(128);
    this.outFrequencies = new Float32Array(128);
    this.scratchFrequencies = new Float32Array(128);
    this.smoothedFrequencies = new Float32Array(128);
    this.outWaveform = new Float32Array(128);

    // Merge multi-channel audio to mono once
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length;
    this.channelData = new Float32Array(length);

    if (numChannels === 1) {
      this.channelData.set(buffer.getChannelData(0));
    } else {
      const ch0 = buffer.getChannelData(0);
      const ch1 = buffer.getChannelData(1);
      for (let i = 0; i < length; i++) {
        this.channelData[i] = (ch0[i] + ch1[i]) * 0.5;
      }
    }
  }

  private prepareBandMappings(targetBands: number): void {
    if (this.lastTargetBands === targetBands && this.bandMappings.length === targetBands) {
      return;
    }
    this.lastTargetBands = targetBands;
    this.rawFrequencies = new Float32Array(targetBands);
    this.outFrequencies = new Float32Array(targetBands);
    this.scratchFrequencies = new Float32Array(targetBands);
    this.smoothedFrequencies = new Float32Array(targetBands);
    this.outWaveform = new Float32Array(targetBands);
    this.bandMappings = new Array(targetBands);
    this.lastAnalysisTime = -1;
    this.smoothedBassEnergy = 0;

    // Musical frequency distribution from 28 Hz to 16,000 Hz
    const minFreq = 28;
    const maxFreq = Math.min(16000, this.sampleRate * 0.48);
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const binConst = this.fftSize / this.sampleRate;

    for (let b = 0; b < targetBands; b++) {
      const frac0 = Math.max(0, (b - 0.5) / (targetBands - 1));
      const frac1 = Math.min(1, (b + 0.5) / (targetBands - 1));
      const fracC = b / (targetBands - 1);

      const f0 = Math.pow(10, logMin + frac0 * (logMax - logMin));
      const f1 = Math.pow(10, logMin + frac1 * (logMax - logMin));
      const fC = Math.pow(10, logMin + fracC * (logMax - logMin));

      const kStart = Math.max(1, f0 * binConst);
      const kEnd = Math.min(this.halfSize - 1, Math.max(kStart + 0.1, f1 * binConst));
      const kCenter = Math.min(this.halfSize - 1, Math.max(1, fC * binConst));

      // Musical equal-loudness weighting (slight boost to high mids and treble, natural bass presence)
      const freqWeight = 1.0 + Math.sqrt(b / targetBands) * 0.45;

      this.bandMappings[b] = {
        kStart,
        kEnd,
        kCenter,
        weight: freqWeight,
      };
    }
  }

  private computeRawBandsAtSample(startSample: number, targetBands: number, dest: Float32Array): number {
    const audioLen = this.channelData.length;
    const fftSize = this.fftSize;
    let sumSquares = 0;

    for (let i = 0; i < fftSize; i++) {
      const idx = startSample + i;
      const sample = idx >= 0 && idx < audioLen ? this.channelData[idx] : 0;
      this.realBuf[i] = sample * this.hann[i];
      this.imagBuf[i] = 0;
      sumSquares += sample * sample;
    }

    computeFFTFast(this.realBuf, this.imagBuf);

    // Decibel normalization matching Web Audio AnalyserNode:
    // minDecibels = -95 dB, maxDecibels = -25 dB, dynamic range = 70 dB
    const invFFTSize2 = (1.0 / fftSize) * 2;
    for (let i = 0; i < this.halfSize; i++) {
      const r = this.realBuf[i];
      const im = this.imagBuf[i];
      const mag = Math.sqrt(r * r + im * im) * invFFTSize2;
      const db = 20 * Math.log10(Math.max(1e-5, mag));
      this.rawMagnitudes[i] = Math.max(0, Math.min(1.0, (db + 95) / 70));
    }

    // Continuous band integration & sub-bin interpolation (prevents low-frequency bin clumping and beating)
    for (let b = 0; b < targetBands; b++) {
      const mapping = this.bandMappings[b];
      const k0 = mapping.kStart;
      const k1 = mapping.kEnd;
      const span = k1 - k0;

      let val = 0;
      if (span >= 1.0) {
        // Average energy over the bin range with fractional edge weights
        const i0 = Math.floor(k0);
        const i1 = Math.ceil(k1);
        let weightedSum = 0;
        let totalWeight = 0;

        for (let i = i0; i <= i1 && i < this.halfSize; i++) {
          const left = Math.max(k0, i);
          const right = Math.min(k1, i + 1);
          const w = Math.max(0, right - left);
          weightedSum += this.rawMagnitudes[i] * w;
          totalWeight += w;
        }

        val = totalWeight > 0
          ? weightedSum / totalWeight
          : this.rawMagnitudes[Math.min(this.halfSize - 1, Math.round(mapping.kCenter))];
      } else {
        // Sub-bin range: Smooth continuous interpolation between adjacent bins
        const kC = mapping.kCenter;
        const iC = Math.floor(kC);
        const frac = kC - iC;
        const m0 = this.rawMagnitudes[Math.min(this.halfSize - 1, iC)];
        const m1 = this.rawMagnitudes[Math.min(this.halfSize - 1, iC + 1)];
        // Smoothstep curve for seamless transitions
        const smoothFrac = frac * frac * (3 - 2 * frac);
        val = m0 + (m1 - m0) * smoothFrac;
      }

      dest[b] = val * 1.35 * mapping.weight;
    }

    return sumSquares;
  }

  public getSpectrumAtTime(
    timeSeconds: number,
    targetBands: number = 128,
    smoothing: number = 0.65,
    softKnee: boolean = true,
    sensitivity: number = 1.0
  ): SpectrumData {
    this.prepareBandMappings(targetBands);

    const centerSample = Math.floor(timeSeconds * this.sampleRate);
    const startSample = centerSample - this.halfSize;
    const audioLen = this.channelData.length;
    const fftSize = this.fftSize;

    // Time domain waveform downsampled
    const waveStep = fftSize / targetBands;
    for (let i = 0; i < targetBands; i++) {
      const sampleIdx = startSample + Math.floor(i * waveStep);
      this.outWaveform[i] = sampleIdx >= 0 && sampleIdx < audioLen ? this.channelData[sampleIdx] : 0;
    }

    // Compute instantaneous raw FFT
    const sumSquares = this.computeRawBandsAtSample(startSample, targetBands, this.rawFrequencies);

    // Continuous Temporal Ballistic Smoothing (Attack / Release)
    const smoothParam = Math.max(0.1, Math.min(0.95, smoothing ?? 0.65));
    const isDiscontinuous =
      this.lastAnalysisTime < 0 ||
      Math.abs(timeSeconds - this.lastAnalysisTime) > 0.3 ||
      timeSeconds < this.lastAnalysisTime;

    if (isDiscontinuous) {
      // Direct state initialization on initial load or user seek
      for (let b = 0; b < targetBands; b++) {
        this.smoothedFrequencies[b] = this.rawFrequencies[b];
      }
      this.lastAnalysisTime = timeSeconds;
    } else {
      const dt = Math.max(0.001, Math.min(0.1, timeSeconds - this.lastAnalysisTime));
      this.lastAnalysisTime = timeSeconds;

      // Fast attack for punchy transient impact, liquid buoyant release decay
      const tauAttack = 0.022; // ~22ms attack
      const tauDecay = 0.12 + smoothParam * 0.22; // 140ms - 340ms decay

      const attackWeight = 1 - Math.exp(-dt / tauAttack);
      const decayWeight = 1 - Math.exp(-dt / tauDecay);

      for (let b = 0; b < targetBands; b++) {
        const raw = this.rawFrequencies[b];
        const prev = this.smoothedFrequencies[b];
        if (raw > prev) {
          this.smoothedFrequencies[b] = prev + (raw - prev) * attackWeight;
        } else {
          this.smoothedFrequencies[b] = prev + (raw - prev) * decayWeight;
        }
      }
    }

    // Spatial Gaussian 5-tap kernel smoothing across Frequency Bins to eliminate single-bin spikes
    for (let b = 0; b < targetBands; b++) {
      const v0 = this.smoothedFrequencies[Math.max(0, b - 2)];
      const v1 = this.smoothedFrequencies[Math.max(0, b - 1)];
      const v2 = this.smoothedFrequencies[b];
      const v3 = this.smoothedFrequencies[Math.min(targetBands - 1, b + 1)];
      const v4 = this.smoothedFrequencies[Math.min(targetBands - 1, b + 2)];
      this.scratchFrequencies[b] = v0 * 0.06 + v1 * 0.24 + v2 * 0.40 + v3 * 0.24 + v4 * 0.06;
    }

    // Dynamic Sensitivity & Analog Soft-Knee Saturation
    const sens = Math.max(0.05, sensitivity || 1.0);
    for (let b = 0; b < targetBands; b++) {
      let val = this.scratchFrequencies[b] * sens;

      // Soft-saturation curve: compresses peaks smoothly with hyperbolic tangent, avoiding hard flat clips
      if (softKnee) {
        val = Math.tanh(val * 0.92) * 1.12;
      }

      this.outFrequencies[b] = Math.max(0.01, Math.min(1.0, val));
    }

    // Audio-reactive band energies with ballistic dampening (eliminates jitter and beating)
    const bassBands = Math.floor(targetBands * 0.15);
    const midBands = Math.floor(targetBands * 0.6);

    let bassSum = 0;
    for (let i = 0; i < bassBands; i++) bassSum += this.outFrequencies[i];
    const rawBassEnergy = bassBands > 0 ? Math.min(1, (bassSum / bassBands) * 1.4) : 0;

    if (isDiscontinuous) {
      this.smoothedBassEnergy = rawBassEnergy;
    } else {
      this.smoothedBassEnergy += (rawBassEnergy - this.smoothedBassEnergy) * 0.25;
    }

    let midSum = 0;
    for (let i = bassBands; i < midBands; i++) midSum += this.outFrequencies[i];
    const midEnergy = midBands - bassBands > 0 ? Math.min(1, midSum / (midBands - bassBands)) : 0;

    let highSum = 0;
    for (let i = midBands; i < targetBands; i++) highSum += this.outFrequencies[i];
    const highEnergy = targetBands - midBands > 0 ? Math.min(1, (highSum / (targetBands - midBands)) * 1.4) : 0;

    const overallRms = Math.min(1, Math.sqrt(sumSquares / fftSize) * 2.5);

    return {
      frequencies: this.outFrequencies,
      waveform: this.outWaveform,
      bassEnergy: this.smoothedBassEnergy,
      midEnergy,
      highEnergy,
      overallRms,
    };
  }
}
