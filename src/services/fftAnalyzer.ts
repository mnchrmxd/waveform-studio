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
  binStart: number;
  binEnd: number;
  count: number;
  boost: number;
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
  private outWaveform: Float32Array;
  private bandMappings: BandMapping[] = [];
  private lastTargetBands: number = 0;

  constructor(buffer: AudioBuffer, fftSize: number = 1024) {
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
    this.outWaveform = new Float32Array(targetBands);
    this.bandMappings = new Array(targetBands);

    const minFreq = 20; // 20 Hz
    const maxFreq = Math.min(20000, this.sampleRate / 2);
    const minMel = Math.log10(minFreq);
    const maxMel = Math.log10(maxFreq);

    for (let b = 0; b < targetBands; b++) {
      const fStart = Math.pow(10, minMel + (b / targetBands) * (maxMel - minMel));
      const fEnd = Math.pow(10, minMel + ((b + 1) / targetBands) * (maxMel - minMel));

      const binStart = Math.max(0, Math.floor((fStart / (this.sampleRate / 2)) * this.halfSize));
      const binEnd = Math.min(
        this.halfSize - 1,
        Math.max(binStart + 1, Math.ceil((fEnd / (this.sampleRate / 2)) * this.halfSize))
      );

      const freqHz = (fStart + fEnd) / 2;
      // Perceptual ISO loudness balance curve
      const boost = Math.min(3.6, Math.max(1.0, Math.pow(freqHz / 1000, 0.22) * 1.55));

      this.bandMappings[b] = {
        binStart,
        binEnd,
        count: Math.max(1, binEnd - binStart + 1),
        boost,
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
    // minDecibels = -100 dB, maxDecibels = -30 dB, dynamic range = 70 dB
    const invFFTSize2 = (1.0 / fftSize) * 2;
    for (let i = 0; i < this.halfSize; i++) {
      const r = this.realBuf[i];
      const im = this.imagBuf[i];
      const mag = Math.sqrt(r * r + im * im) * invFFTSize2;
      const db = 20 * Math.log10(Math.max(1e-5, mag));
      this.rawMagnitudes[i] = Math.max(0, Math.min(1.0, (db + 100) / 70));
    }

    // Logarithmic / Mel frequency distribution identically calibrated with preview
    const binCount = this.halfSize;
    for (let b = 0; b < targetBands; b++) {
      const frac = (b + 1) / targetBands;
      const bin = Math.min(binCount - 1, Math.max(1, Math.floor(Math.pow(frac, 1.85) * (binCount * 0.75))));

      const bPrev = Math.max(0, bin - 1);
      const bNext = Math.min(binCount - 1, bin + 1);
      const val = Math.max(this.rawMagnitudes[bin], (this.rawMagnitudes[bPrev] + this.rawMagnitudes[bNext]) * 0.5);

      // Equal-loudness tilt for musical balance (identically matching preview)
      const freqWeight = 1.0 + Math.sqrt(b / targetBands) * 0.55;
      dest[b] = val * 1.35 * freqWeight;
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

    // 1. Multi-Tap Temporal Lookaround Analysis for Liquid Smooth Ballistics
    const lookbehindSamples = Math.floor(this.sampleRate * 0.025); // 25ms lookbehind
    const sumSquares = this.computeRawBandsAtSample(startSample, targetBands, this.rawFrequencies);
    this.computeRawBandsAtSample(startSample - lookbehindSamples, targetBands, this.scratchFrequencies);

    // Eased temporal blend matching Web Audio AnalyserNode smoothingTimeConstant
    const smoothFactor = Math.max(0.1, Math.min(0.95, smoothing ?? 0.65));
    for (let b = 0; b < targetBands; b++) {
      const current = this.rawFrequencies[b];
      const prev = this.scratchFrequencies[b];
      // Fast attack when rising, smooth buoyant decay when falling
      const temporalEased = current >= prev
        ? prev + (current - prev) * (1 - smoothFactor * 0.25)
        : prev * smoothFactor + current * (1 - smoothFactor);
      this.scratchFrequencies[b] = temporalEased;
    }

    // 2. Spatial Gaussian 5-tap kernel smoothing across Frequency Bins
    for (let b = 0; b < targetBands; b++) {
      const v0 = this.scratchFrequencies[Math.max(0, b - 2)];
      const v1 = this.scratchFrequencies[Math.max(0, b - 1)];
      const v2 = this.scratchFrequencies[b];
      const v3 = this.scratchFrequencies[Math.min(targetBands - 1, b + 1)];
      const v4 = this.scratchFrequencies[Math.min(targetBands - 1, b + 2)];
      this.outFrequencies[b] = v0 * 0.06 + v1 * 0.24 + v2 * 0.40 + v3 * 0.24 + v4 * 0.06;
    }

    // 3. Dynamic Sensitivity & Analog Soft-Knee Saturation
    const sens = Math.max(0.05, sensitivity || 1.0);
    for (let b = 0; b < targetBands; b++) {
      let val = this.outFrequencies[b] * sens;

      // Soft-saturation curve: compresses peaks smoothly with hyperbolic tangent, avoiding flat ceiling truncations
      if (softKnee) {
        val = Math.tanh(val * 0.92) * 1.12;
      }

      this.outFrequencies[b] = Math.max(0.01, Math.min(1.0, val));
    }

    // Audio-reactive band energies
    const bassBands = Math.floor(targetBands * 0.16);
    const midBands = Math.floor(targetBands * 0.6);

    let bassSum = 0;
    for (let i = 0; i < bassBands; i++) bassSum += this.outFrequencies[i];
    const bassEnergy = bassBands > 0 ? Math.min(1, (bassSum / bassBands) * 1.5) : 0;

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
      bassEnergy,
      midEnergy,
      highEnergy,
      overallRms,
    };
  }
}
